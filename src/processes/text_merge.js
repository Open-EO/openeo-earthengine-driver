import { BaseProcess } from '@openeo/js-processgraphs';

export default class text_merge extends BaseProcess {

    async execute(node) {
        var data = node.getArgument('data');
        var separator = node.getArgument('separator');

        if (separator === null) {
            separator = "";
        }

        return data.join(separator);
    }

}
