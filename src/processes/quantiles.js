const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');
const Errors = require('../errors');


// TODO: handle multiple return values
module.exports = class quantiles extends Process {

    async validate(node, context){
        var probs = node.getArgument('probabilities');
        for(var i=0;i<probs.length;i++){
            if(probs[i] > 1){
                throw new Errors.ProcessArgumentInvalid({
                    process: this.schema.id,
                    argument: 'probabilities',
                    reason: 'All probabilites have to be lower or equal than 1.'
                });
            }

        }
    }

    async execute(node, context) {
        var probs = node.getArgument('probabilities');
        var q = node.getArgument('q');
        // TODO: remove these if statements after the default value setting is working
        if(q === undefined) {
            q = null;
        }
        if(probs === undefined) {
            probs = null;
        }
        var quants = null;
        if((probs === null) && (q === null)){
            throw new Errors.QuantilesParameterMissing();
        }
        else if((probs !== null) && (q !== null)){
            throw new Errors.QuantilesParameterConflict();
        }
        else {
            if (probs !== null) {  // transform given probabilities to the range (0, 100)
                quants = probs.map(value => value * 100);
            } else {  // q has to be given due to the previous checks
                quants = [];
                for(var i=0; i<100; i+=100/q){
                    quants.push(i);
                }
                quants = quants.slice(1);
            }
            return Commons.reduceInCallback(node, ee.Reducer.percentile(quants));
        }
    }

};