const { BaseProcess } = require('@openeo/js-processgraphs');

module.exports = class pi extends BaseProcess {

    async execute(node) {
        var dc = node.getData('data');
        dc.data = Math.PI;
        return dc;
    }
};