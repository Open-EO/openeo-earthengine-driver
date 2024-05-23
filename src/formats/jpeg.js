import BitmapLike from "./bitmap.js";

export default class JpegFormat extends BitmapLike {
  constructor() {
    super('JPEG');
  }

  getFileExtension(/*parameters*/) {
    return '.jpg';
  }

  getFormatCode() {
    return 'jpg';
  }

}
