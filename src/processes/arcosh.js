import { BaseProcess } from '@openeo/js-processgraphs';
import Commons from '../processgraph/commons.js';

export default class arcosh extends BaseProcess {

  async execute(node) {
    return Commons.applyInCallback(
      node,
      image => {
        // Using arcosh formula for calculation (see wikipedia)
        let img_p2 = image.pow(2);
        img_p2 = img_p2.subtract(1);
        img_p2 = img_p2.sqrt();
        const result = image.add(img_p2);
        return result.log();
      },
      x => Math.acosh(x)
    );
  }

}
