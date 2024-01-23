import GeeProcess from '../processgraph/process.js';

export default class median extends GeeProcess {

  geeReducer() {
    return 'median';
  }

  async execute() {
    throw new Error("Not implemented yet.");
  }

}
