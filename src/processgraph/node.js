import DataCube from '../datacube/datacube.js';
import { ProcessGraphNode } from '@openeo/js-processgraphs';
import Errors from '../utils/errors.js';
import ProcessGraph from '../processgraph/processgraph.js';
import GeeTypes from '../processes/utils/types.js';

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
		const data = this.convertToEE(name, dc.getData());
		return dc.setData(data);
	}

	getCallback(name) {
		const callback = this.getArgument(name);
		if (!(callback instanceof ProcessGraph)) {
			throw this.invalidArgument('process', 'No process specified.');
		}
		return callback;
	}

	getArgument(name, defaultValue = undefined) {
		const constraint = this.getProcessGraph().getAdditionalConstraint(this.process_id, name);
		if (typeof constraint !== 'undefined') {
			return constraint;
		}
		return super.getArgument(name, defaultValue);
	}

	getArgumentAsListEE(name, converter = null, defaultValue = undefined) {
		const data = this.getArgument(name, defaultValue);
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

	getArgumentAsDateEE(name) {
		const data = this.getArgument(name, null);
		if (data === null) {
			throw this.invalidArgument(name, 'No value provided');
		}
		return this.ee.Date(data);
	}

	getArgumentAsNumberEE(name, defaultValue = undefined) {
		const data = this.getArgument(name, defaultValue);
		const result = GeeTypes.toNumber(this.ee, data);
		if (result === null) {
			throw this.invalidArgument(name, 'Conversion to number not supported');
		}
		return result;
	}

	getArgumentAsFeatureLikeEE(name, defaultValue = undefined) {
		const data = this.getArgument(name);
		const result = GeeTypes.toFeatureLike(this.ee, data);
		if (result === null && defaultValue !== null) {
			throw this.invalidArgument(name, 'Conversion to feature collection, feature or geometry not supported');
		}
		return result;
	}

	getArgumentAsEE(name, defaultValue = undefined) {
		const data = this.getArgument(name, defaultValue);
		return this.convertToEE(name, data);
	}

	convertToEE(name, data) {
		const eeData = GeeTypes.toEE(this, data);
		if (typeof eeData === 'undefined') {
			throw this.invalidArgument(name, 'Datatype not supported by Google Earth Engine');
		}
		return eeData;
	}

	getExecutionContext() {
		return this.getProcessGraph().getArgument("executionContext");
	}

	invalidArgument(parameter, reason) {
		return new Errors.ProcessParameterInvalid({
			process: this.process_id,
			namespace: this.namespace || 'n/a',
			parameter,
			reason
		});
	}

}
