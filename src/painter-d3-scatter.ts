import * as d3 from 'd3';
import { IChartBody, IChartSpec } from './api';
import * as c from 'canvas';
import { LegendStyle, createLegend, nullShape } from './canvas-legend';
import { IUnitFactors, dimension, dimensionProxy } from './dimension';
import { box, IBox } from './position';
import { valueGetter } from './util';

require('@hn3000/canvas-5-polyfill');

export interface IScatterChartBody extends IChartBody {
  chart: IChartSpec & {     
    shapes?: string[]; // path2d shape, ~32x32 px^2, centered on 16,16

    extra?: number;
    shapeSize?: string|number;

    showLegend: boolean;
    legendPosition: 'top' | 'bottom';
  }
}

export function renderScatter(req, canvas: c.Canvas, env0: IUnitFactors) {
  const context = canvas.getContext("2d");

  const body: IScatterChartBody = req.body;
  const meta = body.meta;
  const chart = body.chart;

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
    shapeSize = labelFontSize,
    lineWidth,
    tickLength
  } = dimensions;
  const { 
    labelFontFamily = 'Helvetica,"sans-serif"',
    colors = [ 'red', 'green', 'blue' ],
    shapes = [ 
      'M16,0 32,26 0,26z', 
      'M16,0 32,16 16,32 0,16z', 
      'M0,16 14,14 16,0 18,14, 32,16 18,18 16,32 14,18z' 
    ],
    labelPrecision = 2,
    labelStyle = 'decimal',
    labelCurrency = 'EUR',
    locale='de-DE',
    extra = 0.05,
    legendPosition = 'bottom',
    showLegend
  } = chart;

  const {
    position: xAxisPosition = 'bottom',
    labelPrecision: xLabelPrecision = labelPrecision,
    labelStyle: xLabelStyle = labelStyle,
    labelCurrency: xLabelCurrency = labelCurrency,
  } = chart.xAxis || chart.mainAxis || { };

  const {
    position: valueAxisPosition = 'left',
    labelPrecision: yLabelPrecision = labelPrecision,
    labelStyle: yLabelStyle = labelStyle,
    labelCurrency: yLabelCurrency = labelCurrency,
  } = chart.yAxis || chart.valueAxis || { };


  const getXValue = valueGetter('xValue', meta);
  const getYValue = valueGetter('yValue', meta);

  const shapeSizePX = shapeSize.value(); 
  const paths = shapes.map(x => new Path2D(x));
  //console.log(`paths:`, paths);
  const marker = (i) => paths[i % paths.length];

  const drawMarkerPx = (context, w,h, i) => {
    try{
      context.save();
      console.log(`drawMarkerPx: ${JSON.stringify({w,h,i})}`);
      context.scale(w/32, h/32);
      context.fill(marker(i))
      context.stroke(marker(i))
      context.restore();
    }
    catch (ex) {
      console.log(`exception in drawMarkerPx(${JSON.stringify({w,h,i})})`, ex);
    }
  };


  const data = req.body.data.map((d,i) => ({
    ...d, 
    xValue: getXValue(d), 
    yValue: getYValue(d),
    drawShape: (ctx, w,h) => drawMarkerPx(ctx, w,h, i),
    shape: marker(i),
    c: colors[i], // fill color
    s: '#666'     // stroke color
  }));

  const { minX, maxX, minY, maxY } = data.reduce((result, thisOne) => {
    const xv = getXValue(thisOne);
    result.minX = Math.min(xv, result.minX);
    result.maxX = Math.max(xv, result.maxX);
    const yv = getYValue(thisOne);
    result.minY = Math.min(yv, result.minY);
    result.maxY = Math.max(yv, result.maxY);
    return result;
  }, { 
    minX: Number.MAX_VALUE, 
    maxX: Number.MIN_VALUE,
    minY: Number.MAX_VALUE, 
    maxY: Number.MIN_VALUE
  });

  /*console.log({ minX, maxX, minY, maxY });*/



  const chartBox = box(0,0, canvas.width, canvas.height).insideBox(padX, padY).resolve(env0);
  const labelFont = `${labelFontSize.value()}px ${labelFontFamily}`

  const extraX = (maxX - minX) * extra;
  const extraY = (maxY - minY) * extra;

  const valueScaleXU = d3.scaleLinear().domain([-extraX + minX, maxX + extraX]);
  const valueScaleYU = d3.scaleLinear().domain([-extraY + minY, maxY + extraY]);

  const valueScaleXTicks = valueScaleXU.ticks(6);
  const valueScaleYTicks = valueScaleYU.ticks(4);

  // set up label font

  context.font = labelFont;
  context.textBaseline = "top";

  let valueFormatX = new Intl.NumberFormat(locale, { 
    maximumFractionDigits: xLabelPrecision, 
    minimumFractionDigits: xLabelPrecision,
    style: xLabelStyle,
    currency: xLabelCurrency
  });
  let valueFormatY = new Intl.NumberFormat(locale, { 
    maximumFractionDigits: yLabelPrecision, 
    minimumFractionDigits: yLabelPrecision,
    style: yLabelStyle,
    currency: yLabelCurrency
  });

  const valueScaleXLabelHeight = valueScaleXTicks.reduce((r,value) => {
    let label = valueFormatX.format(value);
    let tm = context.measureText(label);
    return Math.max(tm.actualBoundingBoxDescent, r);
  }, 0);

  const valueScaleYLabelWidth = valueScaleYTicks.reduce((r,value) => {
    let label = valueFormatY.format(value);
    let tm = context.measureText(label);
    return Math.max(tm.width, r);
  }, 0);

  let valueAxisXHeight = valueScaleXLabelHeight+tickLength.value()*2;
  let valueAxisYWidth = valueScaleYLabelWidth+tickLength.value()*2;
  let xLabelBox: IBox;
  let yLabelBox: IBox;
  let plotBox: IBox;
  let legendBox: IBox;

  let insideBox = chartBox.insideBox(padX, padY);

  const { textColor = '#000' } = chart.axis || {};
  const legendWidth = Math.abs(insideBox.width());
  const legend = showLegend
               ? createLegend(canvas, data, LegendStyle.SHAPE, legendWidth, textColor)
               : nullShape();

  let paintBox: IBox;
  if (xAxisPosition === 'top') {
    let cornerPos = chartBox.topLeft().rightBy(valueAxisYWidth).belowBy(valueAxisXHeight);
    xLabelBox = box(cornerPos, chartBox.topRight()).resolve(env0);
    yLabelBox = box(chartBox.bottomLeft(), cornerPos).resolve(env0);
    paintBox = box(cornerPos, insideBox.bottomRight()).resolve(env0);
  } else { // xAxisPosition === 'bottom'
    let cornerPos = chartBox.bottomLeft().rightBy(valueAxisYWidth).aboveBy(valueAxisXHeight);
    xLabelBox = box(cornerPos, chartBox.bottomRight()).resolve(env0);
    yLabelBox = box(chartBox.topLeft(), cornerPos).resolve(env0);
    paintBox = box(cornerPos, insideBox.topRight()).resolve(env0);
  }

  
  if (legendPosition == 'bottom') {
    legendBox = box(paintBox.bottomLeft(), paintBox.bottomRight().aboveBy(legend.height));
    plotBox = box(legendBox.topLeft().aboveBy(padY), paintBox.topRight());
  } else {
    legendBox = box(paintBox.topLeft(), paintBox.topRight().belowBy(legend.height));
    plotBox = box(legendBox.bottomLeft().belowBy(padY), paintBox.bottomRight());
  }

  /*
  context.strokeStyle = '#f4f';
  context.strokeRect(plotBox.left(), plotBox.top(), plotBox.width(), plotBox.height());

  context.strokeStyle = '#44f';
  context.strokeRect(insideBox.left(), insideBox.top(), insideBox.width(), insideBox.height());
  */

  const vhRange = [ plotBox.bottom(), plotBox.top() ];
  const vwRange = [ plotBox.left(), plotBox.right() ];
  /*
  console.log({
    vhRange,
    vwRange
  });
  */

  const valueScaleX = valueScaleXU.range(vwRange);
  const valueScaleY = valueScaleYU.range(vhRange);

  const axisLine = d3.line().context(context)
                  .x(d => d[0])
                  .y(d => d[1]);

  context.beginPath();
  context.lineWidth = lineWidth.value();
  context.lineCap = chart.lineCap || 'round';
  context.lineJoin = chart.lineJoin || 'round';
  context.miterLimit = null != chart.miterLimit ? chart.miterLimit : 4;
  context.strokeStyle = chart.stroke;

  const drawMarker = (x,y, i) => {
    context.save();
    context.translate(valueScaleX(x),valueScaleY(y));
    context.translate(-shapeSizePX/2, -shapeSizePX/2);
    context.fillStyle = colors[i % colors.length];
    context.strokeStyle = '#666';
    drawMarkerPx(context, shapeSizePX,shapeSizePX, i);
    context.restore();
  }

  (data as any[]).forEach(
    (d,i) => drawMarker(getXValue(d), getYValue(d), i)
  );

  const mainAxisTicks = valueScaleXTicks.map(valueScaleX);
  
  context.beginPath();
  const axisTickDir = xAxisPosition === 'top' ? -1 : 1;
  const axisLineY = xAxisPosition === 'top' ? plotBox.top() : plotBox.bottom();
  const axisLineTick = axisLineY + axisTickDir * tickLength.value();
  axisLine([[plotBox.left(),axisLineY],[plotBox.right(),axisLineY]]);
  mainAxisTicks.forEach(x => {
    axisLine([[x,axisLineY],[x,axisLineTick]])
  });
  context.strokeStyle = chart?.axis?.stroke || '#345';
  context.lineWidth = dimension(chart?.axis?.lineWidth || 1).resolve(env0).value();
  context.stroke();

  context.beginPath();
  context.fillStyle = chart?.axis?.textColor || '#111';
  context.textBaseline = xAxisPosition === 'top' ? 'bottom' : 'top';
  context.textAlign = "center";
  mainAxisTicks.forEach((x,i) => {
    const v = valueScaleXTicks[i];
    const label = valueFormatX.format(v);
    context.fillText(label, x, axisLineY + axisTickDir * tickLength.value() * 2);
  });

  const valueAxisTicks = valueScaleYTicks.map(valueScaleY);
  context.beginPath();
  valueAxisTicks.forEach((y,i) => {
    axisLine([[yLabelBox.right()-tickLength.value(),y],[plotBox.right(), y]])
  });
  context.strokeStyle = chart?.axis?.stroke || '#345';
  context.lineWidth = dimension(chart?.axis?.lineWidth || 1).resolve(env0).value();
  context.stroke();

  context.beginPath();
  context.fillStyle = chart?.axis?.textColor || '#111';
  context.font = labelFont;
  context.textBaseline = 'middle';
  context.textAlign = 'right';
  valueAxisTicks.forEach((y,i) => {
    const label = valueFormatY.format(valueScaleYTicks[i]);

    context.fillText(label, yLabelBox.right()-2*tickLength.value(), y);
  });

  /*
  console.log({
    mainAxisTicks,
    valueAxisTicks,
  });
  */

  if (legend.height) {
    if (legendPosition === 'top') {
      context.translate(insideBox.left(), insideBox.top());
    } else {
      context.translate(insideBox.left(), insideBox.bottom()-legend.height);
    }
    legend.paint(canvas);
  }

}

