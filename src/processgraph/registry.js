import Utils from '../utils/utils.js';
import fse from 'fs-extra';
import path from 'path';
import ProcessRegistry from '@openeo/js-commons/src/processRegistry.js';

export default class GeeProcessRegistry extends ProcessRegistry {

	constructor(serverContext) {
		super();
		this.serverContext = serverContext;
		this.implementations = {};
	}

	async addFromFolder(folder) {
		const promises = (await fse.readdir(folder))
			.filter(file => file.endsWith('.js'))
			.map(file => this.addFromFile(path.basename(file, '.js')));

		await Promise.all(promises);
		return Utils.size(this.namespace('backend'));
	}

	async addFromFile(id) {
		const spec = await fse.readJSON('src/processes/' + id + '.json');
		delete spec.process_graph;

		this.add(spec, 'backend');

		const impl = await import('../processes/' + id + '.js');
		this.implementations[id] = impl.default;
	}

	getImplementation(id) {
		return this.implementations[id] || null;
	}

	getServerContext() {
		return this.serverContext;
	}

}
