import { BaseProcess } from '@openeo/js-processgraphs';

export default class dimension_labels extends BaseProcess {

    async execute(node) {
        var dc = node.getArgument('data');
        var dimensionName = node.getArgument('dimension');
        var dimension = dc.getDimension(dimensionName);

        return Array.from(dimension.values);
    }

}
