const API = {

	origin: null,
	path: null,

	getUrl(endpoint = '') {
		if (this.origin === null || this.path === null) {
			console.warn('Server has not started yet, API.getUrl() is not available yet.');
		}
		return this.origin + this.path + endpoint;
	},

	getBaseUrl() {
		if (this.origin === null || this.path === null) {
			console.warn('Server has not started yet, API.getBaseUrl() is not available yet.');
		}
		return this.origin;
	}

};

export default API;
