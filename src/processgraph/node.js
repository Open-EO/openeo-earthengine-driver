import DataCube from './datacube.js';
import { ProcessGraphNode } from '@openeo/js-processgraphs';
import Errors from '../utils/errors.js';
import ProcessGraph from '../processgraph/processgraph.js';
import GeeTypes from '../processes/utils/types.js';
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

	isDataCube(name) {
		return this.getParameter(name) instanceof DataCube;
	}

	getDataCube(name, defaultValue = undefined) {
		return new DataCube(this.ee, this.getArgument(name, defaultValue));
	}

	getDataCubeWithEE(name, defaultValue = undefined) {
		const dc = this.getDataCube(name, defaultValue);
		const data = this._convertToEE(name, dc.getData(), defaultValue);
		return dc.setData(data);
	}

	getCallback(name) {
		const callback = this.getArgument(name);
		if (!(callback instanceof ProcessGraph)) {
			throw this.invalidArgument('process', 'No process specified.');
		}
		return callback;
	}

	getArgumentAsListEE(name, converter = null) {
		const data = this.getArgument(name);
		const result = GeeTypes.toList(this.ee, data, converter);
		if (result === null) {
			throw this.invalidArgument(name, 'Conversion to list not supported');
		}
		return result;
	}

	getArgumentAsStringEE(name, defaultValue = undefined) {
		const data = this.getArgument(name, defaultValue);
		const result = GeeTypes.toString(this.ee, data);
		if (result === null) {
			throw this.invalidArgument(name, 'Conversion to string not supported');
		}
		return result;
	}

	getArgumentAsNumberEE(name, defaultValue = undefined) {
		const data = this.getArgument(name, defaultValue);
		const result = GeeTypes.toNumber(this.ee, data);
		if (result === null) {
			throw this.invalidArgument(name, 'Conversion to number not supported');
		}
		return result;
	}

	getArgumentAsEE(name, defaultValue = undefined) {
		const data = this.getArgument(name, defaultValue);
		return this._convertToEE(name, data, defaultValue);
	}

	_convertToEE(name, data, defaultValue) {
		const ee = this.ee;
		if (GeeTypes.isEarthEngineType(this.ee, data, false)) {
			return data;
		}
		else if (GeeTypes.isComputedObject(ee, data)) {
			this.warn('Inspecting a ComputedObject via getInfo() is slow. Please report this issue.');
			const info = data.getInfo();
			if (typeof info === 'boolean' || typeof info === 'number' || typeof info === 'string') {
				this.debug(`ComputedObject is a scalar value: ${info}`, info);
				data = info;
			}
			else if (Array.isArray(info)) {
				this.debug(`ComputedObject is an array of length ${info.length}`, info);
				data = info;
			}
			else if (Utils.isObject(info)) {
				if (typeof info.type === 'string' && typeof ee[info.type] !== 'undefined') {
					this.debug(`Casting from ComputedObject to ${info.type}`, info);
					return ee[info.type](data);
				}
				else {
					this.debug(`ComputedObject is an object with the following keys: ${Object.keys(info)}`, info);
					data = info;
				}
			}
			else {
				this.warn(`Can't cast ComputedObject to native GEE type.`, info);
			}
		}

		if (data === null && defaultValue === null) {
			return null;
		}
		else {
			const eeData = GeeTypes.jsToEE(this, data);
			if (eeData !== null) {
				return eeData;
			}
		}

		throw this.invalidArgument(name, 'Datatype not supported by Google Earth Engine');
	}

	getExecutionContext() {
		return this.getProcessGraph().getArgument("executionContext");
	}

	invalidArgument(argument, reason) {
		return new Errors.ProcessParameterInvalid({
			process: this.process_id,
			namespace: this.namespace || 'n/a',
			argument,
			reason
		});
	}

}
