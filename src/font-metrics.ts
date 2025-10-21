

import * as c from "canvas";

function times(s: string, n: number) {
  let result = [];
  for (let i = 0; i < n; ++i) {
    result[i] = s;
  }
  return result.join('');
}

function nearly(a,b, epsilon=1e-7) {
  return (Math.abs((a-b)) < epsilon);
}

export function fontMetrics(canvas: c.Canvas, font: string, size: number) {
  const context = canvas.getContext("2d");

  const fontSpec = `${size}px ${font}`;
  context.font = fontSpec;

  const samples = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYÄÖÜabcdefghijklmnopqrstuvwxyzäöüß!"\'§$%&/()=?';

  const metrics = {};

  for (let i = 0; i < samples.length; ++i) {
    const text = samples.substring(i, i+1);
    const m1 = context.measureText(text);
    const m10 = context.measureText(times(text, 10));

    metrics[text] = { w: m1.width };
    if (! nearly(m1.width * 10, m10.width)) {
      metrics[text].w10 = m10.width;
    }
  }
  for (let i = 0; i < samples.length; ++i) {
    const a = samples.substring(i, i+1);
    const ma = metrics[a];
    for (let j = 0; j < samples.length; ++j) {
      const b = samples.substring(j, j+1);
      const mb = metrics[b];
      const text = a+b;
      const m1 = context.measureText(text);
      const m10 = context.measureText(times(text, 10));
      if (!ma || !mb || !nearly(ma.w + mb.w, m1.width)) {
        metrics[text] = { w: m1.width, wa: ma.w, wb: mb.w };
        if (! nearly(m1.width * 10, m10.width)) {
          metrics[text].w10 = m10.width;
        }
      }
    }
  }

  return metrics;
}

export function fontMeasureText(canvas: c.Canvas, font: string, size: number, samples: string[]) {
  const context = canvas.getContext("2d");

  const fontSpec = `${size}px ${font}`;
  context.font = fontSpec;

  const metrics = [];

  for (let i = 0; i < samples.length; ++i) {
    const text = samples[i];
    const m1 = context.measureText(text);
    const m2 = context.measureText(times(text, 2));

    metrics.push({ t: text, l: text.length, w: m1.width });
    if (! nearly(m1.width * 2, m2.width)) {
      metrics[metrics.length-1].w2 = m2.width;
    }
  }

  return metrics;
}
