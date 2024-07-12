import path from 'path';
import Logs from '../../models/logs.js';
import ProcessGraph from '../../processgraph/processgraph.js';
import GeeResults from '../../processes/utils/results.js';
import API from '../../utils/API.js';

export default async function run(config, user, id, process, log_level) {
  const logger = await getResultLogs(user._id, id, log_level);
  logger.debug("Starting to process request");

  const context = config.processingContext(user);
  const pg = new ProcessGraph(process, context, logger);
  pg.allowUndefinedParameters(false);
  const errorList = await pg.validate(false);
  if (errorList.count() > 0) {
    errorList.getAll().forEach(error => logger.error(error));
    throw errorList.first();
  }
  else {
    logger.info("Validated without errors");
  }

  logger.debug("Executing processes");
  const resultNode = await pg.execute();
  if (pg.getResults().length > 1) {
    logger.warn("Multiple results can't be processed in synchronous mode. Only the result from the result node will be returned.");
  }
  return await GeeResults.retrieve(context, resultNode.getResult(), logger);
}

export async function getResultLogs(user_id, id, log_level) {
  const file = path.normalize(path.join('./storage/user_files/', user_id, 'sync_logs' , id + '.logs.db'));
  const logs = new Logs(file, API.getUrl('/result/logs/' + id), log_level);
  await logs.init();
  return logs;
}
