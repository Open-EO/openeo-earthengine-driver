const openeo_errors = require('../storage/errors/errors.json');
const custom_errors = require('../storage/errors/custom.json');
const restify_errors = require('restify-errors');
const { Utils: CommonUtils } = require('@openeo/js-commons');

const errors = Object.assign(openeo_errors, custom_errors);

for(var name in errors) {
	restify_errors[name] = restify_errors.makeConstructor(name, {
		code: name,
		statusCode: errors[name].http,
		message: errors[name].message,
		originalError: null,
		native: true,
		toJSON: function() {
			return {
				id: (new Date()).getTime().toString(),
				code: this.code,
				message: this.message,
				url: "https://open-eo.github.io/openeo-api/errors/#openeo-error-codes"
			};
		}
	});

	var old = restify_errors[name].prototype;
	restify_errors[name] = function(obj, args = {}) {
		if (CommonUtils.isObject(obj) && obj.constructor.name === 'ProcessGraphError') {
			this.originalError = obj;
			this.message = obj.message;
			this.code = obj.code;
		}
		else if (obj instanceof Error) {
			this.originalError = obj;
			if (!args.message) {
				args.message = obj.message;
			}
		}
		else if (CommonUtils.isObject(obj)) {
			args = obj;
		}
		this.info = args;
		this.message = CommonUtils.replacePlaceholders(this.message, this.info);
	};
	restify_errors[name].prototype = old;
}

restify_errors.wrap = function(e, callback) {
	if (CommonUtils.isObject(e) && e.native === true) {
		return e; // An openEO error
	}
	else {
		return callback ? callback(e) : new restify_errors.Internal(e); // Probably an internal error
	}
};

module.exports = restify_errors;