/* global describe, beforeAll, afterAll, test, expect */
import ServerContext from '../src/utils/servercontext.js';
import DB from '../src/utils/db.js';
import ProcessingContext from '../src/utils/processingcontext.js';
import GeeProcessGraph from '../src/processgraph/processgraph.js';
import Utils from '../src/utils/utils.js';
import fse from 'fs-extra';

describe('Process Graph Registry', () => {
	let serverContext, json;

	beforeAll(async () => {
		Utils.serverUrl = 'http://localhost:8080';
		Utils.apiPath = '/v1';

		serverContext = new ServerContext();
		await serverContext.collections().loadCatalog();
		await serverContext.processes().addFromFolder('./src/processes/');

		json = await fse.readJSON('./tests/data/sample-processgraph.json');
	}, 2 * 60 * 1000);

	afterAll(() => {
		DB.closeAll();
	});

	test('Processes', () => {
		const registry = serverContext.processes();
		expect(registry.count()).toBe(69);
		expect(registry.get('load_collection')).not.toBe(null);
	});

	test('Collections', () => {
		const catalog = serverContext.collections();
		expect(catalog.getData('COPERNICUS/S2')).not.toBe(null);
	});

	test('Validate', async () => {
		const req = {
			user: serverContext.users().emptyUser()
		};
		const p = new GeeProcessGraph(json, new ProcessingContext(serverContext, req));
		const errors = await p.validate(false);
		if (errors.count() > 0) {
			console.log(errors.getMessage());
		}
		expect(errors.count()).toBe(0);
		expect(p.getStartNodes().map(node => node.id)).toEqual(["load_collection"]);
		expect(p.getNode("load_collection").getNextNodes().map(n => n.id)).toEqual(["reduce_bands"]);
		expect(p.getResultNode().id).toBe("save");
	});

});
