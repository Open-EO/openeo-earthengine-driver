const { BaseProcess } = require('@openeo/js-processgraphs');

module.exports = class first extends BaseProcess {

	geeReducer(node) {
		return node.getArgument('ignore_nodata', true) ? 'firstNonNull' : 'first';
	}

	async execute(node) {
		var data = node.getArgument('data');

		if (Array.isArray(data)) {
			return data[0];
		}
		else if (data instanceof ee.Array) {
			return data.toList().get(0);
		}
		else {
			throw new Errors.ProcessArgumentInvalid();
		}
	}

};