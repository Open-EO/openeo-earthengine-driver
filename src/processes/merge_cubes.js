const { BaseProcess } = require('@openeo/js-processgraphs');
const Errors = require('../errors');

module.exports = class merge_cubes extends BaseProcess {

    async execute(node) {
        var dc1 = node.getArgument("cube1");
        var dc2 = node.getArgument("cube2");

        return dc1.merge(dc2);
    }

};