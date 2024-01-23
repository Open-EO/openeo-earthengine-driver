import axios from 'axios';
import Errors from './errors.js';
import fse from 'fs-extra';

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

	async isFile(path) {
		try {
			const stat = await fse.stat(path);
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

	stream(opts) {
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
					error.response.data.on("end", () => reject(new Errors.EarthEngineError({
						message: Buffer.concat(chunks).toString(),
						process: 'save_result'
					})));
				});
			}
			throw error;
		});

	},
};

export default HttpUtils;
