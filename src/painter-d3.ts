import * as d3 from 'd3';
import { IPieBody, IChartBody, IData, IChartSpec } from './api';
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
    lineWidth: 0,
    startAngle: 0,
    padAngle: 0
  };


  const dimensions = dimensionProxy(req.body.chart, defaultDimensions, () => env0);
  const { labelFontSize, legendFontSize, padX, padY } = dimensions;
  const {
    labelColor = '#000',
    showLegend = true,
    labelFontFamily = "sans-serif",
    legendFontFamily = labelFontFamily,
    labelFont = `${labelFontSize.value()}px ${labelFontFamily}`,
    legendFont = `${legendFontSize.value()}px ${legendFontFamily}`,
    legendPosition = 'bottom',
    showDebug = false,
  } = req.body.chart;

  const env1: IUnitFactors = { ...env0, em: labelFontSize.value()};

  const chartBox = box(0, 0, canvas.width, canvas.height).insideBox(padX, padY).resolve(env1);
  console.log(`chart box ${chartBox.left()} ${chartBox.top()} ${chartBox.right()} ${chartBox.bottom()}`);
  let pieBox = box(chartBox.topLeft(), chartBox.topRight().belowBy(chartBox.width())).resolve(env1);
  console.log(`pie box ${pieBox.left()} ${pieBox.top()} ${pieBox.right()} ${pieBox.bottom()}`);
  let legendShape = nullShape();
  if (showLegend) {
    context.font = legendFont;
    
    legendShape = createLegend(canvas, data, LegendStyle.BOX, chartBox.width(), labelColor);

    let legendBox: IBox;
    if ('top' == legendPosition) {
      legendBox = box(chartBox.topLeft(), chartBox.topRight().belowBy(legendShape.height)).resolve(env1);
      pieBox = box(legendBox.bottomLeft(), chartBox.bottomRight()).resolve(env1);
    } else {
      let pieHeight = Math.min(chartBox.width(), chartBox.height() - legendShape.height);
      pieBox = box(chartBox.topLeft(), chartBox.topRight().belowBy(pieHeight)).resolve(env1);
      legendBox = box(pieBox.bottomLeft(), chartBox.bottomRight()).resolve(env1);
    }

    context.save();
    context.translate(legendBox.left(), legendBox.top());
    legendShape.paint(canvas);
    if (showDebug) {
      context.strokeStyle = '#fff';
      context.strokeRect(0,0, legendBox.width(), legendBox.height());
    }
    context.restore();

    env1.vw = pieBox.width() / 100;
    env1.vh = pieBox.height() / 100;
    env1.vmin = Math.min(env1.vw, env1.vh);
  }

  const pieDimensions = dimensionProxy(req.body.chart, defaultDimensions, () => env1);

  const {
    innerRadius,
    outerRadius,
    cornerRadius,
    lineWidth,
    padAngle,
    startAngle,
  } = pieDimensions;

  const {
    stroke = "#fff",
    showCenter = false,
    showLabels = true,
    showLabelDebug = false,
  } = req.body.chart;

  let makePie = d3
    .pie<IData>()
    .value(x => x.v)
    .padAngle(padAngle.value())
    .startAngle(startAngle.value());
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

/*
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
*/
}

export interface ITimeLineBody extends IChartBody {
  chart: IChartSpec & { seriesLabel: string; }
}

