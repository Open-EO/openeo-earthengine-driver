import ProcessGraph from '../../processgraph/processgraph.js';
import GeeResults from '../../processes/utils/results.js';

export default async function run(config, storage, user, query, xyz) {
  // get the service
  const service = await storage.findService(query);
  // get the logger for this service
  const logger = await storage.getLogsById(service._id, service.log_level);

  try {
    const rect = storage.calculateXYZRect(...xyz);
    const context = config.processingContext(user);
    // Update user id to the user id, which stored the job.
    // See https://github.com/Open-EO/openeo-earthengine-driver/issues/19
    context.setUserId(service.user_id);

    const pg = new ProcessGraph(service.process, context, logger);
    pg.setAdditionalConstraint('load_collection', 'spatial_extent', rect);
    const resultNode = await pg.execute();
    const cube = resultNode.getResult();

    cube.setOutputFormatParameter('size', '256x256');
    cube.setSpatialExtent(rect);
    cube.setCrs(3857);
    if (!cube.getOutputFormat()) {
      cube.setOutputFormat('png');
    }

    return await GeeResults.retrieve(resultNode);
  } catch(e) {
    logger.error(e);
    throw e;
  }
}
