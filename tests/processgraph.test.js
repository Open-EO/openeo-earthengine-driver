const ServerContext = require('../src/utils/servercontext');
const DB = require('../src/utils/db');
const ProcessingContext = require('../src/processgraph/context');
const GeeProcessGraph = require('../src/processgraph/processgraph');
const json = require('./data/sample-processgraph.json');

describe('Process Graph Registry', () => {
	let serverContext;

	beforeAll(async () => {
		serverContext = new ServerContext();
		await serverContext.collections().loadCatalog();
		await serverContext.processes().addFromFolder('./src/processes/');
	});

	afterAll(() => {
		DB.closeAll();
	});

	test('Processes', () => {
		const registry = serverContext.processes();
		expect(registry.count()).toBe(67);
		expect(registry.get('load_collection')).not.toBe(null);
	});

	test('Collections', () => {
		const catalog = serverContext.collections();
		expect(catalog.getData('COPERNICUS/S2')).not.toBe(null);
	});

	test('Validate', async () => {
		const p = new GeeProcessGraph(json, new ProcessingContext(serverContext));
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