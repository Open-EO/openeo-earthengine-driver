import restify_errors from 'restify-errors/lib/index.js';
import { Utils as CommonUtils } from '@openeo/js-commons';
import { ErrorList } from '@openeo/js-processgraphs';
import util from 'util';
import Utils from './utils.js';

const openeo_errors = Utils.require('../../storage/errors/errors.json');
const custom_errors = Utils.require('../../storage/errors/custom.json');
const errors = Object.assign(openeo_errors, custom_errors);

const ABOUT_URL = "https://openeo.org/documentation/1.0/developers/api/errors.html";

for(var name in errors) {
	restify_errors[name] = restify_errors.makeConstructor(name, {
		code: name,
		statusCode: errors[name].http,
		message: errors[name].message,
		originalError: null,
		native: true,
		toJSON: function() {
			return {
				id: Utils.timeId(),
				code: this.code,
				message: this.message,
				url: ABOUT_URL
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
		else if (typeof obj === 'string') {
			this.message = obj;
			// Fix for https://github.com/Open-EO/openeo-earthengine-driver/issues/42
			if (!CommonUtils.isObject(args)) {
				this.message = util.format(this.message, args);
			}
		}
		this.info = args;
		this.message = CommonUtils.replacePlaceholders(this.message, this.info);
	};
	restify_errors[name].prototype = old;
}

// Override the default restify 404 error with the openEO 404 error.
restify_errors.ResourceNotFoundError = restify_errors.NotFound;

restify_errors.wrap = function(e, callback) {
	if (typeof e === 'string') {
		e = new Error(e);
	}
	else if (e instanceof ErrorList) {
		e = e.first();
	}

	if (CommonUtils.isObject(e) && e.native === true) {
		return e; // An openEO error
	}
	else {
		return callback ? callback(e) : new restify_errors.Internal({message: e.message}); // Probably an internal error
	}
};

export default restify_errors;
