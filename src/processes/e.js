const { BaseProcess } = require('@openeo/js-processgraphs');

module.exports = class e extends BaseProcess {

    async execute(node) {
        var dc = node.getData('data');
        dc.setData(Math.E);
        return dc;
    }
};