import { BaseProcess } from '@openeo/js-processgraphs';

export default class sd extends BaseProcess {
// ToDo processes: ignore_nodata parameter
	geeReducer() {
		return 'stdDev';
	}

	async execute() {
		throw "Not implemented yet.";
	}

}
