const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');


// TODO: extend this process
module.exports = class eq extends Process {

    process(x, y, delta=null, case_sensitive=null){
        return x === y;
    }


    async execute(node, context) {
        var x = node.getArgument("x");
        var y = node.getArgument("y");
        var delta = node.getArgument("delta");
        var case_sensitive = node.getArgument("case_sensitive");
        var checkX = (x instanceof Array) && (Commons.isNumber(y) || Commons.isBoolean(y) || Commons.isString(y));
        var checkY = (y instanceof Array) && (Commons.isNumber(x) || Commons.isBoolean(x) || Commons.isString(x));
        if(checkX){
            var equal = x => this.process(x, y);
            return x.map(equal);
        }
        else if(checkY){
            var equal = y => this.process(x, y);
            return y.map(equal);
        }
        else{
            //TODO
        }

    }

};