const validate = require('jsonschema').validate;
const Errors = require('./errors');

var ProcessUtils = {

	toImage(obj, req) {
		if (obj instanceof ee.Image) {
			return obj;
		}
		else if (obj instanceof ee.ComputedObject) {
			// ToDo: Send warning via subscriptions
			console.log("WARN: Casting to Image might be unintentional.");
			return ee.Image(obj);
		}
		else if (obj instanceof ee.ImageCollection) {
			// ToDo: Send warning via subscriptions
			console.log("WARN: Compositing the image collection to a single image.");
			return obj.mosaic();
		}
		return null;
	},
	
	toImageCollection(obj) {
		if (obj instanceof ee.ImageCollection) {
			return obj;
		}
		else if (obj instanceof ee.Image || obj instanceof ee.ComputedObject) {
			return ee.ImageCollection(obj);
		}
		return null;
	},

	isVariable(obj) {
		return (typeof obj === 'object' && typeof obj.variable_id === 'string');
	},

	validateSchema(process, args, req) {
		let paramCount = 0;
		var unsupportedArgs = Object.assign({}, args);
		delete unsupportedArgs.process_id;
		delete unsupportedArgs.process_description;
		for(let name in process.parameters) {
			delete unsupportedArgs[name];
			paramCount++;
			let param = process.parameters[name];
			// Check whether parameter is required
			if (typeof args[name] === 'undefined') {
				if (param.required) {
					return Promise.reject(new Errors.ProcessArgumentRequired({
						process: process.process_id,
						argument: name
					}));
				}
				else {
					continue; // Parameter not set, nothing to validate against
				}
			}
			
			let arg = args[name];
			// No validation (yet) as it is a variable - but could validate against the variable type (arg.type)
			if (this.isVariable(arg)) {
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
					process: process.process_id,
					argument: name,
					reason: errors.join("; ")
				}));
			}
			// ToDo: Validate dependencies
		}
		for (let name in unsupportedArgs) {
			return Promise.reject(new Errors.ProcessArgumentUnsupported({
				process: process.process_id,
				argument: name
			}));
		}
		if (typeof process.min_parameters === 'number' && process.min_parameters > paramCount) {
			return Promise.reject(new Errors.ProcessArgumentsMissing({
				process: process.process_id,
				min_parameters: process.min_parameters
			}));
		}
		return Promise.resolve(args);
	}

};

module.exports = ProcessUtils;