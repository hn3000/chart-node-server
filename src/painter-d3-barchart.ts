import { IBarBody } from "./api.js";
import { valueGetter } from "./util.js";
import { Box, box, IBox } from "./position.js";
import { IUnitFactors, dimension, dimensionProxy } from "./dimension.js";
import { createLegend, IShape, LegendStyle, nullShape } from "./canvas-legend.js";

import * as c from "canvas";
import * as d3 from "d3";

export function renderBar(body: IBarBody, canvas: c.Canvas, env0: IUnitFactors) {
  const context = canvas.getContext("2d");

  const meta = body.meta;
  const chart = body.chart;

  const value = valueGetter<number>("value", meta);
  const stroke = Array.isArray(chart.stroke) ? chart.stroke : [chart.stroke];
  const category = valueGetter<string>("category", meta);
  const label = valueGetter<string>("label", meta);

  const data: any[] = body.data;

  const {
    maxVal,
    categories,
    labels,
  } = data.reduce<{ maxVal; categories: string[]; labels: string[] }>(
    (r: { minVal; maxVal; categories: string[]; labels: string[] }, x: any) => {
      const v: number = value(x);
      const c: string = category(x);
      const l: string = label(x);
      r.minVal = Math.min(v, r.minVal);
      r.maxVal = Math.max(v, r.maxVal);

      if (!r.categories.includes(c)) {
        r.categories.push(c);
      }

      if (!r.labels.includes(l)) {
        r.labels.push(l);
      }

      return r;
    },
    {
      maxVal: Number.MIN_VALUE,
      categories: [],
      labels: [],
    }
  );

  const dimDefaults = {
    padX: "2vmin",
    //padY: '1vmin', // commented: let's use padX as default
    labelFontSize: "2.5vmin",
    tickLength: "1.5vmin",
    barWidth: 20,
    legendSize: "0",
    legendSample: 0.65,
  };
  const dimensions = dimensionProxy(chart, dimDefaults, () => env0);
  const {
    padX,
    padY = padX,
    labelFontSize,
    tickLength,
  } = dimensions;

  const {
    labelFontFamily = 'Helvetica,"sans-serif"',
    labelPrecision = 2,
    labelStyle = "decimal",
    labelCurrency = "EUR",
    locale = "de-DE",
    labelColor = "#000",
    showDebug = false,
    labelPadding: labelPadding = 0.4,
    labelOuterPadding: labelOuterPadding = 0.0,
    lastLabelExtraPaddingFactor = 0,
    categoryPadding: categoryPadding = 0.1,
  } = chart;

  const env1: IUnitFactors = { ...env0, em: labelFontSize.value() };

  const {
    labelPrecision: valueLabelPrecision = labelPrecision,
    labelStyle: valueLabelStyle = labelStyle,
    labelCurrency: valueLabelCurrency = labelCurrency,
  } = chart.valueAxis || {};

  const { textColor = labelColor } = chart.axis || {};

  const valueTicks = chart.valueAxis?.tickCount || 3;

  let valueFormat = new Intl.NumberFormat(locale, {
    maximumFractionDigits: valueLabelPrecision,
    minimumFractionDigits: valueLabelPrecision,
    style: valueLabelStyle,
    currency: valueLabelCurrency,
  } as any);

  const labelFont = `${labelFontSize.value()}px ${labelFontFamily}`;

  context.font = labelFont;
  context.textBaseline = "top";

  const valueScaleU = d3.scaleLinear().domain([0, maxVal]);
  const valueScaleTicks = valueScaleU.ticks(valueTicks);
  const valueScaleLabelWidth = valueScaleTicks.reduce((r, value) => {
    let label = valueFormat.format(value);
    let tm = context.measureText(label);
    return Math.max(tm.width, r);
  }, 0);

  let valueAxisWidth = valueScaleLabelWidth + tickLength.value() * 2;

  const chartBox = box(0, 0, canvas.width, canvas.height)
    .insideBox(padX, padY)
    .resolve(env0);

  const legendWidth = Math.abs(chartBox.width());
  const legendData = categories.map((x, idx) => ({
    c: stroke[idx % stroke.length],
    l: x,
    v: null,
    vl: null,
  }));

  context.font = labelFont;
  let labelTextHeight = context.measureText("X").width;

  // create legend
  let legend: IShape = createLegend(
    canvas,
    legendData,
    LegendStyle.BOX,
    legendWidth,
    textColor
  );

  // Calculate additional padding of last group
  const lastLabelGroupPaddingCorrection = calculateLastGroupPaddingCorrection(
    chartBox.right() - valueAxisWidth,
    labels.length,
    labelPadding,
    lastLabelExtraPaddingFactor
  );

  // Calculate group scale
  const labelScale = d3
    .scaleBand()
    .domain(labels)
    .range([valueAxisWidth, chartBox.right() - lastLabelGroupPaddingCorrection])
    .paddingInner(labelPadding)
    .paddingOuter(labelOuterPadding);

  // Calculate item scale
  const categoryScale = d3
    .scaleBand()
    .domain(categories)
    .range([0, labelScale.bandwidth()])
    .paddingInner(categoryPadding);

  // Start 

  const maxWorldLength = labels.reduce((a: number, b: string) => { 
    return Math.max(...[a, ...(b.split(' ').map(x => context.measureText(x).width))]);
  }, Number.MIN_VALUE);

  const maxLabelWidthAngled = valueAxisWidth +  labelScale.step() * labelOuterPadding + labelScale.bandwidth();
  const maxLabelWidthStraight = labelScale.step() - 4 * context.measureText(" ").width;

  // Line Breaks

  const multilineLabels = labels.map(l => toMultiLine(l, Math.max(maxWorldLength, maxLabelWidthStraight), context));

  let labelRotation = multilineLabels.reduce(
    (a: number, l: { width: number, height: number, lines: string[]}) => {
      const rotation = calculateRotation(l.width, l.height, maxLabelWidthStraight, maxLabelWidthAngled);
      return Math.max(rotation, a);
    }, 0);

  labelRotation = calcRotationWithoutIntersection(multilineLabels, labelScale.step(), labelRotation);

  let groupLabelHeight = Math.max(...multilineLabels.map(l => calculateRotatedBoundingBox(l.width,l.height, labelRotation).height));

  let firstGroupLabelWidth = multilineLabels[0].width;

  let groupLabelOffset = maxLabelWidthAngled - firstGroupLabelWidth;


  // Calculate corner position
  let cornerPos = chartBox
    .bottomLeft()
    .rightBy(valueAxisWidth)
    .aboveBy(
      legend.height + groupLabelHeight + labelTextHeight * 2 
    );

  // Calculate yLabelBox
  let yLabelBox = box(chartBox.topLeft(), cornerPos).resolve(env0);

  // Calculate PlotBox
  const plotBox = box(
    cornerPos,
    chartBox.topRight().belowBy(labelTextHeight)
  ).resolve(env0);

  // Calculate max ValueLabel font size
  const valueLables = data.map((x) => valueFormat.format(value(x)));
  const valueLabelFont = calculateMaxValueLabelFontSize(
    context,
    labelFontFamily,
    labelFontSize.value(),
    categoryScale.bandwidth() * (1 + categoryScale.padding()),
    valueLables
  );

  // Calculate LegendBox
  const legendBox = box(
    chartBox.bottomLeft(),
    chartBox.bottomRight().aboveBy(legend.height)
  ).resolve(env1);

  // Draw Legend
  context.save();
  context.font = labelFont;
  context.translate(legendBox.left(), legendBox.top());
  legend.paint(canvas);
  context.restore();

  // // Debug
  // if(showDebug) {
  //   context.fillStyle = '#FF0000';
  //   context.fillRect(0, cornerPos.y(), maxLabelWidthAngled, cornerPos.y() + 10);  
  // }

  // Calculate Value Axis Ticks & Scale
  const vhRange = [plotBox.bottom(), plotBox.top()];
  const valueScale = valueScaleU.range(vhRange);
  const valueAxisTicks = valueScaleTicks.map(valueScale);

  // context.beginPath();
  // if (chart.axis) {
  //   if (chart.axis.stroke) {
  //     context.fillStyle = chart.axis.textColor;
  //   }
  // }

  // Draw Value Axis Tick Lines
  const axisLine = d3
    .line()
    .context(context as any)
    .x((d) => d[0])
    .y((d) => d[1]);

  context.beginPath();
  valueAxisTicks.forEach((y, i) => {
    axisLine([
      [yLabelBox.right() - tickLength.value(), y],
      [plotBox.right(), y],
    ]);
  });

  context.strokeStyle = chart?.axis?.stroke || "#345";
  context.lineWidth = chart?.axis?.lineWidth || 1;
  context.stroke();

  // Draw Value Axis Tick Labels
  context.beginPath();
  context.fillStyle = chart?.axis?.textColor || "#111";
  context.font = labelFont;
  context.textBaseline = "middle";
  context.textAlign = "right";
  valueAxisTicks.forEach((y, i) => {
    const label = valueFormat.format(valueScaleTicks[i]);
    context.fillText(label, yLabelBox.right() - 2 * tickLength.value(), y);
  });

  // Draw Data
  const axisLineY = plotBox.bottom();
  data.forEach((d) => {
    const v = value(d);
    const c = category(d);
    const l = label(d);

    const isLastLabel = labels.indexOf(l) == labels.length - 1;

    const x =
      (isLastLabel ? lastLabelGroupPaddingCorrection : 0) +
      labelScale(l) +
      categoryScale(c);

    const top = valueScale(v);
    const bottom = axisLineY;
    const width = Math.min(categoryScale.bandwidth());
    const height = top - bottom;

    context.fillStyle = stroke[categories.indexOf(c) % categories.length];
    context.fillRect(x, bottom, width, height);

    // Draw Value Text
    context.textBaseline = "bottom";
    context.textAlign = "center";
    context.font = valueLabelFont;
    context.fillStyle = chart?.axis?.textColor || "#111";
    context.fillText(valueFormat.format(v), x + width / 2, top);
  });

  // Draw Group Label
  labels.forEach((l, idx) => {
    const isLastGroup = idx == labels.length - 1;
    const bottom = axisLineY + labelTextHeight;

    let x =
      (isLastGroup ? lastLabelGroupPaddingCorrection : 0) +
      labelScale(l) +
      labelScale.bandwidth() / 2;

    let y = bottom + labelTextHeight / 2;

    context.save();
    context.font = labelFont;
    context.fillStyle = chart.axis?.textColor;
    
    context.textBaseline = "top";
    context.textAlign = "center";

    const multilineLabel = multilineLabels[idx];

    if (labelRotation) {
      const { width: bWidth, height: bHeight } = calculateRotatedBoundingBox(
        multilineLabel.width, multilineLabel.height,
        labelRotation
      );
      
      context.textBaseline = "hanging";
      context.textAlign = "right";


      x += labelScale.bandwidth() * 1 / 3;

      // if(maxLabelWidthStraight > bWidth) {
      //   x += (maxLabelWidthStraight - bWidth) / 2;
      // } else {
      // }
    }

    context.translate(x, y);
    if (labelRotation) {
      context.rotate(-labelRotation);
    }

    if (showDebug) {
      context.strokeStyle = "#00FF00";
      if(labelRotation) {
        context.strokeRect(-multilineLabel.width, 0, multilineLabel.width, multilineLabel.height);
      } else {
        context.strokeRect(-multilineLabel.width / 2, 0, multilineLabel.width, multilineLabel.height);
      }
      
      context.strokeStyle = "#0000FF";
      context.strokeRect(-1,-1,2,2);
    }

    context.fillText(multilineLabel.lines.join('\n'), 0, 0);
    context.restore();
  });
}

