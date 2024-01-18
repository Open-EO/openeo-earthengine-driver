import { BaseProcess } from '@openeo/js-processgraphs';

export default class merge_cubes extends BaseProcess {

    async execute(node) {
        var dc1 = node.getArgument("cube1");
        var dc2 = node.getArgument("cube2");
        //var overlap_res = node.getArgument("overlap_resolver");

        //var context = node.getArgument("context");

        return dc1.merge(dc2);
    }

}
