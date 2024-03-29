
import { DimensionTest } from './dimension-test';
import { PositionTest } from './position-test';
import { ParseBooleanTest } from './parse-boolean-test';

import {
  TestAsync,
  TestDescription
} from "tsunit.external/tsUnitAsync";
import { D3TimeScaleTest } from './d3-time-scale-test';

function parmNum(t:TestDescription) {
  return (null != t.parameterSetNumber) ? `[${t.parameterSetNumber}]` : '';
}

export function runTests() {
  "use strict";
  let test = new TestAsync();
  test.addTestClass(new D3TimeScaleTest(), 'D3TimeScaleTest');
  test.addTestClass(new DimensionTest(), 'DimensionTest');
  test.addTestClass(new PositionTest(), 'PositionTest');
  test.addTestClass(new ParseBooleanTest(), 'ParseBooleanTest');

  let promise = test.runAsync();
  promise.then((result) => {
    //console.log(result);
    if (result.errors.length) {
      console.log('---');
      result.errors.forEach((e) => {
        console.log(`Failed: ${e.testName}.${e.funcName}${parmNum(e)} - ${e.message}`);
      });
      console.log('---');
      console.log(`ran unit tests, ${result.passes.length} passed, ${result.errors.length} failed`);
    } else {
      let testnames = result.passes.map((x) => `${x.testName}.${x.funcName}${parmNum(x)}`).join('\n');
      console.log('---');
      console.log(testnames);
      console.log('---');
      console.log(`ran unit tests, all ${result.passes.length} tests passed`);
    }
  });
}

runTests();
