const openeo_errors = require('../storage/errors/errors.json');
const custom_errors = require('../storage/errors/custom.json');
const restify_errors = require('restify-errors');
const Utils = require('./utils');

const errors = Object.assign(openeo_errors, custom_errors);

for(var name in errors) {
	restify_errors.makeConstructor(name, {
		restCode: errors[name].code,
		statusCode: errors[name].http,
		message: errors[name].message,
		id: (new Date()).getTime().toString(),
		originalError: null,
		url: "https://open-eo.github.io/openeo-api/errors/#openeo-error-codes",
		toJSON() {
			// ToDo: Remove console logging once this is a bit more stable
			if (global.server.config.debug) {
				if (this.originalError !== null) {
					console.log(this.originalError);
				}
				else {
					console.log(this);
				}
			}
			let message = this.message;
			for(var placeholder in this.info) {
				message = message.replace('{' + placeholder + '}', this.info[placeholder]);
			}
			return {
				id: this.id,
				code: this.restCode,
				message: message,
				url: this.url
			}
		}
	});

	var old = restify_errors[name].prototype;
	restify_errors[name] = function(obj, args = {}) {
		if (obj instanceof Error) {
			this.originalError = obj;
			if (!args.message) {
				args.message = obj.message;
			}
		}
		else if (Utils.isObject(obj)) {
			args = obj;
		}

		this.info = args;
	};
	restify_errors[name].prototype = old;
}

restify_errors['wrap'] = function(e, callback) {
	if (typeof e.restCode !== 'undefined') {
		return e; // An openEO error
	}
	else {
		return callback ? callback(e) : new restify_errors.Internal(e); // Probably an internal error
	}
}

module.exports = restify_errors;