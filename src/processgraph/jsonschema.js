const { JsonSchemaValidator } = require('@openeo/js-commons');

module.exports = class GeeJsonSchemaValidator extends JsonSchemaValidator {

	constructor(context = null) {
		super();
		this.setContext(context);
	}

	setContext(context) {
		this.context = context;
	}

	validateCollectionId(data) {
		if (this.context.getCollection(data) === null) {
			throw new ajv.ValidationError([{
				message: "Collection doesn't exist."
			}]);
		}
		return true;
	}
	
	async validateJobId() {
		var job = await this.context.getJob(data);
		if (job === null) {
			throw new ajv.ValidationError([{
				message: "Job doesn't exist."
			}]);
		}
		return true;
	}
	
	validateOutputFormat(data) {
		if (!this.context.server().isValidOutputFormat(data)) {
			throw new ajv.ValidationError([{
				message: "Output format not supported."
			}]);
		}
		return true;
	}
	
	async validateProcessGraphId() {
		var pg = await this.context.getStoredProcessGraph(data);
		if (pg === null) {
			throw new ajv.ValidationError([{
				message: "Stored process graph doesn't exist."
			}]);
		}
		return true;
	}

}