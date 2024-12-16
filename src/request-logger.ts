
export interface RequestLogEntry {
  id: string;
  data: any;
}

export class RequestLogger {
  constructor(length: number) {
    this._ringbuffer = new Array<RequestLogEntry>(length);
  }

  public get(id: string): RequestLogEntry {
    return this._ringbuffer.filter(x => x.id === id)[0];
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

  _ringbuffer: RequestLogEntry[];
  _current = 0;
  _idCounter = 0;
}