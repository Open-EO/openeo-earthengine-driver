export const EPSGCODE_PARAMETER = {
  type: 'integer',
  subtype: 'epsg-code', // The formats are not specification compliant, but are allowed to be added.
  description: 'EPSG Code to reproject the images to.',
  minimum: 1000,
  default: null
};

export const SIZE_PARAMETER = {
  type: 'integer',
  description: 'The size for the longest side the image, in pixels.',
  default: 1000,
  minimum: 1,
  maximum: 2000
};

export const SCALE_PARAMETER = {
  type: 'number',
  description: 'Scale of the image in meters per pixel.',
  default: 100,
  minimum: 1
};

export const NAME_PARAMETER = {
  type: 'string',
  description: 'Name of the exported assets and files, without file extension. Defaults to a random hash.',
  default: null
};

export const METADATA_PARAMETER = {
  type: 'object',
  description: 'Additional STAC metadata to be added to the exported asset(s).',
  default: {}
};

export default class FileFormat {

  constructor(title, parameters = {}, description = '') {
    this.title = title;
    this.description = description;
    this.parameters = parameters;
    this.addParameter('name', NAME_PARAMETER);
    this.addParameter('metadata', METADATA_PARAMETER);
  }

  getParameters() {
    return this.parameters;
  }

  addParameters(parameters) {
    for (const key in parameters) {
      this.addParameter(key, parameters[key]);
    }
  }

  addParameter(name, parameter) {
    this.parameters[name] = parameter;
  }

  removeParameter(name) {
    delete this.parameters[name];
  }

  getFileExtension(/*parameters*/) {
    return '';
  }

  getGisDataTypes() {
    return [];
  }

  validateParameters(/*parameters*/) {
  }

  toJSON() {
    return {
      title: this.title,
      description: this.description,
      gis_data_types: this.getGisDataTypes(),
      parameters: this.parameters
    };
  }

  preprocess(context, dc/*, logger*/) {
    return dc;
  }

  async retrieve(/*ee, dc*/) {
    throw new Error('Not implemented');
  }

  async export(/*ee, dc*/) {
    throw new Error('Not implemented');
  }

}
