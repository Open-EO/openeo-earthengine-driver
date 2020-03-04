const { BaseProcess } = require('@openeo/js-processgraphs');

module.exports = class normalized_difference extends BaseProcess {

	async execute(node) {
		return Commons.reduceBinaryInCallback(
			node,
			(x,y) => (x - y) / (x + y),
			(x,y) => x.subtract(y).divide(x.add(y))
		);
	}

};