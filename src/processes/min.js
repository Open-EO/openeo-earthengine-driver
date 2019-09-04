const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class min extends Process {

    geeReducer() {
        return 'min';
    }

	async execute(node, context) {
		return Commons.reduceInCallback(
			node,
			(a,b) => Math.min(a,b),
			(a,b) => a.min(b)
		);
	}

};