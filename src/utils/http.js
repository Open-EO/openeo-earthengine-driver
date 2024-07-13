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

	async getFile(filepath) {
		try {
			const stat = await fse.stat(filepath);
			if (stat.isFile()) {
				return stat;
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

	sendFile(filepath, res, range = null) {
		res.header('Content-Type', Utils.extensionToMediaType(filepath));
		const options = {};
		if (Utils.isObject(range)) {
			options.start = range.start;
			options.end = range.end;
			res.status(206);
			res.header('Content-Range', `bytes ${range.start}-${range.end}/${range.maxLength}`);
			res.header('Content-Length', range.length);
		}
		return new Promise((resolve, reject) => {
			const stream = fse.createReadStream(filepath, options);
			stream.pipe(res);
			stream.on('error', reject);
			stream.on('close', () => {
				res.end();
				resolve();
			});
		});
	},

	parseRangeHeader(header, maxLength) {
		if (typeof header !== 'string') {
				return null;
		}

		const match = header.match(/^bytes=(\d*)-(\d*)$/);
		if (!match) {
			throw new Errors.RangeNotSatisfiableError();
		}

		let [start, end] = match.slice(1).map(x => parseInt(x, 10));
		const lastByte = maxLength - 1;
		if (end > lastByte) {
			end = lastByte;
		}
		const result = {
				start: isNaN(start) ? 0 : start,
				end: isNaN(end) ? lastByte : end,
				maxLength
		};
		if (!isNaN(start) && isNaN(end)) {
			result.end = lastByte;
		}
		else if (isNaN(start) && !isNaN(end)) {
			result.start = maxLength - end;
			result.end = lastByte;
		}
		result.length = result.end - result.start + 1;

		if (result.start > result.end || result.start >= maxLength) {
			throw new Errors.RangeNotSatisfiableError();
		}

		return result;
	}

};

export default HttpUtils;
