import { BaseProcess } from '@openeo/js-processgraphs';

export default class mean extends BaseProcess {

    geeReducer() {
        return 'mean';
    }

	async execute() {
		throw "Not implemented yet.";
	}

}
