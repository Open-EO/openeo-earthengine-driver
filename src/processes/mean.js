import GeeProcess from '../processgraph/process.js';

export default class mean extends GeeProcess {

  geeReducer() {
    return 'mean';
  }

  async execute() {
    throw new Error("Not implemented yet.");
  }

}
