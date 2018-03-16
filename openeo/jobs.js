const axios = require('axios');
const {getDefaultOutputFormat, isValidOutputFormat, translateOutputFormat} = require('./capabilities');
const ProcessRegistry = require('./processRegistry');

function postExecute(req, res, next) {
	if (typeof req.body.process_graph !== 'object') {
		res.send(400, "No process_graph specified.");
		return next();
	}

	var format = getDefaultOutputFormat();
	if (typeof req.body.output.format === 'string') {
		if (isValidOutputFormat(req.body.output.format)) {
			format = req.body.output.format;
		} else {
			res.send(406, "Output format is not supported.");
			return next();
		}
	}

	try {
		global.downloadRegion = null; // This is a hack. Search for all occurances and remove them.
		var obj = ProcessRegistry.parseProcessGraph(req.body.process_graph);
		// Replace getThumbURL with getDownloadURL
		var image = ProcessRegistry.toImage(obj);
		var url = image.clip(global.downloadRegion).getThumbURL({
			format: translateOutputFormat(format),
			dimensions: '1024',
			region: image.geometry().getInfo()
		});
		console.log("Downloading " + url);
		axios({
			method: 'get',
			url: url,
			responseType: 'stream'
		}).then(stream => {
			var fs = require("fs");
			stream.data.pipe(fs.createWriteStream("../image.jpg"));
			res.send(200);
//			stream.data.pipe(res);
		}).catch(() => {
			res.send(500);
		});
	} catch (e) {
		console.log(e);
		res.send(400, e);
	}
	next();
}

module.exports = {
	postExecute
};
