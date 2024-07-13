import fse from 'fs-extra';
import path from 'path';
import ProcessGraph from '../../processgraph/processgraph.js';
import GeeResults from '../../processes/utils/results.js';
import Utils from '../../utils/utils.js';
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
  for(const { filepath, datacube } of results) {
    const filename = path.basename(filepath);
    const stat = await fse.stat(filepath);
    let asset = {
      href: path.relative(folder, filepath),
      roles: ["data"],
      type: Utils.extensionToMediaType(filepath),
      title: filename,
      "file:size": stat.size,
      created: stat.birthtime,
      updated: stat.mtime
    };

    if (datacube.hasT()) {
      const t = datacube.dimT();
      const extent = t.getExtent();
      if (extent) {
        if (extent[0] < startTime || startTime === null) {
          startTime = extent[0];
        }
        if (extent[1] > endTime || endTime === null) {
          endTime = extent[1];
        }
      }
    }

    if (datacube.hasXY()) {
      const crs = datacube.getCrs();
      const extent = datacube.getSpatialExtent();
      let wgs84Extent = extent;
      if (crs !== 4326) {
        asset["proj:epsg"] = crs;
        asset["proj:geometry"] = extent;
        wgs84Extent = Utils.projExtent(extent, 4326);
      }
      // Check the coordinates with a delta of 0.0001 or so
      const exists = extents.find(e => Utils.equals(e, wgs84Extent));
      if (!exists) {
        extents.push(wgs84Extent);
      }
    }

    const params = datacube.getOutputFormatParameters();
    assets[filename] = Object.assign(asset, params.metadata);
  }
  const item = {
    stac_version: packageInfo.stac_version,
    stac_extensions: [
      "https://stac-extensions.github.io/file/v2.0.0/schema.json",
    ],
    id: job._id,
    type: "Feature",
    geometry: null,
    properties: {
      datetime: null,
      created: job.created,
      updated: job.updated
    },
    assets: assets,
    links: links
  };

  if (startTime ? !endTime : endTime) {
    item.properties.datetime = startTime || endTime;
  }
  else {
    if (startTime) {
      item.properties.start_datetime = startTime;
    }
    if (endTime) {
      item.properties.end_datetime = endTime;
    }
  }

  if (extents.length > 0) {
    if (extents.length === 1) {
      item.geometry = Utils.bboxToGeoJson(extents[0]);
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
