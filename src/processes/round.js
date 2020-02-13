const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class round extends BaseProcess {

    process(data, p=null){
        if(p===null){
            return data.round();
        }
        else{
            var scaleFactor = 10**p;
            return data.multiply(scaleFactor).round().divide(scaleFactor);
        }

    }

    async execute(node) {
        var p = node.getArgument("p");
        var process = data => this.process(data, p);
        return Commons.applyInCallback(node, process, process);
    }

};