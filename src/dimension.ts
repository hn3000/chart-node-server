
export interface IUnitFactors {
  [unit: string]: number;
}

export interface IDimension {
  unit: string;
  number: number;
  value(env: IUnitFactors): number;
}

const dimensionRegEx = /^\d+\s*\w+$/;

export class Dimension {
  static parse(text: string): IDimension {
    return new Dimension(text); 
  }
  static value(text: string, env: IUnitFactors): number {
    let [ , number, unit ] = dimensionRegEx.exec(text);
    let f = env[unit];
    if (null == f) {
      f = 1.0;
    }
    return parseFloat(number) * f;
  }

  public number: number;
  public unit: string;

  constructor(dimension: string);
  constructor(number: number, unit: string);
  constructor(numberOrDimension: number|string, unit?: string) {
    let numberVal: number;
    let unitVal: string;
    if (arguments.length === 1 && typeof numberOrDimension === 'string') {
      let match = dimensionRegEx.exec(numberOrDimension);
      if (match) {
        numberVal = parseFloat(match[1]);
        unitVal = match[2];
      } else {
        throw new Error(`illegal dimension string ${numberOrDimension}`);
      }
    } else if(arguments.length === 2 && typeof numberOrDimension === 'number') {
      numberVal = numberOrDimension;
      unitVal = unit;
    } else {
      throw new Error(`illegal arguments ${numberOrDimension}, ${unit}`);
    }
    this.number = numberVal;
    this.unit = unitVal;
  }

  value(env: IUnitFactors) {
    let f = env[this.unit];
    if (null == f) {
      f = 1.0;
    }
    return this.number * f;
  }
}
