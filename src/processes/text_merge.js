import { BaseProcess } from '@openeo/js-processgraphs';

export default class text_merge extends BaseProcess {

  async execute(node) {
    const data = node.getArgument('data');
    let separator = node.getArgument('separator');

    if (separator === null) {
      separator = "";
    }

    return data.join(separator);
  }

}
