import Utils from '../../utils/utils.js';
import GeeProcessing from './processing.js';
import GeeTypes from './types.js';

const GeeResults = {

	BATCH: 1,
	SYNC: 2,
	SERVICE: 3,

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

	async exportToDrive(ee, dc, job, fileFormat, formatOptions) {
		const parameters = dc.getOutputFormatParameters();

		let region = null;
		let crs = null;
		if (dc.hasXY()) {
			region = Utils.bboxToGeoJson(dc.getSpatialExtent());
			crs = Utils.crsToString(dc.getCrs());
		}

    const data = ee.ImageCollection(dc.getData());
    const imageList = data.toList(data.size());
    const imgCount = await GeeProcessing.evaluate(imageList.size());
    const tasks = [];
    for (let i = 0; i < imgCount; i++) {
      let taskId = null;
      let error = null;
      let imageId;
      try {
        const image = ee.Image(imageList.get(i));
        imageId = await GeeProcessing.evaluate(image.id());

        let crsTransform, scale;
        if (parameters.scale > 0) {
          scale = parameters.scale;
        }
        else {
          const projection = await GeeProcessing.evaluate(image.projection());
          crsTransform = projection.transform;
        }

        const task = ee.batch.Export.image.toDrive({
          image,
          description: job.title,
          folder: 'gee-' + job._id,
          fileNamePrefix: imageId,
          skipEmptyTiles: true,
          crs,
          crsTransform,
          region,
          scale,
          fileFormat,
          formatOptions
        });
        taskId = await new Promise((resolve, reject) => {
          task.start(
            () => resolve(task.id),
            (message) => reject(new Error(message))
          )
        });
      } catch (e) {
        error = e.message;
      } finally {
        tasks.push({
          taskId,
          imageId,
          error
        });
      }
    }
		return tasks;
	}

};

export default GeeResults;
