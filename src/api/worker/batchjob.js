import fse from 'fs-extra';
import path from 'path';
import ProcessGraph from '../../processgraph/processgraph.js';
import GeeResults from '../../processes/utils/results.js';
import Utils from '../../utils/utils.js';
import GTiff from '../../utils/gtiff.js';
import sizeOf from "image-size";
const packageInfo = Utils.require('../../package.json');

export default async function run(config, storage, user, query) {
  // get the job
  const job = await storage.findJob(query);
  // get the logger for this job
  const logger = await storage.getLogsById(job._id, job.log_level);

  try {
    // clean-up previous results and logs
    const cleanupTasks = [];
    cleanupTasks.push(storage.removeResults(job._id, false));
    cleanupTasks.push(logger.clear());
    await Promise.all(cleanupTasks);

    logger.info("Starting batch job");
    await storage.updateJobStatus(query, 'running');

    const context = config.processingContext(user);
    const pg = new ProcessGraph(job.process, context, logger);
    await pg.execute();

    const computeTasks = pg.getResults().map(async (datacube) => {
      const response = await GeeResults.retrieve(context, datacube, logger);
      const params = datacube.getOutputFormatParameters();
      const filename = (params.name || String(Utils.generateHash())) + GeeResults.getFileExtension(datacube, config);
      const filepath = storage.getJobFile(job._id, filename);
      logger.debug("Storing result to: " + filepath);
      await fse.ensureDir(path.dirname(filepath));
      await new Promise((resolve, reject) => {
        const writer = fse.createWriteStream(filepath);
        response.data.pipe(writer);
        writer.on('error', reject);
        writer.on('close', resolve);
      });
      return { filepath, datacube };
    });

    await Promise.all(computeTasks);

    const results = [];
    for (const task of computeTasks) {
      results.push(await task);
    }

    const item = await createSTAC(storage, job, results);
    const stacpath = storage.getJobFile(job._id, 'stac.json');
    await fse.writeJSON(stacpath, item, {spaces: 2});

    logger.info("Finished");
    storage.updateJobStatus(query, 'finished');
  } catch(e) {
    logger.error(e);
    storage.updateJobStatus(query, 'error');
    throw e;
  }
}

async function createSTAC(storage, job, results) {
  const folder = storage.getJobFolder(job._id);
  const logpath = storage.getJobFile(job._id, storage.logFileName);
  const links = [
    {
      href: path.relative(folder, logpath),
      rel: 'monitor',
      type: 'application/x-ndjson',
      title: 'Batch Job Log File'
    }
  ];

  const assets = {};
  let startTime = null;
  let endTime = null;
  const extents = [];
  const datetimes = [];
  const stac_extensions = [
    "https://stac-extensions.github.io/file/v2.0.0/schema.json",
    "https://stac-extensions.github.io/datacube/v2.1.0/schema.json"
  ];
  for(const { filepath, datacube } of results) {
    const params = datacube.getOutputFormatParameters();
    const { name: key } = path.parse(filepath);
    const stat = await fse.stat(filepath);
    const mediaType = Utils.extensionToMediaType(filepath);
    let geotiffImage = null;
    if (mediaType.startsWith("image/tiff; application=geotiff")) {
      geotiffImage = await GTiff.load(filepath);
    }
    let asset = {
      href: path.relative(folder, filepath),
      roles: ["data"],
      type: mediaType,
      title: key,
      "file:size": stat.size,
      created: stat.birthtime,
      updated: stat.mtime
    };
    if (params.datetime !== null) {
      datetimes.push(params.datetime);
      asset.datetime = params.datetime;
    }
    if (mediaType.startsWith("image/")) {
      try {
        const dim = await sizeOf(filepath);
        asset["proj:shape"] = [dim.height, dim.width];
      } catch(e) {
        console.error(e);
      }
    }

    if (datacube.hasT()) {
      const t = datacube.dimT();
      const min = t.min();
      const max = t.max();
      if (min !== null && max !== null) {
        if (min < startTime || startTime === null) {
          startTime = min;
        }
        if (max > endTime || endTime === null) {
          endTime = max;
        }
      }
    }

    if (datacube.hasXY()) {
      stac_extensions.push("https://stac-extensions.github.io/projection/v1.1.0/schema.json");
      const crs = datacube.getCrs();
      const extent = datacube.getSpatialExtent();
      let wgs84Extent = extent;
      asset["proj:epsg"] = crs;
      if (geotiffImage) {
        const transform = GTiff.getGeoTransform(geotiffImage);
        if (transform) {
          asset["proj:transform"] = transform;
        }
      }
      if (crs !== 4326) {
        asset["proj:bbox"] = [
          extent.west, extent.south, extent.east, extent.north
        ];
        wgs84Extent = Utils.projExtent(extent, 4326);
      }
      // Check the coordinates with a delta of 0.0001 or so
      const exists = extents.find(e => Utils.equals(e, wgs84Extent));
      if (!exists) {
        extents.push(wgs84Extent);
      }
    }

    if (datacube.hasBands()) {
      const bands = datacube.getBands();
      if (geotiffImage) {
        stac_extensions.push("https://stac-extensions.github.io/raster/v1.1.0/schema.json");
        asset["raster:bands"] = await GTiff.getBands(geotiffImage, bands);
      }
      asset["eo:bands"] = bands.map(band => {
        return {
          name: band
        };
      });
    }

    const cube = datacube.toJSON();
    assets[key] = Object.assign(asset, cube, params.metadata);
  }
  const item = {
    stac_version: packageInfo.stac_version,
    stac_extensions,
    id: job._id,
    type: "Feature",
    geometry: null,
    properties: {
      datetime: null,
      created: job.created,
      updated: job.updated,
    },
    assets: assets,
    links: links
  };

  datetimes.sort();
  if (startTime ? !endTime : endTime) {
    item.properties.datetime = startTime || endTime;
  }
  else {
    if (startTime) {
      item.properties.start_datetime = startTime;
    }
    else {
      item.properties.start_datetime = datetimes[0];
    }
    if (endTime) {
      item.properties.end_datetime = endTime;
    }
    else {
      item.properties.end_datetime = datetimes[datetimes.length - 1];
    }
  }
  if (!item.properties.datetime) {
    item.properties.datetime = item.properties.start_datetime || item.properties.end_datetime;
  }
  if (item.properties.start_datetime === item.properties.end_datetime) {
    delete item.properties.start_datetime;
    delete item.properties.end_datetime;
  }

  if (extents.length > 0) {
    if (extents.length === 1) {
      item.geometry = Utils.bboxToGeoJson(extents[0]);
      delete item.geometry.geodesic;
      delete item.geometry.crs;
    }
    else {
      item.geometry = {
        "type": "MultiPolygon",
        "coordinates": extents.map(extent => Utils.bboxToGeoJson(extent).coordinates)
      };
    }
    item.bbox = Utils.geoJsonBbox(item.geometry, true);
  }

  if (job.title) {
    item.properties.title = job.title;
  }
  if (job.description) {
    item.properties.description = job.description;
  }

  return item;
}
