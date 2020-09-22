import { IChartMeta } from "./api";

export function parseBoolean(v: any): boolean {
  switch (v) {
    case 'false':
      return false;
    case false:
      return false;
    case 0:
      return false;
    case null:
      return false;
    case undefined:
      return false;
    case 'true':
      return true;
    case true:
      return true;
    default: 
      return true;
  }
}

export function pickDefined<T>(args: (T|undefined)[], fallback: T): T {
  for (let i = 0; i < args.length; i++) {
    const thisOne = args[i];
    if (undefined !== thisOne) {
      return thisOne;
    }
  }
  return fallback;
}

export function pickNonNull<T>(args: (T|null|undefined)[], fallback: T): T {
  for (let i = 0; i < args.length; i++) {
    const thisOne = args[i];
    if (undefined !== thisOne && null !== thisOne) {
      return thisOne;
    }
  }
  return fallback;
}

export function valueGetter(name: string, meta: IChartMeta) {
  const mapped = meta[name];
  if (null != mapped && '' !== mapped) {
    return x => x[mapped];
  }
  return x => x[name];
}