export function renderTimeline(req, canvas: c.Canvas, env0: IUnitFactors) {
  const context = canvas.getContext("2d");

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

  const dimDefaults = {
    padX: '2vmin',
    //padY: '1vmin', // commented: let's use padX as default
    labelFontSize: '2.5vmin',
    tickLength: '1.5vmin',
    lineWidth: '2px'
  };
  const dimensions = dimensionProxy(chart, dimDefaults, () => env0);
  const {
    padX,
    padY = padX,
    labelFontSize,
    lineWidth,
    tickLength
  } = dimensions;
  const { 
    labelFontFamily = 'Helvetica,"sans-serif"',
    months = 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec'.split(','),
    labelPrecision = 2,
    labelStyle = 'decimal',
    labelCurrency = 'EUR',
    locale='de-DE',
    seriesLabel = ''
  } = chart;

  const {
    position: timeAxisPosition = 'bottom'
  } = chart.timeAxis || { };

  const {
    position: valueAxisPosition = 'left',
    labelPrecision: valueLabelPrecision = labelPrecision,
    labelStyle: valueLabelStyle = labelStyle,
    labelCurrency: valueLabelCurrency = labelCurrency,
  } = chart.valueAxis || { };

  const dateLabel = (d: Date) => {
    return `${months[d.getMonth()]} ${d.getFullYear() % 100}`;
  };

  const chartBox = box(0,0, canvas.width, canvas.height).insideBox(padX, padY).resolve(env0);
  const labelFont = `${labelFontSize.value()}px ${labelFontFamily}`
 
  const valueScaleU = d3.scaleLinear().domain([minVal, maxVal]);
  const timeScaleU = d3.scaleTime().domain([minTime, maxTime])

  const timeScaleTicks = timeScaleU.ticks(5);
  const valueScaleTicks = valueScaleU.ticks(3);

  // set up label font

  context.font = labelFont;
  context.textBaseline = "top";

  const timeScaleLabelHeight = timeScaleTicks.reduce((r,date) => {
    let label = dateLabel(date);
    let tm = context.measureText(label);
    return Math.max(tm.actualBoundingBoxDescent, r);
  }, 0);

  let valueFormat = new Intl.NumberFormat(locale, { 
    maximumFractionDigits: valueLabelPrecision, 
    minimumFractionDigits: valueLabelPrecision,
    style: valueLabelStyle,
    currency: valueLabelCurrency
  });

  const valueScaleLabelWidth = valueScaleTicks.reduce((r,value) => {
    let label = valueFormat.format(value);
    let tm = context.measureText(label);
    return Math.max(tm.width, r);
  }, 0);

  let timeAxisHeight = timeScaleLabelHeight+tickLength.value()*2;
  let valueAxisWidth = valueScaleLabelWidth+tickLength.value()*2;
  let xLabelBox: IBox;
  let yLabelBox: IBox;
  let plotBox: IBox;
  let legendPosition: string;
  if (timeAxisPosition === 'top') {
    let cornerPos = chartBox.topLeft().rightBy(valueAxisWidth).belowBy(timeAxisHeight);
    xLabelBox = box(cornerPos, chartBox.topRight()).resolve(env0);
    yLabelBox = box(chartBox.bottomLeft(), cornerPos).resolve(env0);
    plotBox = box(cornerPos, chartBox.bottomRight()).resolve(env0);
    legendPosition = 'bottom';
  } else { // timeAxisPosition === 'bottom'
    let cornerPos = chartBox.bottomLeft().rightBy(valueAxisWidth).aboveBy(timeAxisHeight);
    xLabelBox = box(cornerPos, chartBox.bottomRight()).resolve(env0);
    yLabelBox = box(chartBox.topLeft(), cornerPos).resolve(env0);
    plotBox = box(cornerPos, chartBox.topRight()).resolve(env0);
    legendPosition = 'top';
  }


  const vhRange = [ plotBox.bottom(), plotBox.top() ];
  const vwRange = [ plotBox.left(), plotBox.right() ];
  const valueScale = valueScaleU.range(vhRange);
  const timeScale = timeScaleU.range(vwRange);

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
  context.lineWidth = lineWidth.value();
  context.stroke();

  const timeAxisTicks = timeScaleTicks.map(timeScale);
  
  context.beginPath();
  const axisTickDir = timeAxisPosition === 'top' ? -1 : 1;
  const axisLineY = timeAxisPosition === 'top' ? plotBox.top() : plotBox.bottom();
  const axisLineTick = axisLineY + axisTickDir * tickLength.value();
  axisLine([[plotBox.left(),axisLineY],[plotBox.right(),axisLineY]]);
  timeAxisTicks.forEach(x => {
    axisLine([[x,axisLineY],[x,axisLineTick]])
  });
  context.strokeStyle = chart.axis.stroke;
  context.lineWidth = dimension(chart.axis.lineWidth).resolve(env0).value();
  context.stroke();

  context.beginPath();
  context.fillStyle = chart.axis.textColor;
  context.textBaseline = timeAxisPosition === 'top' ? 'bottom' : 'top';
  context.textAlign = "center";
  timeAxisTicks.forEach((x,i) => {
    const d = timeScaleTicks[i];
    const label = dateLabel(d);
    context.fillText(label, x, axisLineY + axisTickDir * tickLength.value() * 2);
  });

  const valueAxisTicks = valueScaleTicks.map(valueScale);
  context.beginPath();
  valueAxisTicks.forEach((y,i) => {
    axisLine([[yLabelBox.right()-tickLength.value(),y],[plotBox.right(), y]])
  });
  context.strokeStyle = chart.axis.stroke;
  context.lineWidth = chart.axis.lineWidth;
  context.stroke();

  context.beginPath();
  context.fillStyle = chart.axis.textColor;
  context.font = labelFont;
  context.textBaseline = 'middle';
  context.textAlign = 'right';
  valueAxisTicks.forEach((y,i) => {
    const label = valueFormat.format(valueScaleTicks[i]);

    context.fillText(label, yLabelBox.right()-2*tickLength.value(), y);
  });

  const { textColor = '#000' } = chart.axis || {};
  const legendData = [{ l: seriesLabel, c: chart.stroke, v:null, vl: null }];
  const legendWidth = Math.abs(plotBox.width());
  const legend = req.body.chart.showLegend && seriesLabel 
               ? createLegend(canvas, legendData, LegendStyle.LINE, legendWidth, textColor)
               : nullShape();

  if (legend.height) {
    if (legendPosition === 'top') {
      context.translate(plotBox.left(), plotBox.top());
    } else {
      context.translate(plotBox.left(), plotBox.bottom()-legend.height);
    }
    legend.paint(canvas);
  }

}

