const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class max extends Process {

    geeReducer() {
        return 'max';
    }

	async execute(node, context) {
		return Commons.reduceInCallback(
			node,
			(a,b) => Math.max(a,b),
			(a,b) => a.max(b)
		);
	}

};