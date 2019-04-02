const JsonSchemaValidator = require('./jsonschema');
const Errors = require('../errors');

module.exports = class Process {

	constructor(schema) {
		this.schema = schema;
		this.jsonSchema = new JsonSchemaValidator();
	}

	async validate(node, context) {
		// Check for arguments we don't support and throw error
		var unsupportedArgs = node.getArgumentNames().filter(name => (typeof this.schema.parameters[name] === 'undefined'));
		if (unsupportedArgs.length > 0) {
			throw new Errors.ProcessArgumentUnsupported({
				process: this.schema.id,
				argument: unsupportedArgs[0]
			});
		}

		// Validate against JSON Schema
		this.jsonSchema.setContext(context);
		for(let name in this.schema.parameters) {
			let param = this.schema.parameters[name];
			// Check whether parameter is required
			let arg = node.getArgument(name, undefined, false);
			if (typeof arg === 'undefined') {
				if (param.required) {
					throw new Errors.ProcessArgumentRequired({
						process: this.schema.id,
						argument: name
					});
				}
				else {
					continue; // Parameter not set, nothing to validate against
				}
			}

			// Validate against JSON schema
			let errors = await this.jsonSchema.validateJson(arg, param.schema);
			if (errors.length > 0) {
				throw new Errors.ProcessArgumentInvalid({
					process: this.schema.id,
					argument: name,
					reason: errors.join("; ")
				});
			}
		}
		return node;
	}

	async execute(node, context) {
		throw "execute not implemented yet";
	}

	test() {
		// Run the tests from the examples
		throw "test not implemented yet";
	}

	isParameterCompatibleTo(param, schema) {
		throw "isParameterCompatibleTo not implemented yet";
	}

}