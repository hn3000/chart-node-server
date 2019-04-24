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
  background: ColorSpec;
  stroke: string;
  lineWidth: number;
}


export interface IChartBody {
  meta: IChartMeta;
  chart: IChartSpec;
}
