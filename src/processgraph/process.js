const GeeJsonSchemaValidator = require('./jsonschema');
const { BaseProcess } = require('@openeo/js-processgraphs');

module.exports = class Process extends BaseProcess {

	constructor(schema) {
		super(schema, new GeeJsonSchemaValidator());
	}

	async validate(node, context) {
		this.jsonSchema.setContext(context);
		return await super.validate(node);
	}

	async execute(node, context) {
		return await super.execute(node);
	}

}