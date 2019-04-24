import * as d3 from 'd3';
import { IChartSpec, IChartBody } from './api';
import { PieArcDatum } from 'd3';


export interface IPieBody extends IChartBody {
  data: any[];
}

interface IData {
  v: number;
  c: string;
  vl: string;
  l: string;
}

export function renderPie(req, canvas) {
  const context = canvas.getContext("2d");
  const vh = canvas.height;
  const vw = canvas.width;
  const vMin = Math.min(vh, vw);
  const vMax = Math.max(vh, vw);

  const defaultColors = ["#579", "#597", "#759", "#795", "#975", "#957"];

  const body: IPieBody = req.body;
  const { colors=defaultColors } = req.body.chart;
  const meta = req.body.meta;

  const value   = meta.value  ? (x:any) => x[meta.value]  : x => x["value"];
  const label   = meta.label  ? (x:any) => x[meta.label]  : x => x["value"];
  const legend  = meta.legend ? (x:any) => x[meta.legend] : x => x["legend"];
  const color   = meta.color  ? (x:any) => x[meta.color]  : x => x["color"];

  const data = req.body.data.map((v, i) => ({
    vl: label(v) || `Label ${i}`,
    l: legend(v) || `Legend ${i}`,
    v: value(v),
    c: color(v) || colors[i % colors.length]
  }));

  const {
    innerRadius = vMin / 4,
    outerRadius = vMin / 3,
    cornerRadius = 0,
    stroke = "#fff",
    lineWidth = 0,
    showCenter = false,
    showLabels = true,
    showLabelDebug = false,
    padAngle = 0,
  } = req.body.chart;
  let makePie = d3
    .pie<IData>()
    .value(x => x.v)
    .padAngle(padAngle);
  const pie = makePie(data);
  let drawArc = d3
    .arc<PieArcDatum<IData>>()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius)
    .cornerRadius(cornerRadius)
    .context(context);
  let drawLine = d3.line().context(context);

  console.log(pie);

  context.translate(vMin / 2, vMin / 2);
  pie.forEach(x => {
    context.beginPath();
    drawArc(x);
    context.fillStyle = x.data.c;
    context.fill();

    if (lineWidth > 0) {
      context.lineWidth = lineWidth;
      context.strokeStyle = stroke;
      context.stroke();
    }

    if (showLabels) {
      context.beginPath();

      let centroid = drawArc.centroid(x);
      let len = Math.sqrt(centroid.reduce((r, x) => r + x * x, 0));
      let labelPos = centroid.map(t => (t / len) * outerRadius * 1.1);
      if (showLabelDebug) {
        context.moveTo(...centroid);
        context.lineTo(...labelPos);
        context.strokeStyle = "#444";
        context.lineWith = 5;
        context.stroke();
      }

      labelPos = centroid.map(t => (t / len) * outerRadius * 1.2);
      context.font = vMin * 0.05 + "px sans-serif";
      let labelTxt = x.data.vl || `${x.value.toFixed(1)}`;

      context.save();
      context.textAlign = 'center';
      context.textBaseline = 'middle';
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
    context.lineWith = 3;
    context.stroke();
  }

  if (vw - vMin > 100) {
    context.resetTransform();
    context.translate(vMin, 0);
    context.fillStyle = "#ddd";
    context.fillRect(0, 0, vw - vMin, vh);
    context.font = '13px Helvetica,"sans-serif"';
    context.fillStyle = "#000";

    const text = JSON.stringify(data, null, 2);
    context.fillText(text, 10, 20, vw - vMin - 20);
  }
}

export interface ITimeLineBody extends IChartBody {

}

export function renderTimeline(req, canvas) {
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
 
  const timeScale = d3.scaleTime()
                      .domain([minTime, maxTime])
                      .range([100,vw-100]);

  const valueScale = d3.scaleLinear()
                      .domain([minVal, maxVal])
                      .range([100,vh-100]);

  const line = d3.line().curve(d3.curveLinear).context(context)
                 .x(d => timeScale(getTimestamp(d)))
                 .y(d => valueScale(getValue(d)));

  context.beginPath();
  line(data);
  context.strokeStyle = chart.stroke;
  context.lineWidth = chart.lineWidth;
  context.stroke();

  //const axis = d3.axisLeft(scale);
}

