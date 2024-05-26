import GeeTypes from './types.js';
import Errors from '../../utils/errors.js';
import HttpUtils from '../../utils/http.js';

const GeeResults = {

	toImageOrCollection(node, data, allowMultiple = false) {
		const ee = node.ee;
		const eeData = GeeTypes.toEE(node, data);
		if (eeData instanceof ee.Image) {
			return eeData;
		}
		else if (eeData instanceof ee.ImageCollection) {
			if (allowMultiple) {
				return eeData;
			}
			else {
				node.getLogger().warn("Compositing the image collection to a single image using `ee.Image.mosaic()`.");
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

	getFileExtension(node) {
		const config = node.getServerContext();
		const dc = node.getResult();
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
	async retrieve(node) {
		const logger = node.getLogger();
		let dc = node.getResult();
		const config = node.getServerContext();

		const formatName = dc.getOutputFormat();
		const format = config.getOutputFormat(formatName);
		if (!format) {
			throw new Errors.FileTypeInvalid({
				type: formatName,
				types: Object.keys(config.outputFormats)
			});
		}

		dc = format.preprocess(node);

		let response = await format.retrieve(node.ee, dc);
		if (typeof response === 'string') {
			logger.debug("Downloading data from Google: " + response);
			response = await HttpUtils.stream(response);
		}

		return response;
	}

};

export default GeeResults;
