const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class round extends Process {

    process(data, p=null){
        if(p===null){
            return data.round();
        }
        else{
            var scaleFactor = 10**p;
            return data.multiply(scaleFactor).round().divide(scaleFactor);
        }

    }

    async execute(node, context) {
        var p = node.getArgument("p");
        var process = data => this.process(data, p);
        return Commons.applyInCallback(node, process, process);
    }

};