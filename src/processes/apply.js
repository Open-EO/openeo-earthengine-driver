const Process = require('../processgraph/process');
const Errors = require('../errors');

module.exports = class apply extends Process {

    async execute(node, context) {
        var dc = node.getData("data");
        var callback = node.getArgument("process");
        // TODO: there is for sure a better way to do this
        // TODO: outsource it to commons.js
        var arg_dict = null;
        if(callback.resultNode.arguments.hasOwnProperty('x')){
            arg_dict = {x: dc};
        }
        else{  // this assumes that the argument names have been checked before
            arg_dict = {data: dc};
        }

        var resultNode = await callback.execute(arg_dict);
        dc = resultNode.getResult();
        return dc;
    }

};