import GeeProcessing from '../processes/utils/processing.js';
import GeeTypes from '../processes/utils/types.js';
import HttpUtils from '../utils/http.js';
import StringStream from '../utils/stringstream.js';
import FileFormat from './fileformat.js';

export default class JsonFormat extends FileFormat {
  constructor() {
    super('JSON');
  }

  getFileExtension(/*parameters*/) {
    return '.json';
  }

  getGisDataTypes() {
    return ['vector', 'table', 'other'];
  }

  async retrieve(ee, dc) {
    let data = dc.getData();
    if (typeof data === 'undefined' || data === null) {
      throw new Error.DataCubeEmpty();
    }
    if (GeeTypes.isEarthEngineType(ee, data, true)) {
      data = await GeeProcessing.evaluate(data);
    }
    const stream = new StringStream(JSON.stringify(data));
    return HttpUtils.createResponse(stream, {'content-type': 'application/json'});
  }

}
