import * as d3 from 'd3';
import { IPieBody, IChartBody, IData } from './api';
import { PieArcDatum } from 'd3';
import * as c from 'canvas';
import { LegendStyle, createLegend, nullShape } from './canvas-legend';
import { IUnitFactors, dimension, dimensionProxy } from './dimension';
import { box, IBox } from './position';

export function renderPie(req, canvas: c.Canvas, env0: IUnitFactors) {
  const context = canvas.getContext("2d");

  const defaultColors = ["#579", "#597", "#759", "#795", "#975", "#957"];

  const body: IPieBody = req.body;
  const { colors=defaultColors } = body.chart;
  const meta = body.meta;

  const value   = meta.value  ? (x:any) => x[meta.value]  : x => x["value"];
  const label   = meta.label  ? (x:any) => x[meta.label]  : x => x["value"];
  const legend  = meta.legend ? (x:any) => x[meta.legend] : x => x["legend"];
  const color   = meta.color  ? (x:any) => x[meta.color]  : x => x["color"];

  const data: IData[] = body.data.map((v, i) => ({
    vl: label(v) || `Label ${i}`,
    l: legend(v) || `Legend ${i}`,
    v: value(v),
    c: color(v) || colors[i % colors.length]
  }));

  const defaultDimensions = { 
    labelFontSize: '5vmin',
    legendFontSize: '4vmin',
    padX: '1vmin',
    padY: '1vmin',
    innerRadius: '25vmin',
    outerRadius: '33vmin',
    cornerRadius: 0,
    lineWidth: 0
  };


  const dimensions = dimensionProxy(req.body.chart, defaultDimensions, () => env0);
  const { labelFontSize, legendFontSize, padY, padX } = dimensions;
  const {
    labelColor = '#000',
    showLegend = true,
    labelFontFamily = "sans-serif",
    legendFontFamily = labelFontFamily,
    labelFont = `${labelFontSize.value()}px ${labelFontFamily}`,
    legendFont = `${legendFontSize.value()}px ${legendFontFamily}`,
    legendPosition = 'bottom'
  } = req.body.chart;

  const env1 = { ...env0, em: labelFontSize.value()};

  const chartBox = box(0, 0, '100vw', '100vh').insideBox(padX, padY).resolve(env1);
  console.log(`chart box ${chartBox.left()} ${chartBox.top()} ${chartBox.right()} ${chartBox.bottom()}`);
  let pieBox = box(chartBox.topLeft(), chartBox.topRight().belowBy(chartBox.width())).resolve(env1);
  console.log(`pie box ${pieBox.left()} ${pieBox.top()} ${pieBox.right()} ${pieBox.bottom()}`);
  let legendShape = nullShape();
  if (showLegend) {
    context.font = labelFont;
    
    legendShape = createLegend(canvas, data, LegendStyle.BOX, chartBox.width(), labelColor);

    let legendBox: IBox;
    if ('top' == legendPosition) {
      legendBox = box(chartBox.topLeft(), chartBox.topRight().belowBy(legendShape.height)).resolve(env1);
      pieBox = box(legendBox.bottomLeft(), chartBox.bottomRight()).resolve(env1);
    } else {
      legendBox = box(pieBox.bottomLeft(), chartBox.bottomRight()).resolve(env1);
    }

    context.save();
    context.translate(legendBox.left(), legendBox.top());
    legendShape.paint(canvas);
    context.restore();
  }

  const {
    innerRadius,
    outerRadius,
    cornerRadius,
    lineWidth
  } = dimensions;
  const {
    stroke = "#fff",
    showCenter = false,
    showLabels = true,
    showLabelDebug = false,
    showDebug = false,
    padAngle = 0,
    startAngle = 0,
  } = req.body.chart;

  let makePie = d3
    .pie<IData>()
    .value(x => x.v)
    .padAngle(padAngle)
    .startAngle(startAngle);
  const pie = makePie(data);
  let drawArc = d3
    .arc<PieArcDatum<IData>>()
    .innerRadius(innerRadius.value())
    .outerRadius(outerRadius.value())
    .cornerRadius(cornerRadius.value())
    .context(context);
  let drawLine = d3.line().context(context);

  //console.log(pie);
  console.log('pos', pieBox.center().x(), pieBox.center().y());
  context.translate(pieBox.center().x(), pieBox.center().y());
  pie.forEach(x => {
    context.beginPath();
    drawArc(x);
    context.fillStyle = x.data.c;
    context.fill();

    if (lineWidth.value() > 0) {
      context.lineWidth = lineWidth.value();
      context.strokeStyle = stroke;
      context.stroke();
    }

    if (showLabels) {
      context.beginPath();

      let centroid = drawArc.centroid(x);
      let len = Math.sqrt(centroid.reduce((r, x) => r + x * x, 0));
      let labelPos = centroid.map(t => (t / len) * outerRadius.value() * 1.1) as [number, number];
      if (showLabelDebug) {
        context.moveTo(...centroid);
        context.lineTo(...labelPos);
        context.strokeStyle = "#444";
        context.lineWidth = 2;
        context.stroke();
      }

      labelPos = centroid.map(t => (t / len) * outerRadius.value() * 1.2) as [number, number];
      context.font = labelFont;
      let labelTxt = x.data.vl || `${x.value.toFixed(1)}`;

      context.save();
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = labelColor;
      context.fillText(labelTxt, ...labelPos);
      context.restore();
      /*
       */
    }
  });

  if (showCenter) {
    context.beginPath();
    drawLine([[-20, 0], [20, 0]]);
    drawLine([[0, -20], [0, 20]]);
    context.strokeStyle = "#000";
    context.lineWidth = 3;
    context.stroke();
  }

  if (showDebug) {
    let codeBox = box(chartBox.topRight().leftBy(150), chartBox.bottomRight());
    context.resetTransform();
    context.translate(codeBox.left(), codeBox.top());
    context.fillStyle = "#ddd";
    context.fillRect(0, 0, codeBox.width(), codeBox.height());
    context.font = '11px Helvetica,"sans-serif"';
    context.fillStyle = "#000";

    const text = JSON.stringify(data, null, 2);
    codeBox = codeBox.insideBox(10);
    context.fillText(text, codeBox.left(), codeBox.top(), codeBox.width());
  }
}

