import { BaseProcess } from '@openeo/js-processgraphs';
import Utils from '../utils/utils.js';

export default class GeeProcess extends BaseProcess {

	constructor(spec, async = false) {
    super(spec);
		this.async = async;
	}

	toJSON() {
		return Utils.omitFromObject(super.toJSON(), ["executeSync", "async"]);
	}

	async execute(node) {
		return this.executeSync(node);
	}

	executeSync(/*node*/) {
		throw new Error(`Synchronous execution not available for process '${this.id}' (namespace: ${this.namespace || 'n/a'})`);
	}

}
