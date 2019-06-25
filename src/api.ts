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
  valueAxis?: {
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
  c: string;
  vl: string;
  l: string;
}

export interface IPieBody extends IChartBody {
  data: any[];
}
