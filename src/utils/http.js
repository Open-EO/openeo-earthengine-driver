import axios from 'axios';
import Errors from './errors.js';
import fse from 'fs-extra';
import Utils from './utils.js';
import path from 'path';

const HttpUtils = {

	createResponse(data, headers = {}) {
		return {
			data,
			status: 200,
			statusText: "OK",
			headers,
			config: {},
			request: {}
		};
	},

	async get(url, headers = {}) {
		const response = await axios.get(url, {
			headers
		});
		return response.data;
	},

	async isFile(filepath) {
		try {
			const stat = await fse.stat(filepath);
			if (stat.isFile()) {
				return true;
			}
			else {
				throw new Errors.FileOperationUnsupported();
			}
		} catch (err) {
			throw new Errors.FileNotFound();
		}
	},

	stream(opts, process="save_result") {
		if (typeof opts === 'string') {
			opts = {
				method: 'get',
				url: opts,
				responseType: 'stream'
			};
		}
		return axios(opts).catch(error => {
			if (opts.responseType === 'stream' && error.response !== null && typeof error.response === 'object' && error.response.data !== null) {
				// JSON error responses are Blobs and streams if responseType is set as such, so convert to JSON if required.
				// See: https://github.com/axios/axios/issues/815
				return new Promise((_, reject) => {
					const chunks = [];
					error.response.data.on("data", chunk => chunks.push(chunk));
					error.response.data.on("error", () => reject(error));
					error.response.data.on("end", () => {
						const content = Buffer.concat(chunks).toString();
						let message = content;
						try {
							const obj = JSON.parse(content);
							if (obj?.error?.message) {
								message = obj.error.message;
							}
						} catch (e) {
							// invalid JSON
						}
						reject(new Errors.EarthEngineError({
							message,
							process
						}))
					});
				});
			}
			throw error;
		});
	},

	async streamToFile(url, filepath, res = null) {
		await fse.ensureDir(path.dirname(filepath));
		return await new Promise((resolve, reject) => {
			const fileStream = fse.createWriteStream(filepath);
			axios.get(url, {responseType: 'stream'})
				.then(response => {
					response.data.pipe(fileStream);
					if (res) {
						res.header('Content-Type', Utils.extensionToMediaType(filepath));
						response.data.pipe(res);
					}
					fileStream.on('close', () => resolve());
					fileStream.on('error', (e) => reject(e));
				})
				.catch(e => {
					fileStream.end();
					reject(e);
				});
		});
	},

	sendFile(filepath, res) {
		res.header('Content-Type', Utils.extensionToMediaType(filepath));
		return new Promise((resolve, reject) => {
			const stream = fse.createReadStream(filepath);
			stream.pipe(res);
			stream.on('error', reject);
			stream.on('close', () => {
				res.end();
				resolve();
			});
		});
	}

};

export default HttpUtils;
