const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

//TODO: split up the dimension value selection
module.exports = class filter extends Process {

    /*
    process(dc, callback, dimensionName){
        return Commons.filter(dc, callback, dimensionName);
    }*/


    async execute(node, context) {
        var dc = node.getData('data');
        var callback = node.getArgument("expression");
        var dimensionName = node.getArgument("dimension");

        var dimension = dc.findSingleDimension(dimensionName);
        var values = dimension.getValues();
        var execution = await callback.execute({value: values});
        var selection = execution.result;
        var values_filtered = [];
        values.forEach((val, index) => {
            if(selection[index]){
                values_filtered.push(val);
            }
        });
        dc.findSingleDimension(dimensionName).setValues(values_filtered);

        return dc;
    }

};