function calculateRotatedBoundingBox(w: number, h: number, angle: number) {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);

  const a = h * sin;
  const c = w * cos;

  const b = h * cos;
  const d = w * sin;

  const width = a + c;
  const height = d + b;

  return { width, height };
}

function calculateRotation(
  w: number,
  h: number,
  maxLabelWidthStraight: number,
  maxLabelWidthAngled: number,
): number {

  let minAngle = Math.asin( 3*h / ( 2 * maxLabelWidthStraight) );

  if (maxLabelWidthStraight > w) {
    return 0;
  }

  if (maxLabelWidthAngled > w) {
    return 0;
  }

  let W = maxLabelWidthAngled;
  return Math.max(
      Math.min(
        Math.PI / 2,
        2 * Math.atan((h + Math.sqrt(h * h + w * w - W * W)) / (w + W)),
      ),
      minAngle  
    );
}

function calculateMaxValueLabelFontSize(
  context: c.CanvasRenderingContext2D,
  labelFontFamily: string,
  labelFontSize: number,
  availableWidth: number,
  text: string[]
): string {
  let labelFont = `${labelFontSize}px ${labelFontFamily}`;
  context.font = labelFont;
  let width = Number.MIN_VALUE,
    largestText = "";
  text.forEach((t) => {
    const w = context.measureText(t).width;
    if (w > width) {
      width = w;
      largestText = t;
    }
  });

  while (labelFontSize > 10 && width > availableWidth) {
    labelFontSize--;
    labelFont = `${labelFontSize}px ${labelFontFamily}`;
    context.font = labelFont;
    width = context.measureText(largestText).width;
  }
  return labelFont;
}

