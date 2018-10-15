const Errors = require('./errors');

var ProcessRegistry = {
	
	// Keys must be lowercase!
	processes: {},

	add(process_id) {
		this.processes[process_id] = require('./processes/' + process_id);
	},
	
	get(process_id) {
		var pid = process_id.toLowerCase();
		if (typeof ProcessRegistry.processes[pid] !== 'undefined') {
			return ProcessRegistry.processes[pid];
		}
		return null;
	},

	parseProcessGraph(process_graph, req, res, execute = true) {
		if(process_graph.hasOwnProperty("process_id")) { // Process
			var process = this.get(process_graph.process_id);
			if (process === null) {
				throw "Process '" + process_graph.process_id + "' is not supported.";
			}
			for(var a in process_graph) {
				if (typeof process_graph[a] === 'object' && process_graph[a] !== null) {
					process_graph[a] = this.parseProcessGraph(process_graph[a], req, res, execute);
				}
			}
			if (execute === true) {
				try {
					return process.eeCode(process_graph, req, res);
				} catch (e) {
					if (typeof e.restCode !== 'undefined') { // This is an openEO error
						throw e;
					}
					else { // Probably a GEE error
						throw new Errors.EarthEngineError(e, {process: process_graph.process_id});
					}
				}
			}
			else {
				return process_graph;
			}
		}
		else if(process_graph.hasOwnProperty("variable_id")) { // Variable
			// ToDo
		}
		else {
			// ToDO: Check if data types (e.g. arrays) are valid
			// ToDo: Doesn't support multiple processes in arrays yet, must go through array for that
			return process_graph;
		}
	}

};

ProcessRegistry.add('count_time');
ProcessRegistry.add('filter_bands');
ProcessRegistry.add('filter_bbox');
ProcessRegistry.add('filter_daterange');
ProcessRegistry.add('first_time');
ProcessRegistry.add('get_collection');
ProcessRegistry.add('last_time');
ProcessRegistry.add('max_time');
ProcessRegistry.add('mean_time');
ProcessRegistry.add('median_time');
ProcessRegistry.add('min_time');
ProcessRegistry.add('ndvi');
ProcessRegistry.add('stretch_colors');
ProcessRegistry.add('sum_time');
ProcessRegistry.add('zonal_statistics');

module.exports = ProcessRegistry;