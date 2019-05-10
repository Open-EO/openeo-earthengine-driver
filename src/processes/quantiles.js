const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');
const Errors = require('../errors');
const underscore = require('underscore');

// TODO: should we check for invalid input, e.g. probabilites > 1?
module.exports = class quantiles extends Process {

    async execute(node, context) {
        var probabilities = node.getArgument('probabilities');
        var q = node.getArgument('q');
        if((probabilities == null) && (q == null)){
            throw new Errors.QuantilesParameterMissing();
        }
        else if((probabilities !== null) && (q !== null)){
            throw new Errors.QuantilesParameterConflict();
        }
        else {
            if (probabilities !== null) {  // transform given probabilities to the range (0, 100)
                var probs2quants = (value, index, array) => {
                    array[index] = value * 100
                };
                probabilities.forEach(probs2quants);
            } else {  // q has to be given due to the previous checks
                probabilities = underscore.range(1, 100, 100 / q).slice(1)
            }
            return Commons.reduceInCallback(node, 'percentile', probabilities);
        }
    }

};