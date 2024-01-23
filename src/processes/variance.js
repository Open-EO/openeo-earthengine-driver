import GeeProcess from '../processgraph/process.js';

export default class variance extends GeeProcess {

	geeReducer() {
		return 'variance';
	}

	async execute() {
		throw new Error("Not implemented yet.");
	}

}
