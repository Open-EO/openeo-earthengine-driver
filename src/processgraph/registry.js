const Utils = require('../utils');
const fse = require('fs-extra');
const path = require('path');
const { ProcessRegistry } = require('@openeo/js-processgraphs');
const { MigrateProcesses } = require('@openeo/js-commons');

module.exports = class GeeProcessRegistry extends ProcessRegistry {

	constructor(serverContext) {
		super();
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
		var spec = require('../processes/' + id + '.json');
		var impl = require('../processes/' + id + '.js');
		// ToDo 1.0: Remove temporary workaround to convert old processes to current spec
		spec = MigrateProcesses.convertProcessToLatestSpec(spec, "0.4.2");
		this.processes[id.toLowerCase()] = new impl(spec);
	}

	getServerContext() {
		return this.serverContext;
	}

};