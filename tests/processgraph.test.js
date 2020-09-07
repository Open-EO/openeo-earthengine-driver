const GeeProcessRegistry = require('../src/processgraph/registry');
const ServerContext = require('../src/servercontext');
const ProcessingContext = require('../src/processgraph/context');
const GeeProcessGraph = require('../src/processgraph/processgraph');
const json = require('./data/sample-processgraph.json');

describe('Process Graph Registry', () => {
	var p;

	beforeAll(async () => {
		let serverContext = new ServerContext();
		await serverContext.collections().loadCatalog();
		serverContext.processes().addFromFolder('./src/processes/');
		p = new GeeProcessGraph(json, new ProcessingContext(serverContext));
	});

	test('Processes', () => {
		let registry = p.getContext().server().processes();
		expect(registry.count()).toBe(66);
		expect(registry.get('load_collection')).not.toBe(null);
	});

	test('Collections', () => {
		let catalog = p.getContext().server().collections();
		expect(catalog.getData('COPERNICUS/S2')).not.toBe(null);
	});

	test('Validate', async () => {
		var errors = await p.validate(false);
		if (errors.count() > 0) {
			console.log(errors.getMessage());
		}
		expect(errors.count()).toBe(0);
		expect(p.getStartNodes().map(node => node.id)).toEqual(["load_collection"]);
		expect(p.getNode("load_collection").getNextNodes().map(n => n.id)).toEqual(["reduce_bands"]);
		expect(p.getResultNode().id).toBe("save");
	});

});