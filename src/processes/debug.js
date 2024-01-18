const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class debug extends BaseProcess {

	async execute(node) {
        var dc = node.getArgument('data');
        var code = node.getArgument('data');
        var level = node.getArgument('data', 'info');
        var message = node.getArgument('data');

		var logger = node.getLogger();
		logger[level](message, data, code);

		// ToDo 1.2: rename to inspect #81
		// ToDo processes: Implement that if GEE objects are passed into data, it requests gee.getInfo on them and logs the result. #81

		return dc;
	}

};