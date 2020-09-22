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
  labelFontFamily?: string;

  locale?: string;
  labelPrecision?: number;
  labelStyle?: string;
  labelCurrency?: string;
  months?: string[];

  axis?: {
    stroke: string;
    lineWidth: number;
    textColor: string;
  };
  timeAxis?: {
    position: 'top' | 'bottom';
  };
  mainAxis?: {
    position: 'top' | 'bottom';
    labelPrecision?: number;
    labelStyle?: 'decimal'|'percent'|'currency';
    labelCurrency?: string;
  };
  valueAxis?: {
    position: 'left';
    labelPrecision?: number;
    labelStyle?: 'decimal'|'percent'|'currency';
    labelCurrency?: string;
  }
  xAxis?: {
    position: 'top' | 'bottom';
    labelPrecision?: number;
    labelStyle?: 'decimal'|'percent'|'currency';
    labelCurrency?: string;
  }
  yAxis?: {
    position: 'left';
    labelPrecision?: number;
    labelStyle?: 'decimal'|'percent'|'currency';
    labelCurrency?: string;
  }
  colors?: string[];
}


export interface IChartBody {
  meta: IChartMeta;
  chart: IChartSpec;
}


export interface IData {
  v: number;
  c: string; // color
  s?: string; // optional separate stroke color
  vl: string;
  l: string;
}

export interface IPieBody extends IChartBody {
  data: any[];
  showLegend: string|boolean;

  legendPosition: 'top' | 'bottom';

}
