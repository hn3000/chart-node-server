import { TestClass } from "tsunit.external/tsUnitAsync";
import * as d3 from 'd3';
export class D3TimeScaleTest extends TestClass {
  testTicks() {
    const minTime = new Date(2021,0,1);
    const maxTime = new Date(2021,11,31);
    const timeScale = d3.scaleTime().domain([minTime, maxTime]);
    const ticks = timeScale.ticks();
    this.areIdentical(12, ticks.length);
    console.warn(ticks);
  }
  testNiceTicks() {
    const minTime = new Date(2021,0,1);
    const maxTime = new Date(2021,11,31);
    const timeScale = d3.scaleTime().domain([minTime, maxTime]).nice();
    const ticks = timeScale.ticks();
    this.areIdentical(13, ticks.length);
    console.warn(ticks);
  }
}
