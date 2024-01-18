import { BaseProcess } from '@openeo/js-processgraphs';

export default class mean extends BaseProcess {

  geeReducer() {
    return 'mean';
  }

  async execute() {
    throw new Error("Not implemented yet.");
  }

}
