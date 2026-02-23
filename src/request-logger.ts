
export interface RequestLogEntry {
  id: string;
  data: any;
}

export class RequestLogger {
  constructor(length: number) {
    this._ringbuffer = new Array<RequestLogEntry>(length);
    this._secret = this.newId('asdf-'+(Math.random()*1e12).toString(36)+'-');
  }

  public get(id: string): RequestLogEntry {
    return this._ringbuffer.filter(x => x.id === id)[0];
  }

  public getIds(secret: string): string[] {
    let result = [] as string[];
    if (secret == this._secret) {
      const buf = this._ringbuffer;
      const length = buf.length;
      const start = this._current;
      let idx = start + length - 1;
      while (idx >= start) {
        const thisOne = buf[idx % length];
        if (null != thisOne && null != thisOne.id) {
          result.push(thisOne.id);
        }
        --idx;
      }
    }
    return result;
  }

  public add(data: any): string {
    var entry: RequestLogEntry = {
      id: this.newId(),
      data
    };
    this._ringbuffer[this._current] = entry;
    this._current = (this._current + 1) % this._ringbuffer.length;

    return entry.id;
  }

  private newId(prefix: string = 'r') {
    return prefix+(this._idCounter++) + (Math.random()*1e8).toString(36);
  }

  _secret: string;
  _ringbuffer: RequestLogEntry[];
  _current = 0;
  _idCounter = 0;
}