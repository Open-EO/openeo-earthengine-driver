const { BaseProcess } = require('@openeo/js-processgraphs');

module.exports = class text_contains extends BaseProcess {

    async execute(node) {
        var data = node.getArgument('data');
        var pattern = node.getArgument('pattern');
        var case_sensitive = node.getArgument('case_sensitive');
        if (!case_sensitive) {
            data = data.toLowerCase();
            pattern = pattern.toLowerCase();
        }

        var dc = node.getDataCube('data');
        dc.setData(data.includes(pattern));
        return dc;
    }

};