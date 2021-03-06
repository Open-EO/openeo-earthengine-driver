const { BaseProcess } = require('@openeo/js-processgraphs');

module.exports = class If extends BaseProcess {

    async execute(node) {
        var value = node.getArgument('value');
        var accept = node.getArgument('accept');
        var reject = node.getArgument('reject');

        return ee.Algorithms.If(value, accept, reject);
        //if (value === true) {
        //    return accept;
        //}
        //else {
        //    return reject;
        //}
    }

};