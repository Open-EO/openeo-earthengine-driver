import BitmapLike from "./bitmap.js";

export default class PngFormat extends BitmapLike {
  constructor() {
    super('PNG');
  }

  getFileExtension(/*parameters*/) {
    return '.png';
  }

  getFormatCode() {
    return 'png';
  }

}
