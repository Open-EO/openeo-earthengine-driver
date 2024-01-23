import DataCube from './datacube.js';
import { ProcessGraphNode } from '@openeo/js-processgraphs';
import Errors from '../utils/errors.js';
import ProcessGraph from '../processgraph/processgraph.js';
import GeeUtils from './utils.js';
import Utils from '../utils/utils.js';

export default class GeeProcessGraphNode extends ProcessGraphNode {

	constructor(json, id, parent) {
		super(json, id, parent);
	}

	get ee() {
		return this.processGraph.getContext().ee;
	}

	getLogger() {
		return this.processGraph.getLogger() || console; // If no logger is set, use console.xxx
	}

	getLoggerPath() {
		const path = [];
		let node = this;
		do {
			path.push(node.id);
			node = node.getParent();
		} while(node);
		return path.reverse();
	}

	debug(message, data = null) {
		this.getLogger().debug(message, data, this.getLoggerPath());
	}

	info(message, data = null) {
		this.getLogger().info(message, data, this.getLoggerPath());
	}

	warn(message, data = null) {
		this.getLogger().warn(message, data, this.getLoggerPath());
	}

	error(error, data = null, code = undefined, links = undefined) {
		this.getLogger().error(error, data, this.getLoggerPath(), code, links);
	}

	getContext() {
		return this.processGraph.getContext();
	}

	getServerContext() {
		return this.getContext().server();
	}

	getParameter(name) {
		return this.processGraph.getArgument(name);
	}

	getDataCube(name) {
		return new DataCube(this.ee, this.getArgument(name));
	}

	getCallback(name) {
		const callback = this.getArgument(name);
		if (!(callback instanceof ProcessGraph)) {
			throw this.invalidArgument('process', 'No process specified.');
		}
		return callback;
	}

	isEarthEngineType(data) {
		return GeeUtils.isEarthEngineType(this.ee, data);
	}

	getArgumentAsListEE(name, converter = null) {
		const data = this.getArgument(name);
		const result = GeeUtils.toList(this.ee, data, converter);
		if (result === null) {
			throw this.invalidArgument(name, 'Conversion to list not supported');
		}
		return result;
	}

	getArgumentAsStringEE(name) {
		const data = this.getArgument(name);
		const result = GeeUtils.toString(this.ee, data);
		if (result === null) {
			throw this.invalidArgument(name, 'Conversion to string not supported');
		}
		return result;
	}

	getArgumentAsEE(name) {
		const ee = this.ee;
		const data = this.getArgument(name);
		if (typeof data === 'boolean') {
			this.warn("Implicit conversion of a boolean value to an integer.");
			return data ? ee.Number(1) : ee.Number(0);
		}
		else if (typeof data === 'number') {
			return ee.Number(data);
		}
		else if (typeof data === 'string') {
			return ee.String(data);
		}
		else if (typeof data === 'object') {
			if (Array.isArray(data)) {
				if (data.length === 0) {
					return ee.Array([], ee.PixelType.float());
				}
				else {
					return ee.Array(data);
				}
			}
			else if (this.isEarthEngineType(data)) {
				return data;
			}
			else if (Utils.isObject(data)) {
				return ee.Dictionary(data);
			}
		}

		throw this.invalidArgument(name, 'Datatype not supported by Google Earth Engine');
	}

	invalidArgument(argument, reason) {
		return new Errors.ProcessArgumentInvalid({
			process: this.process_id,
			namespace: this.namespace || 'n/a',
			argument,
			reason
		});
	}

}
