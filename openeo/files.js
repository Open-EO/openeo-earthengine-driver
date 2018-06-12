const Utils = require('./utils');
const fs = require('fs');
const path = require('path');

// ToDo: This is a mock and only uploads to the driver workspace, but not into the actual Google cloud storage, which would be required to use it in processes.
// ToDo: Replace sync calls with async calls.
var Files = {

	init() {
		console.log("INFO: Files loaded.");
		return new Promise((resolve, reject) => resolve());
	},

	routes(server) {
		var pathRoutes = ['/users/{user_id}/files/{path}', '/users/:user_id/files/:path(.*)'];
		server.addEndpoint('get', '/users/{user_id}/files', this.getFiles.bind(this));
		server.addEndpoint('get', pathRoutes, this.getFileByPath.bind(this));
		server.addEndpoint('put', pathRoutes, this.putFileByPath.bind(this));
		server.addEndpoint('delete', pathRoutes, this.deleteFileByPath.bind(this));
	},

	getFiles(req, res, next) {
		if (!req.user._id) {
			res.send(403);
			return next();
		}
		var p = this.getPathFromRequest(req, '.');
		if (!p) {
			res.send(400);
			return next();
		}

		var files = this.walkSync(path.normalize(p));
		var data = [];
		for(var i in files) {
			var fileName = path.relative(this.getUserFolder(req.user._id), files[i]);
			data.push({
				"name": fileName,
				"size": fs.statSync(files[i]).size
				// ToDo: Add time of modification
			  });
		}
		res.json(data);
		return next();
	},

	walkSync(dir, filelist) {
		filelist = filelist || [];
		if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
			files = fs.readdirSync(dir);
			files.forEach((file) => {
				let fullPath = path.join(dir, file);
				if (fs.statSync(fullPath).isDirectory()) {
					filelist = this.walkSync(fullPath, filelist);
				}
				else {
					filelist.push(fullPath);
				}
			});
		}
		return filelist;
	},

	putFileByPath(req, res, next) {
		if (!req.user._id) {
			res.send(403);
			return next();
		}
		var p = this.getPathFromRequest(req);
		if (!p || (fs.existsSync(p) && fs.statSync(p).isDirectory())) {
			res.send(400);
			return next();
		}
		if (req.contentType() !== 'application/octet-stream') {
			res.send(400);
			return next();
		}

		let parent = path.dirname(p);
		if (!fs.existsSync(parent)) {
			fs.mkdir(parent);
		}
	
		var stream = fs.createWriteStream(p);
		req.on('data', (chunk) => {
			stream.write(chunk);
		});
		req.on('end', () => {
			stream.end();
			res.send(200);
			return next();
		});
		req.on('error', () => {
			stream.end();
			if (fs.existsSync(p)) {
				fs.unlink(p);
			}
			res.send(500);
			return next();
		});
	},

	deleteFileByPath(req, res, next) {
		if (!req.user._id) {
			res.send(403);
			return next();
		}
		var p = this.getPathFromRequest(req);
		if (!p) {
			res.send(400);
			return next();
		}
		if (fs.existsSync(p) && fs.statSync(p).isFile()) {
			fs.unlink(p, (err) => {
				if (err) {
					res.send(500, err);
					return next();
				}
				else {
					res.send(200);
					return next();
				}
			});
		}
		else {
			res.send(404);
			return next();
		}
	},

	getFileByPath(req, res, next) {
		if (!req.user._id) {
			res.send(403);
			return next();
		}
		var p = this.getPathFromRequest(req);
		if (!p) {
			res.send(400);
			return next();
		}
		if (fs.existsSync(p) && fs.statSync(p).isFile()) {
			let stream = fs.createReadStream(p);
			stream.pipe(res);
			stream.on('error', (error) => {
				res.send(500);
				return next();
			});
			stream.on('close', () => {
				res.end();
				return next();
			});
		}
		else {
			res.send(404);
			return next();
		}
	},

	getUserFolder(user_id) {
		return path.join('./storage/user_files', user_id);
	},

	getPathFromRequest(req, p) {
		return this.getPath(req.user._id, (p ? p : req.params.path));
	},

	getPath(user_id, p) {
		let userFolder = this.getUserFolder(user_id);
		let userPath = path.normalize(userFolder);
		let filePath = path.normalize(path.join(userFolder, p));
		if (filePath.startsWith(userPath)) {
			return filePath;
		}
		return false;
	},

	getFileContentsSync(user_id, p) {
		if (!user_id) {
			return null;
		}
		var p = this.getPath(user_id, p);
		if (!p || !fs.existsSync(p) || !fs.statSync(p).isFile()) {
			return null;
		}

		return fs.readFileSync(p);
	}

};

module.exports = Files;
