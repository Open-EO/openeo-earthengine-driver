import { Utils as CommonUtils } from '@openeo/js-commons';
import { ErrorList } from '@openeo/js-processgraphs';
import util from 'util';
import Utils from './utils.js';

const openeo_errors = Utils.require('../../storage/errors/errors.json');
const custom_errors = Utils.require('../../storage/errors/custom.json');
const errors = Object.assign(openeo_errors, custom_errors);

const ABOUT_URL = "https://openeo.org/documentation/1.0/developers/api/errors.html";

const Errors = {};

for(const name in errors) {
	Errors[name] = function(obj, args = {}) {
		this.code = name;
		this.statusCode = errors[name].http || 400;
		this.message = errors[name].message;
		this.originalError = null;

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
	Errors[name].prototype = Object.create(Error.prototype);
	Errors[name].prototype.constructor = Errors[name];
	Errors[name].prototype.toJSON = function() {
		return {
			id: Utils.timeId(),
			code: this.code,
			message: this.message,
			url: ABOUT_URL
		};
	};
}

// Override the default 404 error with the openEO 404 error.
Errors.ResourceNotFoundError = Errors.NotFound;

Errors.wrap = function(e, callback) {
	if (typeof e === 'string') {
		e = new Error(e);
	}
	else if (e instanceof ErrorList) {
		e = e.first();
	}

	if (CommonUtils.isObject(e) && e.constructor.name === 'ProcessGraphError') {
		return new Errors.Internal(e); // An error from openeo-js-processgraphs
	}
	else if (CommonUtils.isObject(e) && e.constructor.name in errors) {
		return e; // An openEO error
	}
	else {
		return callback ? callback(e) : new Errors.Internal({message: e.message}); // Probably an internal error
	}
};

export default Errors;
