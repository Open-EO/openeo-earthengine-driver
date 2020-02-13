const { BaseProcess } = require('@openeo/js-processgraphs');
const Commons = require('../processgraph/commons');

module.exports = class sum extends BaseProcess {

  geeReducer() {
      return 'sum';
  }

	async execute(node) {
		return Commons.reduceInCallback(
			node,
			(a,b) => a + b,
			(a,b) => a.add(b)
		);
	}

};