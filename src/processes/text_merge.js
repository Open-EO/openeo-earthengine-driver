const { BaseProcess } = require('@openeo/js-processgraphs');

module.exports = class text_merge extends BaseProcess {

    async execute(node) {
        var data = node.getArgument('data');
        var separator = node.getArgument('separator');

        if(separator == null){
            separator = "";
        }

        return data.join(separator);;
    }

};