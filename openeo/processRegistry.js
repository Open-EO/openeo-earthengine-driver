const Errors = require('./errors');
const Utils = require('./utils');

var ProcessRegistry = {
	
	// Keys must be lowercase!
	processes: {},
	variableTypes: ['string', 'number', 'boolean', 'array', 'object'],

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

	validateProcessGraph(req, process_graph, variables = {}) {
		return this.parseProcessGraph(req, process_graph, variables, false);
	},

	executeProcessGraph(req, process_graph, variables = {}) {
		return this.parseProcessGraph(req, process_graph, variables, true);
	},

	getType(obj) {
		if (Utils.isObject(obj)) {
			if(obj.hasOwnProperty("process_id")) {
				return 'process';
			}
			else if(obj.hasOwnProperty("variable_id")) {
				return 'variable';
			}
		}
		return (typeof obj);
	},

	parseProcessGraph(req, process_graph, variables, execute) {
		let type = this.getType(process_graph);
		if (type != 'process' && type != 'variable') {
			return Promise.reject(new Errors.ProcessGraphMissing());
		}

		return this.parseObject(req, process_graph, variables, execute);
	},

	parseObject(req, obj, variables, execute) {
		let type = this.getType(obj);
		// Found a variable
		if(type == 'variable') {
			try {
				obj = this.parseVariable(obj, variables, execute);
			} catch(e) {
				return Promise.reject(e);
			}
		}

		// Found a process
		if(type == 'process') {
			return this.parseProcess(req, obj, variables, execute);
		}
		else {
			return Promise.resolve(obj);
		}
	},

	parseValue(req, val, variables, execute) {
		if (Array.isArray(val)) {
			return this.parseValues(req, val, variables, execute);
		}
		else if (Utils.isObject(val)) {
			return this.parseObject(req, val, variables, execute);
		}
		else {
			return Promise.resolve(val);
		}
	},

	parseValues(req, obj, variables, execute) {
		let promises = [];
		for(let key in obj) {
			if (typeof obj[key] === 'object' && obj[key] !== null) {
				promises.push(this.parseValue(req, obj[key], variables, execute).then(val => {
					obj[key] = val;
					return val;
				}));
			}
		}
		return Promise.all(promises).then(() => {
			return Promise.resolve(obj);
		});
	},

	parseProcess(req, obj, variables, execute) {
		let process = this.get(obj.process_id);
		if (process === null) {
			return Promise.reject(new Errors.ProcessUnsupported({process: obj.process_id}));
		}
		return this.parseValues(req, obj, variables, execute).then(() => {
			return process.validate(req, obj);
		})
		.then((args) => {
			if (execute) {
				return process.execute(req, args);
			}
			else {
				return Promise.resolve(args);
			}
		})
		.catch(e => {
			return Promise.reject(Errors.wrap(e, error => new Errors.EarthEngineError(error, {process: obj.process_id})));
		});
	},

	parseVariable(variable, variables, execute) {
		// Check whether the variable id is valid
		if (typeof variable.variable_id !== 'string') {
			throw new Errors.VariableIdInvalid();
		}
		// Check whether the data type is valid
		if (typeof variable.type !== 'undefined' && !this.variableTypes.includes(variable.type)) {
			throw new Errors.VariableTypeInvalid(variable);
		}
		let varType = typeof variable.type !== 'undefined' ? variable.type : 'string';
		// Check whether the defult value has the correct data type
		if (typeof variable.default !== 'undefined' && typeof variable.default !== varType) {
			throw new Errors.VariableDefaultValueTypeInvalid(variable);
		}

		// Replace variable if executed
		if (execute) {
			if (typeof variables[variable.variable_id] === 'undefined') {
				if (typeof variable.default === 'undefined') {
					throw new Errors.VariableValueMissing(variable);
				}
				else {
					variable = variable.default;
				}
			}
			else {
				variable = variables[variable.variable_id];
			}
		}

		return variable;
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
ProcessRegistry.add('process_graph');
ProcessRegistry.add('stretch_colors');
ProcessRegistry.add('sum_time');
ProcessRegistry.add('zonal_statistics');

module.exports = ProcessRegistry;