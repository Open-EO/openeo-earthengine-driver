const Process = require('../processgraph/process');

module.exports = class apply extends Process {

    async execute(node, context) {
        var dc = node.getData("data");
        var callback = node.getArgument("process");
        var process = callback.getProcess(callback.getResultNode());
        if (typeof process.geeProcess !== 'function') {
            throw new Errors.ProcessArgumentInvalid({
                process: this.schema.id,
                argument: 'process',
                reason: 'The specified process is invalid.'
            });
        }
        var resultNode = this.simpleApply(dc, process.geeProcess(), process.id);
        dc = resultNode.getResult();
        return dc;
    }

    //TODO
    /*
    complexApply(dc, applyFunc, applyName=null) {
        if (!dc.isImageCollection() && !dc.isImage()) {
            throw new Error("Calculating " + applyName + " not supported for given data type.");
        }

        dc.imageCollection(data => data.map(applyFunc));
        return dc;
    }*/

    simpleApply(dc, applyFunc, applyName=null) {
        if (!dc.isImageCollection() && !dc.isImage()) {
            throw new Error("Calculating " + applyName + " not supported for given data type.");
        }

        dc.imageCollection(data => data.map(applyFunc));
        return dc;
    }

};