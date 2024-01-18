const Utils = require('../utils/utils');
const fse = require('fs-extra');
const path = require('path');
const ProcessRegistry = require('@openeo/js-commons/src/processRegistry');

module.exports = class GeeProcessRegistry extends ProcessRegistry {

	constructor(serverContext) {
		super();
		this.serverContext = serverContext;
	}

	async addFromFolder(folder) {
		const promises = (await fse.readdir(folder))
			.filter(file => file.endsWith('.js'))
			.map(file => this.addFromFile(path.basename(file, '.js')));
		
		await Promise.all(promises);
		return Utils.size(this.namespace('backend'));
	}

	async addFromFile(id) {
		let spec = await fse.readJSON('src/processes/' + id + '.json');
		delete spec.process_graph;
		this.add(spec, 'backend');
	}

	getServerContext() {
		return this.serverContext;
	}

};