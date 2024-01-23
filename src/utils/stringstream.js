import { Readable } from 'stream'

export default class StringStream extends Readable {

  constructor(str) {
    super();
    this.str = str;
    this.sent = false;
  }

  _read() {
    if (!this.sent) {
      this.push(Buffer.from(this.str));
      this.sent = true;
    }
    else {
      this.push(null);
    }
  }
}
