const validate = require('jsonschema').validate;
const Errors = require('../errors');

module.exports = class Process {

	constructor(schema) {
		this.schema = schema;
	}

	validate(args, context) {
		return this.validateSchema(args, context);
	}

	execute(args, context) {
		throw "Not implemented yet";
	}

	test() {
		// Run the tests from the examples
		throw "Not implemented yet";
	}

	isParameterCompatibleTo(param, schema) {
		throw "Not implemented yet";
	}

	validateSchema(args, context) {
		var unsupportedArgs = Object.assign({}, args);
		delete unsupportedArgs.process_id;
		delete unsupportedArgs.process_description;
		for(let name in this.schema.parameters) {
			delete unsupportedArgs[name];
			let param = this.schema.parameters[name];
			// Check whether parameter is required
			if (typeof args[name] === 'undefined') {
				if (param.required) {
					return Promise.reject(new Errors.ProcessArgumentRequired({
						process: this.schema.id,
						argument: name
					}));
				}
				else {
					continue; // Parameter not set, nothing to validate against
				}
			}
			
			let arg = args[name];
			// No validation (yet) as it is a variable - but could validate against the variable type (arg.type)
			// ToDo: Use getType() ?
			if (typeof arg === 'object' && arg !== null && arg.hasOwnProperty("variable_id")) {
				continue;
			}
			// Validate against JSON schema
			let result = validate(arg, param.schema);
			if (!result.valid) {
				var errors = [];
				for (let i in result.errors) {
					errors.push(result.errors[i].stack);
				}
				return Promise.reject(new Errors.ProcessArgumentInvalid({
					process: this.schema.id,
					argument: name,
					reason: errors.join("; ")
				}));
			}
		}
		for (let name in unsupportedArgs) {
			return Promise.reject(new Errors.ProcessArgumentUnsupported({
				process: this.schema.id,
				argument: name
			}));
		}
		return Promise.resolve(args);
	}

}