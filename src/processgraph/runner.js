const ProcessGraph = require('./processgraph');
const ProcessingContext = require('./context');
const Errors = require('../errors');

module.exports = class ProcessGraphRunner {

	constructor(processGraph, registry) { 
		if (processGraph instanceof ProcessGraph) {
			this.processGraph = processGraph;
		}
		else {
			this.processGraph = new ProcessGraph(processGraph);
		}
		this.registry = registry;
	}

	getProcessGraph() {
		return this.processGraph;
	}

	createContextFromRequest(req, synchronousRequest = false) {
		return new ProcessingContext(this.registry.getServerContext(), req.user._id, synchronousRequest);
	}

	async validate(context = null) {
		if (context === null) {
			context = new ProcessingContext(this.registry.getServerContext());
		}

		this.processGraph.parse();
		return this.validateNodes(this.processGraph.getStartNodes(), context);
	}

	async execute(context = null) {
		if (context === null) {
			context = new ProcessingContext(this.registry.getServerContext());
		}

		this.processGraph.reset();
		await this.executeNodes(this.processGraph.getStartNodes(), context);
		return this.processGraph.getResultNode();
	}

	async validateNodes(nodes, context, previousNode = null, errorList = new ErrorList()) {
		if (nodes.length === 0) {
			return errorList;
		}

		var promises = nodes.map(node => {
			// Validate this node after all dependencies are available
			if (!node.solveDependency(previousNode)) {
				return;
			}
			// Load process
			var process;
			try {
				process = this.getProcess(node);
			} catch (e) {
				errorList.add(e);
				return;
			}
			// Validate process
			return process.validate(node, context)
				.catch(e => errorList.add(e))
				// Validate next nodes in chain regardless of a vaildation failure above
				.then(() => this.validateNodes(node.getNextNodes(), context, node, errorList));
		});

		await Promise.all(promises);
		return errorList;
	}

	async executeNodes(nodes, context, previousNode = null) {
		if (nodes.length === 0) {
			return;
		}

		var promises = nodes.map(async (node) => {
			// Execute this node after all dependencies are available
			if (!node.solveDependency(previousNode)) {
				return;
			}

			if (context.server().debug) {
				console.log("calling " + node.process_id);
			}

			var process = this.getProcess(node);
			var result = await process.execute(node, context);
			node.setResult(result);
			
			if (context.server().debug) {
				console.log("returning from " + node.process_id);
			}

			// Execute next nodes in chain
			await this.executeNodes(node.getNextNodes(), context, node);
		});

		return Promise.all(promises);
	}

	getProcess(node) {
		var process = this.registry.get(node.process_id);
		if (process === null) {
			throw new Errors.ProcessUnsupported({process: node.process_id});
		}
		return process;
	}

};

class ErrorList {

	constructor() {
		this.errors = [];
	}

	first() {
		return this.errors[0];
	}
	
	add(error) {
		this.errors.push(Errors.wrap(error));
	}

	empty() {
		return (this.errors.length === 0);
	}

	toJSON() {
		return this.errors.map(e => e.toJSON());
	}

	getAll() {
		return this.errors;
	}

}