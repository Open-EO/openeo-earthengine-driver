import { JsonSchemaValidator } from '@openeo/js-processgraphs';
import ajv from 'ajv';

export default class GeeJsonSchemaValidator extends JsonSchemaValidator {

	constructor(context) {
		super();
		this.context = context;
	}

	async validateCollectionId(data) {
		if (this.context.getCollection(data) === null) {
			throw new ajv.ValidationError([{
				message: "Collection doesn't exist."
			}]);
		}
		return true;
	}

	async validateJobId(data) {
		const job = await this.context.getJob(data);
		if (job === null) {
			throw new ajv.ValidationError([{
				message: "Job doesn't exist."
			}]);
		}
		return true;
	}

	async validateOutputFormat(data) {
		if (!this.context.server().getOutputFormat(data)) {
			throw new ajv.ValidationError([{
				message: "Output format '" + data + "' not supported."
			}]);
		}
		return true;
	}

	async validateInputFormat(data) {
		if (!this.context.server().getInputFormat(data)) {
			throw new ajv.ValidationError([{
				message: "Input format  '" + data + "' not supported."
			}]);
		}
		return true;
	}

	async validateProcessGraphId(data) {
		const pg = await this.context.getStoredProcessGraph(data);
		if (pg === null) {
			throw new ajv.ValidationError([{
				message: "Stored process graph doesn't exist."
			}]);
		}
		return true;
	}

}
