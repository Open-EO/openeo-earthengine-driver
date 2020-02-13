const { BaseProcess } = require('@openeo/js-processgraphs');

module.exports = class apply extends BaseProcess {

    async execute(node) {
        var dc = node.getData("data");
        var callback = node.getArgument("process");
        var resultNode = await callback.execute({x: dc});
        dc = resultNode.getResult();
        return dc;
    }

};