import { BaseProcess } from '@openeo/js-processgraphs';

export default class variance extends BaseProcess {

	geeReducer() {
		return 'variance';
	}

	async execute() {
		throw new Error("Not implemented yet.");
	}

}
