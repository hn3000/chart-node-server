
import * as c from 'canvas';
import { IData } from './api';
import { Dimension } from './dimension';
import { IPosition } from './position';

export interface IShape {
  width: number;
  height: number;
  paint(canvas: c.Canvas): void;
}

export interface ILegendShape extends IShape {
  lineHeight: number;
}


export enum LegendStyle {
  BOX='box',
  LINE='line',
  SHAPE='shape'
}

export function nullShape() {
  return {
    width: 0, height: 0,
    paint(_canvas: c.Canvas) {}
  };
}

function createBoxMarker(width: number, height: number, fill: string, stroke: string, lineWidth: number): IShape {
  return {
    width, height,
    paint(canvas: c.Canvas) {
      let ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.rect(0,0,width, height);
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    }
  };
}

function createLineMarker(width: number, height: number, fill: string, stroke: string, lineWidth: number): IShape {
  return {
    width, height,
    paint(canvas: c.Canvas) {
      let ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.moveTo(0,height/2);
      ctx.lineTo(width,height/2);
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    }
  };
}

function createShapeMarker(paint: (context, w, h) => void, width: number, height: number, fill: string, stroke: string, lineWidth: number) {
  return {
    width, height,
    paint(canvas: c.Canvas) {
      let ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.save();
      if (fill) {
        ctx.fillStyle = fill;
      }
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
      }
      paint(ctx, width, height);
      ctx.restore();
    }
  };
}

export function createTextShape(
  canvas: c.Canvas, 
  position: IPosition,
  text: string,
  font: string,
  textBaseline: CanvasTextBaseline = 'alphabetic',
  textAlign: CanvasTextAlign = 'left',
  rotateDeg: number = 0,
): IShape {

  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.font = font;
  const tm = ctx.measureText(text);

  const x = position.x();
  const y = position.y();
  ctx.restore();

  return ({
    height: tm.actualBoundingBoxAscent,
    width: tm.width,
    paint(canvas: c.Canvas) {
      const ctx = canvas.getContext('2d');

      ctx.save();
      ctx.font = font;
      ctx.textAlign = textAlign;
      ctx.textBaseline = textBaseline;

      ctx.translate(x,y);
      ctx.rotate(rotateDeg / 180 * Math.PI);
      ctx.fillText(text, 0, 0, tm.width);
      ctx.restore();
    }
  });
}

export function createLegendEntry(
  canvas: c.Canvas, 
  style: LegendStyle, color: string,
  text: string, textColor: string,
  entry: IData,
  sampleHeight = 0.65
): IShape {
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'alphabetic';
  let textMetrics = ctx.measureText(text);
  let ascent = textMetrics.actualBoundingBoxAscent;
  let marker: IShape;
  let markerHeight = Math.ceil(sampleHeight*ascent);
  let markerX = 0;
  let markerY = Math.floor((1-sampleHeight)*5/8 * ascent);
  
  if (style === LegendStyle.BOX) {
    marker = createBoxMarker(markerHeight, markerHeight, color, null, 0);
  } else if (style === LegendStyle.LINE) {
    marker = createLineMarker(markerHeight, ascent, null, color, 0.05*ascent);
  } else if (style === LegendStyle.SHAPE) {
    marker = createShapeMarker(entry['drawShape'], markerHeight, markerHeight, entry.c, entry.s, 1);
  } else {
    marker = nullShape();
  }
  let spacingX = Math.round(0.45 * marker.height);
  let textX = marker.width + spacingX;
  let textY = textMetrics.actualBoundingBoxAscent;
  let width = marker.width + spacingX + textMetrics.width;
  let height = Math.max(
    marker.height, 
    textMetrics.actualBoundingBoxAscent+textMetrics.actualBoundingBoxDescent);

    return {
    width, height,
    paint(canvas: c.Canvas) {
      const ctx = canvas.getContext('2d');
      ctx.save();
      ctx.save();
      ctx.translate(markerX, markerY);
      marker.paint(canvas);
      ctx.restore();
      ctx.fillStyle = textColor;
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.fillText(text, textX, textY, textMetrics.width);
      ctx.restore();
    }
  } as IShape;
}

export type LegendAlignment = 'center' | 'left' | 'right';
export type LegendPosition = 'top' | 'bottom';

export function createLegend(
  canvas: c.Canvas, 
  data: IData[], 
  style: LegendStyle, 
  width: number, 
  textColor: string,
  alignment: LegendAlignment = 'center',
  position: LegendPosition = 'top',
  sampleHeight = 0.65
): ILegendShape {
  const legendEntries = data.map(x => createLegendEntry(canvas, style, x.c, x.l, textColor, x, sampleHeight));
  const lines: {shape: IShape, x: number}[][] = [];
  const lineWidths: number[] = [];
  const positions = [];
  let currentLine = 0;
  let currentWidth = 0;

  for (let i = 0, n = legendEntries.length; i < n; ++i) {
    let thisOne = legendEntries[i];
    let spacingX = 0 === currentWidth ? 0 : Math.ceil(thisOne.height * 1.25);
    if (0 !== currentWidth && currentWidth + thisOne.width + spacingX > width) {
      currentLine ++;
      currentWidth = 0;
      spacingX = 0;
    }
    let item = { shape: thisOne, x: spacingX + currentWidth };
    currentWidth += spacingX + thisOne.width;
    if (lines[currentLine] != null) {
      lines[currentLine].push(item);
    } else {
      lines[currentLine] = [ item ];
    }
    lineWidths[currentLine] = currentWidth;
  }
  let lineHeight = legendEntries.reduce((r,x) => Math.max(r,x.height), 0);  
  let currentTop = position === 'top' ? 0 : lineHeight;
  for (let li = 0, ln = lines.length; li < ln; ++li) {
    let startX: number;
    switch (alignment) {
      case 'center':
      default:
        startX = (width - lineWidths[li]) / 2;
        break;
      case 'left':
        startX = 0;
        break;
      case 'right':
        startX = width - lineWidths[li];
        break;
      }
    for (let ii = 0, ni = lines[li].length; ii < ni; ++ii) {
      const thisOne = lines[li][ii];
      positions.push({x: startX + thisOne.x, y: currentTop });
    }
    currentTop += Math.ceil(lineHeight*2);
  }
  return ({
    height: currentTop - (position === 'top' ? 0 : lineHeight),
    width,
    lineHeight,
    paint(canvas: c.Canvas) {
      const context = canvas.getContext('2d');
      for (let i = 0, n = legendEntries.length; i < n; ++i) {
        context.save();
        context.translate(positions[i].x, positions[i].y);
        legendEntries[i].paint(canvas);
        context.restore();
      }
    }
  });

}
