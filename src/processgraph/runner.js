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

	createContextFromRequest(req) {
		return new ProcessingContext(global.server.serverContext, req.user._id);
	}

	validate(context = null) {
		if (context === null) {
			context = new ProcessingContext(global.server.serverContext);
		}
		return this.walkNodes(this.processGraph.getStartNodes(), context);
	}

	execute(context = null) {
		if (context === null) {
			context = new ProcessingContext(global.server.serverContext);
		}
		return this.walkNodes(this.processGraph.getStartNodes(), context, true);
	}

	walkNodes(nodes, context, execute = false) {
		var promises = [];
		for(var i in nodes) {
			var node = this.processGraph.nodes[nodes[i]];
			var index = node.expectsFrom.indexOf(nodes[i]);
			node.expectsFrom.splice(index, 1);
			if (node.expectsFrom.length === 0) {
				var process = this.registry.get(node.process_id);
				if (process === null) {
					throw new Errors.ProcessUnsupported({process: node.process_id});
				}

				console.log("calling " + node.process_id);
				var promise = process.validate(node.arguments, context)
				if (execute) {
					promise = promise.then(() => process.execute(node.arguments, context));
				}
				promise.then(() => {
					console.log("returning from " + node.process_id + " with " + JSON.stringify(node.arguments))
					
					if (Array.isArray(node.passesTo) && node.passesTo.length > 0) {
						return this.walkNodes(node.passesTo);
					}
					else {
						return Promise.resolve();
					}
				});
				promises.push(promise);
			}
		}
		return Promise.all(promises);
	}

};