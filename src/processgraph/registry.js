const Utils = require('../utils');
const fse = require('fs-extra');
const path = require('path');
const ProcessGraphRunner = require('./runner');

module.exports = class ProcessRegistry {

	constructor(serverContext) {
		// Keys added to this object must be lowercase!
		this.processes = {};
		this.serverContext = serverContext;
	}

	addFromFolder(folder) {
		fse.readdirSync(folder).forEach(file => {
			if (file.endsWith('.js')) {
				var id = path.basename(file, '.js');
				this.addFromFile(id);
			}
		});
		var num = Utils.size(this.processes);
		console.info("Loaded " + num + " processes.");
		return Promise.resolve(num);
	}

	addFromFile(id) {
		var schema = require('../processes/' + id + '.json');
		var impl = require('../processes/' + id + '.js');
		this.processes[id.toLowerCase()] = new impl(schema);
	}
	
	get(id) {
		var pid = id.toLowerCase();
		if (typeof this.processes[pid] !== 'undefined') {
			return this.processes[pid];
		}
		return null;
	}

	getProcessSchemas() {
		return Object.values(this.processes).map(impl => impl.schema);
	}

	createRunner(processGraph) {
		return new ProcessGraphRunner(processGraph, this);
	}

	getServerContext() {
		return this.serverContext;
	}

};