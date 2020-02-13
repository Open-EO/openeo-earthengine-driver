const { BaseProcess } = require('@openeo/js-processgraphs');

module.exports = class e extends BaseProcess {

    async execute(node) {
        var dc = node.getData('data');
        dc.data = Math.E;
        return dc;
    }
};