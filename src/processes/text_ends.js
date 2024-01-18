import { BaseProcess } from '@openeo/js-processgraphs';

export default class text_ends extends BaseProcess {

    async execute(node) {
        var data = node.getArgument('data');
        var pattern = node.getArgument('pattern');
        var case_sensitive = node.getArgument('case_sensitive');
        if (!case_sensitive) {
            data = data.toLowerCase();
            pattern = pattern.toLowerCase();
        }

        var dc = node.getDataCube('data');
        dc.setData(data.endsWith(pattern));
        return dc;
    }

}
