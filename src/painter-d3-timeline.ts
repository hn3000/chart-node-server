import * as d3 from 'd3';
import { IChartBody, IChartSpec } from './api';
import * as c from 'canvas';
import { LegendStyle, createLegend, nullShape } from './canvas-legend';
import { IUnitFactors, dimension, dimensionProxy } from './dimension';
import * as TimeIntervals from './custom-time-intervals';
import { box, IBox } from './position';
import { valueGetter } from './util';
 
export interface ITimeLineBody extends IChartBody {
  chart: IChartSpec & { 
    seriesLabel: string;
 }
}

export function renderTimeline(req, canvas: c.Canvas, env0: IUnitFactors) {
  const context = canvas.getContext("2d");

  const body: ITimeLineBody = req.body;
  const meta = body.meta;
  const chart = body.chart;
  const getTimestamp = valueGetter('timestamp', meta);
  const getValue = valueGetter("value", meta);

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
    lineWidth: '2px',
  };
  const dimensions = dimensionProxy(chart, dimDefaults, () => env0);
  const {
    padX,
    padY = padX,
    labelFontSize,
    lineWidth,
    tickLength,
  } = dimensions;
  const { 
    labelFontFamily = 'Helvetica,"sans-serif"',
    months = 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec'.split(','),
    labelPrecision = 2,
    labelStyle = 'decimal',
    labelCurrency = 'EUR',
    locale='de-DE',
    seriesLabel = '',
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

  const valueTicks = chart.valueAxis?.tickCount || 3;
  const timeTicks = chart.mainAxis?.tickCount || 5;
  
  const tickInterval = chart.mainAxis?.tickInterval;

  const dateLabel = (d: Date) => {
    return `${months[d.getMonth()]} ${d.getFullYear() % 100}`;
  };

  const chartBox = box(0,0, canvas.width, canvas.height).insideBox(padX, padY).resolve(env0);
  const labelFont = `${labelFontSize.value()}px ${labelFontFamily}`
 
  const valueScaleU = d3.scaleLinear().domain([minVal, maxVal]);
  const timeScaleU = d3.scaleTime().domain([minTime, maxTime])

  let timeScaleTicks: Array<Date>;
  if (tickInterval) {
    timeScaleTicks = timeScaleU.ticks(TimeIntervals.Intervals[tickInterval]);
  } else {
    timeScaleTicks = timeScaleU.ticks(timeTicks);
  }

  const valueScaleTicks = valueScaleU.ticks(valueTicks);

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
  context.lineWidth = lineWidth.value();
  context.lineCap = chart.lineCap || 'round';
  context.lineJoin = chart.lineJoin || 'round';
  context.miterLimit = null != chart.miterLimit ? chart.miterLimit : 4;
  context.strokeStyle = chart.stroke;
  line(data);
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
  if (chart.axis) {
    if (chart.axis.stroke) {
      context.strokeStyle = chart.axis?.stroke;
    }
    if (chart.axis.lineWidth) {
      context.lineWidth = dimension(chart.axis.lineWidth).resolve(env0).value();
    }
  }
  context.stroke();

  context.beginPath();
  if (chart.axis) {
    if (chart.axis.stroke) {
      context.fillStyle = chart.axis.textColor;
    }
  }
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

  context.strokeStyle = chart?.axis?.stroke || '#345';
  context.lineWidth = chart?.axis?.lineWidth || 1;
  context.stroke();

  context.beginPath();
  context.fillStyle = chart?.axis?.textColor || '#111';
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