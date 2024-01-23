import GeeProcess from '../processgraph/process.js';

export default class sd extends GeeProcess {
	// ToDo processes: ignore_nodata parameter
	geeReducer() {
		return 'stdDev';
	}

	async execute() {
		throw new Error("Not implemented yet.");
	}

}
