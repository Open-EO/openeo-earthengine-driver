import GeeTypes from './types.js';
import HttpUtils from '../../utils/http.js';

const GeeResults = {

	toImageOrCollection(ee, logger, data, allowMultiple = false) {
		const eeData = GeeTypes.toEE(ee, logger, data);
		if (eeData instanceof ee.Image) {
			return eeData;
		}
		else if (eeData instanceof ee.ImageCollection) {
			if (allowMultiple) {
				return eeData;
			}
			else {
				logger.warn("Compositing the image collection to a single image using `ee.Image.mosaic()`.");
				return data.mosaic();
			}
		}
		else if (eeData instanceof ee.Number || eeData instanceof ee.Array) {
			return ee.Image(eeData);
		}
		else {
			const eeType = GeeTypes.getEarthEngineType(ee, data);
			throw new Error(`Can't convert ${eeType} to ImageCollection or Image.`);
		}
	},

	getFileExtension(dc, config) {
		const format = dc.getOutputFormat();
		const parameters = dc.getOutputFormatParameters();
		const formatSpec = config.outputFormats[format];
		let ext;
		if (formatSpec) {
			ext = formatSpec.getFileExtension(parameters);
		}
		return ext || '';
	},

	// Returns AxiosResponse (object) or URL (string)
	async retrieve(context, dc, logger) {
		const ee = context.ee;
		const config = context.server();

		const format = config.getOutputFormat(dc.getOutputFormat());
		dc = format.preprocess(context, dc, logger);

		let response = await format.retrieve(ee, dc);
		if (typeof response === 'string') {
			logger.debug("Downloading data from Google: " + response);
			response = await HttpUtils.stream(response);
		}

		return response;
	}

};

export default GeeResults;
