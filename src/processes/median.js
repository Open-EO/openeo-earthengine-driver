import { BaseProcess } from '@openeo/js-processgraphs';

export default class median extends BaseProcess {

  geeReducer() {
      return 'median';
  }

	async execute() {
		throw "Not implemented yet.";
	}

}
