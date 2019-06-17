const Process = require('../processgraph/process');

module.exports = class apply_dimension extends Process {

    async execute(node, context) {
        var dc = node.getData("data");
        var dimension = node.getArgument("dimension"); //TODO: default value should be returned, not undefined
        if ((dimension !== null) && (dimension !== undefined)) {
            var temporalDimension = dc.getDimension(dimension);
            if (temporalDimension.type !== 'temporal') {
                throw new Errors.ProcessArgumentInvalid({
                    process: this.schema.id,
                    argument: 'dimension',
                    reason: 'GEE can only apply a process on the temporal dimension at the moment.'
                });
            }
        }
        else{
            dimension = null;  //TODO: can be removed as soon as the default value is available
        }
        var callback = node.getArgument("process");
        var resultNode = await callback.execute({
            data: dc,
            dimension: dimension
        });
        dc = resultNode.getResult();
        return dc;
    }

};