function calculateLastGroupPaddingCorrection(
  W: number,
  N: number,
  padding: number,
  extra: number
): number {
  return (W / (N + padding * (N - 1 + extra))) * padding * extra;
}

function toMultiLine(label: string, lineWidth: number, context: c.CanvasRenderingContext2D) : { width: number, height: number, lines: string[]} {
  
  const labelMeasure = context.measureText(label) as any;
  const lineHeight = (labelMeasure as any).emHeightAscent + labelMeasure.emHeightDescent;

  if(labelMeasure.width <  lineWidth) {
    return { width: labelMeasure.width, height: lineHeight, lines : [ label ]};
  }

  const sWidth = context.measureText(' ').width;
  const words = label.split(' ').map(p => ({text: p, length: context.measureText(p).width}));
  
  const lines :string[] =  [ '' ];

  let currentLine = 0; 
  let currentLength = 0;
  for(let i = 0; i < words.length; i++) {
    let currentWord = words[i];
    
    if(currentWord.length + currentLength > lineWidth ) {
      lines[++currentLine] = '';
      currentLength = 0;
    }

    if(currentLength) {
      lines[currentLine] += ' ';
      currentLength += sWidth;
    }

    lines[currentLine] += currentWord.text;
    currentLength += currentWord.length;
  }

  const newLabelMeasure = context.measureText(lines.join('\n'));
  return {
    width: newLabelMeasure.width + sWidth *2,
    height: lineHeight * lines.length, 
    lines: lines
  };
}

function calcRotationWithoutIntersection(labelsBoxes: { width: number, height: number}[], distance: number, angle: number = 0 ) {

  for(var degrees = Math.ceil(angle / (Math.PI / 180)); degrees < 90; degrees++) {

    let intersection = false;
    angle = degrees * Math.PI / 180;
    let xDistance = Math.cos(angle) * distance;
    let yDistance = Math.sin(angle) * distance;
    
    for(var i = 0; i < labelsBoxes.length -2;i++) {
    
      let boxA  = labelsBoxes[i];
      let boxB  = labelsBoxes[i+1];

      if(degrees > 0) {
        intersection = boxA.height > yDistance && boxB.width > xDistance;
      } else {
        intersection = (boxA.width + boxB.width) / 2 > xDistance;
      }
          
      if(intersection) {
        break; 
      }

    }

    if(!intersection) {
      break;
    }
  }

  return angle;
}