import { Axis } from "d3";
import { CustomTimeInterval } from "./custom-time-intervals";

export interface IChartMeta {
  [key:string]: string;
}

export interface IColorRGBA {
  r: number;
  b: number;
  g: number;
  a?: number; // default is 1
}

export type ColorSpec = string | IColorRGBA; // '#ddd', 'rgb(1,2,3,0.1)'

export interface IChartSpec {
  width: number;
  height: number;
  padX: string|number;
  padY: string|number;
  background: string;
  stroke: string;
  lineWidth?: number|string;
  lineCap?: 'butt'|'round'|'square';
  lineJoin?: 'bevel'|'miter'|'round';
  miterLimit?: number;
  labelFontSize?: string|number;
  labelFontWeight?: number|string;
  labelFontFamily?: string;

  locale?: string;
  labelPrecision?: number;
  labelStyle?: string;
  labelCurrency?: string;
  months?: string[];

  axis?: {
    nice?: boolean;
    stroke: string;
    lineWidth: number;
    textColor: string;
    labelFontSize?: string|number;
    labelFontWeight?: number|string;
    labelFontFamily?: string;
    titleFontSize?: string|number;
    titleFontWeight?: string|number;
    titleFontFamily?: string;
  };
  timeAxis?: {
    position: 'top' | 'bottom';
    nice?: boolean;
    tickCount?:number;
    labelFontSize?: string|number;
    labelFontWeight?: number|string;
    labelFontFamily?: string;
    titleFontSize?: string|number;
    titleFontWeight?: string|number;
    titleFontFamily?: string;
  };
  mainAxis?: {
    position: 'top' | 'bottom';
    nice?: boolean;
    tickCount?:number;
    labelPrecision?: number;
    labelStyle?: 'decimal'|'percent'|'currency';
    labelCurrency?: string;
    labelFontSize?: string|number;
    labelFontWeight?: number|string;
    labelFontFamily?: string;
    title?: string;
    titleFontSize?: string|number;
    titleFontWeight?: string|number;
    titleFontFamily?: string;
    tickInterval?: CustomTimeInterval;
  };
  valueAxis?: {
    position: 'left';
    nice?: boolean;
    tickCount?:number;
    overshootTolerance?: number;
    labelPrecision?: number;
    labelStyle?: 'decimal'|'percent'|'currency';
    labelCurrency?: string;
    labelFontSize?: string|number;
    labelFontWeight?: number|string;
    labelFontFamily?: string;
    title?: string;
    titleFontSize?: string|number;
    titleFontWeight?: string|number;
    titleFontFamily?: string;
  }
  xAxis?: {
    position: 'top' | 'bottom';
    nice?: boolean;
    tickCount?:number;
    labelPrecision?: number;
    labelStyle?: 'decimal'|'percent'|'currency';
    labelCurrency?: string;
    labelFontSize?: string|number;
    labelFontWeight?: number|string;
    labelFontFamily?: string;
    title?: string;
    titleFontSize?: string|number;
    titleFontWeight?: string|number;
    titleFontFamily?: string;
  }
  yAxis?: {
    position: 'left';
    nice?: boolean;
    tickCount?:number;
    labelPrecision?: number;
    labelStyle?: 'decimal'|'percent'|'currency';
    labelCurrency?: string;
    labelFontSize?: string|number;
    labelFontWeight?: number|string;
    labelFontFamily?: string;
    title?: string;
    titleFontSize?: string|number;
    titleFontWeight?: string|number;
    titleFontFamily?: string;
  }
  colors?: string[];
}


export interface IChartBody {
  meta: IChartMeta;
  chart: IChartSpec;
  data: any[];
  debug?: {
    boxes: boolean;
  }
}


export interface IData {
  v: number;
  c: string; // color
  s?: string; // optional separate stroke color
  vl: string;
  l: string;
}

export interface IBarBody extends IChartBody {
  chart: IChartSpec & {
    labelColor?: string;
    stroke: string | string[];
    showDebug?: boolean;
    labelPadding?: number;
    labelOuterPadding?: number;
    categoryPadding?: number;
    lastLabelExtraPaddingFactor?: number;
  }
}


export interface IPieBody extends IChartBody {
  data: any[];
  showLegend: string|boolean;
  chart: IChartSpec & {
    labelColor?: string;
    labelFont?: string;
    legendAlignment?: 'left' |'center'|'right';
    legendFont?: string;
    legendFontFamily?: string;
    legendPosition?: 'top' | 'bottom' | 'left' | 'right';
    legendSize?: string|number;
    legendVerticalAlignment?: 'top' | 'middle' | 'bottom';
    legendItemPerRow?: boolean;
    showDebug?: boolean;
    showLegend?: boolean;
    showCenter?: boolean,
    showLabels?: boolean,
    showLabelDebug?: boolean,
  }
}

export interface IScatterChartBody extends IChartBody {
  chart: IChartSpec & {     
    shapes?: string[]; // path2d shape, ~32x32 px^2, centered on 16,16

    extra?: number;
    shapeSize?: string|number;

    showLegend: boolean;
    legendPosition: 'top' | 'bottom';
    legendAlignment: 'left' | 'right' | 'center';
    legendFontSize: string|number;
    legendItemPerRow?: boolean;
  }
}

export interface ITimeLineBody extends IChartBody {
  chart: IChartSpec & { 
    seriesLabel: string | string[];
    stroke: string | string[];
    showLegend?: boolean;
    axis: {
      referenceValue?: number;
      referenceStroke?: string;
    };
    legend: {
      lineWidth?: number|string;
    }
  };
  meta: IChartMeta & {
    value: string | string[]
  };
}

