const ProcessRegistry = require('./processRegistry');

function getProcesses(req, res, next) {
	var data = Object.values(ProcessRegistry.processes).map(e => {
		delete e.args;
		delete e.eeCode;
		return e;
	});
	res.json(data);
	return next();
}


function getProcessById(req, res, next) {
	var process = ProcessRegistry.get(req.params.process_id);
	if (process !== null) {
		delete process.eeCode;
		res.json(process);
	}
	else {
		res.send(404);
	}
	return next();
}


module.exports = {
	getProcessById,
	getProcesses
};