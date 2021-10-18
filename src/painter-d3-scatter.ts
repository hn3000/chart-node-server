import * as d3 from 'd3';
import { IChartBody, IChartSpec, IScatterChartBody } from './api';
import * as c from 'canvas';
import { LegendStyle, createLegend, nullShape, createTextShape, IShape } from './canvas-legend';
import { IUnitFactors, dimension, dimensionProxy } from './dimension';
import { box, IBox } from './position';
import { valueGetter } from './util';

require('@hn3000/canvas-5-polyfill');

export function renderScatter(req, canvas: c.Canvas, env0: IUnitFactors) {
  const context = canvas.getContext("2d");

  const body: IScatterChartBody = req.body;
  const meta = body.meta;
  const chart = body.chart;

  const dimDefaults = {
    padX: '2vmin',
    //padY: '1vmin', // commented: let's use padX as default
    labelFontSize: '2.5vmin',
    titleFontSize: '3vmin',
    tickLength: '1.5vmin',
    lineWidth: '2px',
    axis: {
      labelFontSize: undefined, // ie. use labelFontSIze
      titleFontSize: undefined,
    },
    mainAxis: {
      labelFontSize: undefined, // ie. use labelFontSIze
      titleFontSize: undefined,
    },
    valueAxis: {
      labelFontSize: undefined, // ie. use labelFontSIze
      titleFontSize: undefined,
    },
    xAxis: {
      labelFontSize: undefined, // ie. use labelFontSIze
      titleFontSize: undefined,
    },
    yAxis: {
      labelFontSize: undefined, // ie. use labelFontSIze
      titleFontSize: undefined,
    }
  };
  const dimensions = dimensionProxy(chart, dimDefaults, () => env0);
  const {
    padX,
    padY = padX,
    labelFontSize,
    shapeSize = labelFontSize,
    legendFontSize = labelFontSize,
    lineWidth,
    tickLength,
  } = dimensions;
  const { 
    labelFontFamily = 'Helvetica,"sans-serif"',
    labelFontWeight = 400,
    axis: {
      nice: niceAxis = true,
      labelFontFamily: labelFontFamilyAxis = labelFontFamily,
      labelFontWeight: labelFontWeightAxis = labelFontWeight,
      titleFontFamily: titleFontFamilyAxis = labelFontFamily,
      titleFontWeight: titleFontWeightAxis = labelFontWeight,
    },
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
    legendAlignment = 'left',
    showLegend,
    legendItemPerRow = false
  } = { axis: {}, ...chart };

  const axisDimensions = dimensionProxy(
    chart.axis || { }, 
    { labelFontSize, titleFontSize: labelFontSize }, 
    () => env0
  );
  const {
    labelFontSize: labelFontSizeAxis = labelFontSize,
    titleFontSize: titleFontSizeAxis = labelFontSize,
  } = axisDimensions;

  const {
    position: xAxisPosition = 'bottom',
    nice: niceX = niceAxis,
    tickCount: tickCountX = 6,
    labelPrecision: xLabelPrecision = labelPrecision,
    labelStyle: xLabelStyle = labelStyle,
    labelCurrency: xLabelCurrency = labelCurrency,
    labelFontFamily: labelFontFamilyXAxis = labelFontFamilyAxis,
    labelFontWeight: labelFontWeightXAxis = labelFontWeightAxis,
    titleFontFamily: titleFontFamilyXAxis = titleFontFamilyAxis,
    titleFontWeight: titleFontWeightXAxis = titleFontWeightAxis,
    title: titleXAxis = '',
  } = chart.xAxis || chart.mainAxis || { };

  const xAxisDimensions = dimensionProxy(
    chart.xAxis || chart.mainAxis || { }, 
    { labelFontSize: labelFontSizeAxis, titleFontSize: titleFontSizeAxis },
    () => env0
  );
  const {
    labelFontSize: labelFontSizeXAxis = labelFontSizeAxis,
    titleFontSize: titleFontSizeXAxis = titleFontSizeAxis,
  } = xAxisDimensions;

  const {
    position: yAxisPosition = 'left',
    nice: niceY = niceAxis,
    tickCount: tickCountY = 4,
    labelPrecision: yLabelPrecision = labelPrecision,
    labelStyle: yLabelStyle = labelStyle,
    labelCurrency: yLabelCurrency = labelCurrency,
    labelFontFamily: labelFontFamilyYAxis = labelFontFamilyAxis,
    labelFontWeight: labelFontWeightYAxis = labelFontWeightAxis,
    titleFontFamily: titleFontFamilyYAxis = titleFontFamilyAxis,
    titleFontWeight: titleFontWeightYAxis = titleFontWeightAxis,
    title: titleYAxis = '',
  } = chart.yAxis || chart.valueAxis || { };

  const yAxisDimensions = dimensionProxy(
    chart.yAxis || chart.valueAxis || { }, 
    { labelFontSize: labelFontSizeAxis, titleFontSize: titleFontSizeAxis },
    () => env0
  );
  const {
    labelFontSize: labelFontSizeYAxis = labelFontSizeAxis,
    titleFontSize: titleFontSizeYAxis = titleFontSizeAxis,
  } = yAxisDimensions;

  /*
  console.log({titleFontSizeAxis, titleFontSizeXAxis, titleFontSizeYAxis});
  */

  const getXValue = valueGetter('xValue', meta);
  const getYValue = valueGetter('yValue', meta);

  const shapeSizePX = shapeSize.value(); 
  const paths = shapes.map(x => new Path2D(x));
  //console.log(`paths:`, paths);
  const marker = (i) => paths[i % paths.length];

  const drawMarkerPx = (context, w,h, i) => {
    try{
      context.save();
      //console.log(`drawMarkerPx: ${JSON.stringify({w,h,i})}`);
      context.scale(w/32, h/32);
      context.fill(marker(i))
      context.stroke(marker(i))
      context.restore();
    }
    catch (ex) {
      console.warn(`exception in drawMarkerPx(${JSON.stringify({w,h,i})})`, ex);
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
  const labelFont = `${labelFontSize.value()}px ${labelFontFamily}`;
  const legendFont = `${legendFontSize.value()}px ${labelFontFamily}`;
  const axisXTitleFont = `${titleFontWeightAxis} ${titleFontSizeXAxis.value()}px ${labelFontFamily}`;
  const axisYTitleFont = `${titleFontWeightAxis} ${titleFontSizeYAxis.value()}px ${labelFontFamily}`;

  const extraX = (maxX - minX) * extra;
  const extraY = (maxY - minY) * extra;

  const valueScaleXU = d3.scaleLinear().domain([-extraX + minX, maxX + extraX]);
  const valueScaleYU = d3.scaleLinear().domain([-extraY + minY, maxY + extraY]);

  if (niceX) {
    valueScaleXU.nice(tickCountX);
  }
  if (niceY) {
    valueScaleYU.nice(tickCountY);
  }

  const valueScaleXTicks = valueScaleXU.ticks(tickCountX);
  const valueScaleYTicks = valueScaleYU.ticks(tickCountY);

  // set up label font

  context.font = labelFont;
  context.textBaseline = "top";

  let valueFormatX = new Intl.NumberFormat(locale, { 
    maximumFractionDigits: xLabelPrecision, 
    minimumFractionDigits: 0,
    style: xLabelStyle,
    currency: xLabelCurrency
  });
  let valueFormatY = new Intl.NumberFormat(locale, { 
    maximumFractionDigits: yLabelPrecision, 
    minimumFractionDigits: 0,
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

  const measureTitle = (text, font) => {
    if (null == text || text.trim() === '') {
      return 0;
    }
    context.save();
    context.font = font;
    let tm = context.measureText(text);
    context.restore();
    return Math.max(tm.actualBoundingBoxDescent, 0);
  };

  const xAxisTitleHeight = 2 * measureTitle(titleXAxis, axisXTitleFont);
  const yAxisTitleHeight = 2 * measureTitle(titleYAxis, axisYTitleFont); // rotated by 90 degrees, this becomes the width of the box

  /*
  console.log(({
    titleXAxis, xAxisTitleHeight,
    titleYAxis, yAxisTitleHeight,
    axisTitleFont,
  }));
  */

  context.font = labelFont;

  let valueAxisXHeight = valueScaleXLabelHeight+tickLength.value()*2;
  let valueAxisYWidth = valueScaleYLabelWidth+tickLength.value()*2;
  let xLabelBox: IBox;
  let xTitleBox: IBox;
  let yLabelBox: IBox;
  let yTitleBox: IBox;
  let plotBox: IBox;
  let legendBox: IBox;
  let paintBox: IBox;

  let insideBox = chartBox.insideBox(padX, padY);

  const yAxisWidth = yAxisTitleHeight + valueAxisYWidth;

  const { textColor = '#000' } = chart.axis || {};
  const legendWidth = Math.abs(insideBox.width() - yAxisWidth);

  context.save();
  context.font = legendFont;
  const legend = showLegend
               ? createLegend(canvas, data, LegendStyle.SHAPE, legendWidth, textColor, legendAlignment, legendPosition, legendItemPerRow)
               : { ...nullShape(), lineHeight: 0 };

  context.restore();

  if (legendPosition == 'top') {
    legendBox = box(insideBox.topLeft().rightBy(yAxisWidth), insideBox.topRight().belowBy(legend.height));
    paintBox = box(insideBox.bottomLeft(), legendBox.bottomRight()).resolve(env0);
  } else {
    legendBox = box(insideBox.bottomLeft().rightBy(yAxisWidth), insideBox.bottomRight().aboveBy(legend.height));
    paintBox = box(insideBox.topLeft(), legendBox.topRight()).resolve(env0);
  }


  // yAxis title is rotated 90°, height becomes width
  yTitleBox = box(paintBox.topLeft(), paintBox.bottomLeft().rightBy(yAxisTitleHeight)).resolve(env0);
  const yTitleShape = createTextShape(canvas, yTitleBox.center(), titleYAxis, axisYTitleFont, 'middle', 'center', -90);
  let xTitleShape: IShape;
  
  if (xAxisPosition === 'top') {
    let cornerPos = paintBox.topLeft().rightBy(yAxisWidth).belowBy(xAxisTitleHeight+valueAxisXHeight);
    xTitleBox = box(paintBox.topLeft(), paintBox.topRight().belowBy(xAxisTitleHeight)).resolve(env0);
    xTitleShape = createTextShape(canvas, xTitleBox.center(), titleXAxis, axisXTitleFont, 'middle', 'center');
    xLabelBox = box(cornerPos, insideBox.topRight()).resolve(env0);
    yLabelBox = box(yTitleBox.bottomLeft(), cornerPos).resolve(env0);
    plotBox = box(paintBox.bottomLeft().rightBy(yAxisWidth), xLabelBox.bottomRight());
  } else { // xAxisPosition === 'bottom'
    let cornerPos = paintBox.bottomLeft().rightBy(yAxisWidth).aboveBy(xAxisTitleHeight+valueAxisXHeight);
    xTitleBox = box(paintBox.bottomLeft(), paintBox.bottomRight().aboveBy(xAxisTitleHeight)).resolve(env0);
    xTitleShape = createTextShape(canvas, xTitleBox.center(), titleXAxis, axisXTitleFont, 'middle', 'center');
    xLabelBox = box(cornerPos, insideBox.bottomRight()).resolve(env0);
    yLabelBox = box(yTitleBox.topLeft(), cornerPos).resolve(env0);
    plotBox = box(paintBox.topLeft().rightBy(yAxisWidth), xLabelBox.topRight());
  }

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

  xTitleShape.paint(canvas);
  yTitleShape.paint(canvas);

  /*
  console.log({
    mainAxisTicks,
    valueAxisTicks,
  });
  */

  if (legend.height) {
    context.save();
    context.translate(legendBox.left(), legendBox.top());
    context.font = legendFont;
    legend.paint(canvas);
    context.restore();
  }

  if (body.debug?.boxes) {
    const drawBox = (box, color, dashes = []) => {
      context.strokeStyle = color;
      context.setLineDash(dashes);
      context.strokeRect(box.left(), box.top(), box.width(), box.height());
    }
  
    drawBox(legendBox, '#44f');
    drawBox(xLabelBox, '#4f4');
    drawBox(yLabelBox, '#4f4');
    drawBox(xTitleBox, '#f44');
    drawBox(yTitleBox, '#f44');
    drawBox(paintBox, '#f4f');
    drawBox(plotBox, '#4ff', [10,5]);
    //drawBox(insideBox, '#555');
  }
}

