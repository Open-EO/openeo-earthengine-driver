const ProcessRegistry = require('../src/processgraph/registry');
const json = require('./data/sample-processgraph.json');

describe('Process Graph Registry', () => {
	var registry;
	beforeAll(() => {
		registry = new ProcessRegistry();
		return Promise.resolve();
	});
	test('Load Processes', () => {
		expect(registry.addFromFolder('./src/processes/')).toBe(10);
	});
	var runner;
	test('Create Runner', () => {
		runner = registry.createRunner(json);
		var p = runner.getProcessGraph();
		expect(p.getNode("loadco1").passesTo).toEqual(["filter1"/*, "filter2"*/]);
		expect(p.getStartNodes()).toEqual(["loadco1"]);
		expect(p.getResultNode()).toBe("mint1"/*"export2"*/);
	});
	test('Validate', (done) => {
		runner.validate().then(() => done()).catch(e => console.log(e) && done());
	});
	test('Execute', (done) => {
		runner.execute().then(() => done()).catch(e => console.log(e) && done());
	});
});