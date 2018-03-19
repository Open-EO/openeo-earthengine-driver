const axios = require('axios');
const Capabilities = require('./capabilities');
const ProcessRegistry = require('./processRegistry');
const Utils = require('./utils');

var Jobs = {

	db: null,

	init() {
		this.db = Utils.loadDB('jobs');
		console.log("INFO: Jobs loaded.");
		return new Promise((resolve, reject) => resolve());
	},

	routes(server) {
		server.addEndpoint('post', '/execute', this.postExecute.bind(this));
	},

	postExecute(req, res, next) {
		if (typeof req.body.process_graph !== 'object') {
			res.send(400, "No process_graph specified.");
			return next();
		}
	
		var format = Capabilities.getDefaultOutputFormat();
		if (typeof req.body.output.format === 'string') {
			if (Capabilities.isValidOutputFormat(req.body.output.format)) {
				format = req.body.output.format;
			} else {
				res.send(406, "Output format is not supported.");
				return next();
			}
		}
	
		try {
			global.downloadRegion = null; // This is a hack. Search for all occurances and remove them.
			var obj = ProcessRegistry.parseProcessGraph(req.body.process_graph);
			var image = ProcessRegistry.toImage(obj);
			// Download image
			if (global.downloadRegion === null) {
				global.downloadRegion = image.geometry();
			}
			var bounds = global.downloadRegion.bounds().getInfo();
			// Replace getThumbURL with getDownloadURL
			var url = image.getThumbURL({
				format: Capabilities.translateOutputFormat(format),
				dimensions: '512',
				region: bounds
			});
			console.log("Downloading " + url);
			axios({
				method: 'get',
				url: url,
				responseType: 'stream'
			}).then(stream => {
				var contentType = typeof stream.headers['content-type'] !== 'undefined' ? stream.headers['content-type'] : 'application/octet-stream';
				res.header('Content-Type', contentType);
				stream.data.pipe(res);
			}).catch(() => {
				res.send(500);
			});
		} catch (e) {
			console.log(e);
			res.send(400, e);
		}
		next();
	}

};

module.exports = Jobs;