export interface ITimeLineBody extends IChartBody {

}

export function renderTimeline(req, canvas: c.Canvas) {
  const context = canvas.getContext("2d");
  const vh = canvas.height;
  const vw = canvas.width;
  const vMin = Math.min(vh, vw);
  const vMax = Math.max(vh, vw);

  const body: ITimeLineBody = req.body;
  const meta = body.meta;
  const chart = body.chart;
  const getTimestamp = meta.timestamp ? x => x[meta.timestamp] : x => x["date"];
  const getValue = meta.value ? x => x[meta.value] : x => x["value"];

  const data = req.body.data;

  const { minTime, maxTime, minVal, maxVal } = data.reduce((r,x) => {
    const t = getTimestamp(x);
    r.minTime = Math.min(t, r.minTime);
    r.maxTime = Math.max(t, r.maxTime);
    const v = getValue(x);
    r.minVal = Math.min(v, r.minVal);
    r.maxVal = Math.max(v, r.maxVal);
    return r;
  }, { 
    minTime: Number.MAX_VALUE, 
    maxTime: Number.MIN_VALUE,
    minVal: Number.MAX_VALUE, 
    maxVal: Number.MIN_VALUE
  });

  const b = Math.floor(0.1*vMin);
  const vwRange = [2*b,Math.ceil(vw-b)];
  const vhRange = [Math.ceil(vh-2*b), b];
 
  const timeScale = d3.scaleTime()
                      .domain([minTime, maxTime])
                      .range(vwRange);

  const valueScale = d3.scaleLinear()
                      .domain([minVal, maxVal])
                      .range(vhRange);

  const linePainter = d3.line().context(context);
  const line = linePainter
                 .curve(d3.curveLinear)
                 .x(d => timeScale(getTimestamp(d)))
                 .y(d => valueScale(getValue(d)));

  const axisLine = d3.line().context(context)
                  .x(d => d[0])
                  .y(d => d[1]);

  context.beginPath();
  line(data);
  context.strokeStyle = chart.stroke;
  context.lineWidth = chart.lineWidth;
  context.stroke();

  const timeScaleTicks = timeScale.ticks(5);
  const timeAxisTicks = timeScaleTicks.map(timeScale);
  
  context.beginPath();
  axisLine([[2*b,vhRange[0]],[vw-b,vhRange[0]]]);
  timeAxisTicks.forEach(x => {
    axisLine([[x,vh-2*b+5],[x,vh-2*b]])
  });
  context.strokeStyle = chart.axis.stroke;
  context.lineWidth = chart.axis.lineWidth;
  context.stroke();

  const months = chart.months || 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec'.split(',');

  context.beginPath();
  context.fillStyle = chart.axis.textColor;
  context.font = '13px Helvetica,"sans-serif"';
  context.textBaseline = "top";
  context.textAlign = "center";
  timeAxisTicks.forEach((x,i) => {
    const d = timeScaleTicks[i];
    const label = `${months[d.getMonth()]} ${d.getFullYear() % 100}`;
    context.fillText(label, x, vh-2*b+15);
  });

  const valueScaleTicks = valueScale.ticks(3);
  const valueAxisTicks = valueScaleTicks.map(valueScale);
  context.beginPath();
  valueAxisTicks.forEach((y,i) => {
    axisLine([[2*b,y],[vw-b, y]])
  });
  context.strokeStyle = chart.axis.stroke;
  context.lineWidth = chart.axis.lineWidth;
  context.stroke();

  context.beginPath();
  context.fillStyle = chart.axis.textColor;
  context.font = '13px Helvetica,"sans-serif"';
  context.textBaseline = "middle";
  context.textAlign = "right";
  valueAxisTicks.forEach((y,i) => {
    const label = valueScaleTicks[i].toFixed(0);

    context.fillText(label, 2*b-5, y)
  });

  const legendData = [{ l: 'Portfolio', c: chart.stroke, v:null, vl: null }];
  const legendWidth = Math.abs(vwRange[1] - vwRange[0]);
  const legend = req.body.chart.showLegend 
               ? createLegend(canvas, legendData, LegendStyle.LINE, legendWidth, '#000')
               : nullShape();

  if (legend.height) {
    legend.paint(canvas);
  }

}

