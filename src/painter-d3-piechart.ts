import * as d3 from 'd3';
import { IPieBody, IChartBody, IData, IChartSpec } from './api';
import { PieArcDatum } from 'd3';
import * as c from 'canvas';
import { LegendStyle, createLegend, nullShape } from './canvas-legend';
import { IUnitFactors, dimension, dimensionProxy } from './dimension';
import { box, IBox } from './position';
import { valueGetter } from './util';

export function renderPie(req, canvas: c.Canvas, env0: IUnitFactors) {
  const context = canvas.getContext("2d");

  const defaultColors = ["#579", "#597", "#759", "#795", "#975", "#957"];

  const body: IPieBody = req.body;
  const { colors=defaultColors } = body.chart;
  const meta = body.meta;

  const value   = valueGetter("value", meta);
  const label   = valueGetter("label", meta);
  const legend  = valueGetter("legend", meta);
  const color   = valueGetter("color", meta);

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

