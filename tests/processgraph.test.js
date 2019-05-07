const GeeProcessRegistry = require('../src/processgraph/registry');
const ServerContext = require('../src/servercontext');
const ProcessingContext = require('../src/processgraph/context');
const GeeProcessGraph = require('../src/processgraph/processgraph');
const json = require('./data/sample-processgraph.json');

describe('Process Graph Registry', () => {
	var registry, p, context;

	beforeAll(() => {
		registry = new GeeProcessRegistry();
		context = new ProcessingContext(new ServerContext());
		p = new GeeProcessGraph(json, context);
		return Promise.resolve();
	});

	test('Load Processes', () => {
		registry.addFromFolder('./src/processes/');
		expect(registry.count()).toBe(18);
	});

	test('Validate', async () => {
		var errors = await p.validate(false);

		expect(p.getNode("load_collection").getNextNodes().map(n => n.id)).toEqual(["b1", "b2"]);
		expect(p.getStartNodeIds()).toEqual(["load_collection"]);
		expect(p.getResultNode().id).toBe("save_result");

		if (errors.count() > 0) {
			console.log(errors.getMessage());
		}
		expect(errors.count()).toBe(0);
	});

/*	test('Execute', async () => {
		var resultNode = await p.execute();
		expect(resultNode).not.toBeNull(); // TODO: Futher checks...
	}); */

});