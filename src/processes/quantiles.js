const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');
const Errors = require('../errors');
const underscore = require('underscore');

// TODO: should we check for invalid input, e.g. probabilites > 1?
// TODO: handle multiple return values
module.exports = class quantiles extends Process {

    async execute(node, context) {
        var probs = node.getArgument('probabilities');
        var q = node.getArgument('q');
        var quants = null;
        if((probs === null) && (q === null)){
            throw new Errors.QuantilesParameterMissing();
        }
        else if((probs !== null) && (q !== null)){
            throw new Errors.QuantilesParameterConflict();
        }
        else {
            if (probs !== null) {  // transform given probabilities to the range (0, 100)
                var probs2quants = (value) => {
                    return value * 100
                };
                quants = probs.map(probs2quants);
            } else {  // q has to be given due to the previous checks
                // TODO: remove dependency and use loop instead
                quants = underscore.range(1, 100, 100 / q).slice(1)
            }
            return Commons.reduceInCallback(node, 'percentile', quants);
        }
    }

};