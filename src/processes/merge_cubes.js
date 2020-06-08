const { BaseProcess } = require('@openeo/js-processgraphs');
const Errors = require('../errors');

module.exports = class merge_cubes extends BaseProcess {

    async execute(node) {
        var dc1 = node.getArgument("cube1");
        var dc2 = node.getArgument("cube2");
        var overlap_res = node.getArgument("overlap_resolver");

        var context = node.getArgument("context");

        return dc1.merge(dc2, overlap_res, true, context);
    }

};