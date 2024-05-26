import GeeProcess from '../processgraph/process.js';

export default class apply_kernel extends GeeProcess {

  async execute(node) {
    const ee = node.ee;
    const dc = node.getDataCubeWithEE("data");
    const kernel = node.getArgument("kernel");
    const factor = node.getArgumentAsNumberEE("factor", 1);
    // todo: implement additional arguments
    // const border = node.getArgument("border", 0);
    // const replaceInvalid = node.getArgument("replace_invalid", 0);

    const eeKernel = ee.Kernel.fixed({ weights: kernel });
    const kernelFunc = img => img.convolve(eeKernel).multiply(factor);

    let data = dc.getData();
    if (data instanceof ee.ImageCollection) {
      data = data.map(kernelFunc);
    }
    else if (data instanceof ee.Image) {
      data = kernelFunc(data);
    }

    return dc.setData(data);
  }

}
