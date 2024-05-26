import fse from 'fs-extra';
import path from 'path';
import ProcessGraph from '../../processgraph/processgraph.js';
import GeeResults from '../../processes/utils/results.js';
import Utils from '../../utils/utils.js';

export default async function run(config, storage, user, query) {
  // get the job
  const job = await storage.findJob(query);
  // get the logger for this job
  const logger = await storage.getLogsById(job._id, job.log_level);

  try {
    // clean-up previous results and logs
    const promises = [];
    promises.push(storage.removeResults(job._id, false));
    promises.push(logger.clear());
    await Promise.all(promises);

    logger.info("Starting batch job");
    await storage.updateJobStatus(query, 'running');

    const context = config.processingContext(user);
    const pg = new ProcessGraph(job.process, context, logger);
    const resultNode = await pg.execute();

    const response = await GeeResults.retrieve(resultNode, false);
    // todo: implement exporting multiple images
    // const response = await GeeResults.retrieve(resultNode, true);

    const filePath = storage.getJobFile(job._id, String(Utils.generateHash()) + GeeResults.getFileExtension(resultNode));
    logger.debug("Storing result to: " + filePath);
    await fse.ensureDir(path.dirname(filePath));
    await new Promise((resolve, reject) => {
      const writer = fse.createWriteStream(filePath);
      response.data.pipe(writer);
      writer.on('error', reject);
      writer.on('close', resolve);
    });

    logger.info("Finished");
    storage.updateJobStatus(query, 'finished');
  } catch(e) {
    logger.error(e);
    storage.updateJobStatus(query, 'error');
    throw e;
  }
}
