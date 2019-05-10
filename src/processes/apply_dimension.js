const Process = require('../processgraph/process');

module.exports = class apply_dimension extends Process {

    async execute(node, context) {
        var dc = node.getData("data");
        var dimension = node.getArgument("dimension");
        var callback = node.getArgument("process");
        var resultNode = await callback.execute({
            data: dc,
            dimension: dimension
        });
        dc = resultNode.getResult();
        return dc;
    }

};