import { parseBoolean } from "../src/util.js";

import { TestClass } from "@hn3000/tsunit-async";

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
