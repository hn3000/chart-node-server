import { RequestLogger } from '../src/request-logger.js';

import { TestClass } from "@hn3000/tsunit-async";


export class RequestLoggerTest extends TestClass {
    constructor() {
      super();
    }

    testGetIdsIsEmptyAtStart() {
      const requestLogger = new RequestLogger(3);
      const secret = requestLogger._secret;

      this.isTrue(null != requestLogger.getIds(secret));
      this.areIdentical(0, requestLogger.getIds(secret).length);
    }
    testGetIdsReturnsFirstId() {
      const requestLogger = new RequestLogger(3);
      const secret = requestLogger._secret;
      const id = requestLogger.add({blah:'blub'});

      this.isTrue(null != requestLogger.getIds(secret));
      this.areIdentical(1, requestLogger.getIds(secret).length);
      this.areIdentical(id, requestLogger.getIds(secret)[0]);
      this.areIdentical('blub', requestLogger.get(id).data.blah);
    }
    testGetIdsReturnsIdsInReverseOrder() {
      const length = 3;
      const requestLogger = new RequestLogger(length);
      const secret = requestLogger._secret;
      const ids = [
        requestLogger.add({blah:'blub1'}),
        requestLogger.add({blah:'blub2'}),
        requestLogger.add({blah:'blub3'}),
        requestLogger.add({blah:'blub4'}),
        requestLogger.add({blah:'blub5'}),
      ];

      console.log(requestLogger._ringbuffer);

      this.isTrue(null != requestLogger.getIds(secret));
      this.areIdentical(3, requestLogger.getIds(secret).length);
      this.areIdentical(ids[ids.length-1], requestLogger.getIds(secret)[0]);
      this.areIdentical(ids[ids.length-2], requestLogger.getIds(secret)[1]);
      this.areIdentical(ids[ids.length-3], requestLogger.getIds(secret)[2]);
      this.isTrue(null == requestLogger.get(ids[0]));
      this.isTrue('blub5' == requestLogger.get(ids[4]).data.blah);
    }
}
