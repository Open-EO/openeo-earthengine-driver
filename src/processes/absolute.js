const Process = require('../processgraph/process');
const Commons = require('../processgraph/commons');

module.exports = class absolute extends Process {

    geeProcess(a){
        return a.abs();
    }

};