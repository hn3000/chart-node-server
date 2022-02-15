import { TimeInterval, timeInterval, timeYear } from 'd3-time/';

const floor = (d: Date) => {
  d.setMonth(d.getMonth() > 5 ? 6 : 0, 1);
  d.setHours(0, 0, 0, 0);
};

const offset = (d: Date, step: number) => {
  d.setMonth(d.getMonth() + 6 * step);
};

export type CustomTimeInterval = 'half-year' | 'year';

export const Intervals: { [K in CustomTimeInterval]: TimeInterval } = {
  'half-year': timeInterval(floor, offset),
  'year': timeYear
};
