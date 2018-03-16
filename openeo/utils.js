function toISODate(timestamp) {
	return timestamp; // ToDo
}

function encodeQueryParams(data) {
	let ret = [];
	for (let d in data) {
		ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(data[d]));
	}
	return ret.join('&');
}

function size(obj) {
	return Object.keys(obj).length;
}

module.exports = {
	encodeQueryParams,
	size,
	toISODate
};
