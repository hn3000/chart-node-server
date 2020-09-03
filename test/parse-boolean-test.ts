import { parseBoolean } from "../src/util";

import { TestClass } from "tsunit.external/tsUnitAsync";

export class ParseBooleanTest extends TestClass {
  constructor() {
    super();
    this.parameterizeUnitTest(this.testBooleanFromValue, [
      [false, false],
      [0, false],
      ["false", false],
      [null, false],
      [undefined, false],
      [true, true],
      [1, true],
      ["true", true],
    ]);
  }
  testBooleanFromValue(val, expected) {
    const parsed = parseBoolean(val);
    this.areIdentical(expected, parsed);
  }
}
