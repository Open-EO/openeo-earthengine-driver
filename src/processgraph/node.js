import DataCube from './datacube.js';
import { ProcessGraphNode } from '@openeo/js-processgraphs';
import Errors from '../utils/errors.js';
import ProcessGraph from '../processgraph/processgraph.js';

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

	invalidArgument(argument, reason) {
		return new Errors.ProcessArgumentInvalid({
			process: this.process_id,
			namespace: this.namespace,
			argument,
			reason
		});
	}

}
