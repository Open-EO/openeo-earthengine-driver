const openeo_errors = require('../storage/errors/errors.json');
const custom_errors = require('../storage/errors/custom.json');
const restify_errors = require('restify-errors');

const errors = Object.assign(openeo_errors, custom_errors);

for(var name in errors) {
	restify_errors.makeConstructor(name, {
		openEOCode: name,
		statusCode: errors[name].http,
		message: errors[name].message,
		id: (new Date()).getTime().toString(),
		originalError: null,
		url: "https://open-eo.github.io/openeo-api/errors/#openeo-error-codes",
		toJSON() {
			if (global.server.serverContext.debug) {
				if (this.originalError !== null) {
					console.log(this.originalError);
				}
				else {
					console.log(this);
				}
			}
			return {
				id: this.id,
				code: this.openEOCode,
				message: this.message,
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
		else if (obj === Object(obj) && !Array.isArray(obj)) {
			args = obj;
		}
		this.info = args;

		for(var placeholder in this.info) {
			this.message = this.message.replace('{' + placeholder + '}', this.info[placeholder]);
		}
	};
	restify_errors[name].prototype = old;
}

restify_errors['wrap'] = function(e, callback) {
	if (typeof e.openEOCode !== 'undefined') {
		return e; // An openEO error
	}
	else {
		return callback ? callback(e) : new restify_errors.Internal(e); // Probably an internal error
	}
}

module.exports = restify_errors;