import fse from 'fs-extra';
import path from 'path';
import Errors from '../utils/errors.js';
import Utils from '../utils/utils.js';
import HttpUtils from '../utils/http.js';

export default class FilesAPI {

	constructor(context) {
		this.workspace = context.files();
		this.context = context;
	}

	async beforeServerStart(server) {
		const pathRoutes = ['/files/{path}', '/files/*'];
		server.addEndpoint('get', '/files', this.getFiles.bind(this));
		server.addEndpoint('get', pathRoutes, this.getFileByPath.bind(this));
		server.addEndpoint('put', pathRoutes, this.putFileByPath.bind(this));
		server.addEndpoint('delete', pathRoutes, this.deleteFileByPath.bind(this));
	}

	init(req, location = null) {
		if (!req.user._id) {
			throw new Errors.AuthenticationRequired();
		}
		const p = this.workspace.getPathFromRequest(req, location);
		if (!p) {
			throw new Errors.FilePathInvalid();
		}
		return p;
	}

	async getFiles(req, res) {
		const p = this.init(req, '.');

		await fse.ensureDir(p);
		const files = await Utils.walk(path.normalize(p));

		const output = files.map(file => {
			return {
				path: this.workspace.getFileName(req.user._id, file.path),
				size: file.stat.size,
				modified: Utils.getISODateTime(file.stat.mtime)
			}
		});
		res.json({
			files: output,
			links:[]
		});
	}

	async putFileByPath(req, res) {
		const p = this.init(req);

		let stat = null;
		try {
			stat = await fse.stat(p);
			if (stat.isDirectory()) {
				throw new Errors.FilePathInvalid();
			}
		} catch (e) {
			// File doesn't exist => not a problem for uploading; create missing folders and continue process chain.
			await fse.ensureDir(path.dirname(p));
		}

		const octetStream = 'application/octet-stream';
		if (req.contentType() !== octetStream) {
			throw new Errors.ContentTypeInvalid({types: octetStream});
		}

		const cleanUp = async (filepath) => {
			if (await fse.exists(filepath)) {
				await fse.unlink(filepath);
			}
		};

		const promise = new Promise((resolve, reject) => {
			const stream = fse.createWriteStream(p);
			req.on('data', chunk => stream.write(chunk));
			req.on('end', () => stream.end());
			req.on('error', async (e) => {
				stream.end();
				await cleanUp(p);
				reject(e);
			});
			stream.on('close', async () => {
				const filePath = this.workspace.getFileName(req.user._id, p);
				let response = {
					path: filePath
				};
				try {
					const newFileStat = await fse.stat(p);
					Object.assign(response, {
						size: newFileStat.size,
						modified: Utils.getISODateTime(newFileStat.mtime)
					});
				}
				catch (e) {
					if (this.context.debug) {
						console.error(e);
					}
				} finally {
					resolve(response);
				}
			});
			stream.on('error', async (e) => {
				await cleanUp(p);
				reject(e);
			});
		});

		const response = await promise;
		res.send(200, response);
	}

	async deleteFileByPath(req, res) {
		const p = this.init(req);
		await HttpUtils.isFile(p);
		await fse.unlink(p);
		res.send(204);
	}

	async getFileByPath(req, res) {
		const p = this.init(req);
		await HttpUtils.isFile(p);
		await new Promise((resolve, reject) => {
			const stream = fse.createReadStream(p);
			res.setHeader('Content-Type', 'application/octet-stream');
			stream.pipe(res);
			stream.on('error', reject);
			stream.on('close', () => {
				res.end();
				resolve();
			});
		});
	}

}
