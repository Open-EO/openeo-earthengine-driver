const Process = require('../processgraph/process');

module.exports = class apply extends Process {

    async execute(node, context) {
        var dc = node.getData("data");
        var callback = node.getArgument("process");
        var resultNode = await callback.execute({x: dc});
        dc = resultNode.getResult();
        return dc;
    }

};