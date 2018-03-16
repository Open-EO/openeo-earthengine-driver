const outputFormats = {
	PNG: {},
	JPEG: {}
};

function getCapabilities(req, res, next) {
	res.json([
		'/capabilities/services',
		'/capabilities/output_formats',
		'/data',
		'/data/{product_id}',
		'/processes',
		'/processes/{process_id}',
		'/execute',
		'/users/{user_id}/credits'
	]);
	return next();
}

function getServices(req, res, next) {
	res.json([]);
	return next();
}

function isValidOutputFormat(format) {
	return (typeof outputFormats[format.toUpperCase()] === 'object') ? true : false;
}

function getDefaultOutputFormat() {
	return "JPEG";
}

function translateOutputFormat(format) {
	format = format.toLowerCase();
	switch(format) {
		case 'jpeg':
			return 'jpg';
		default:
			return format;
	}
}

function getOutputFormats(req, res, next) {

	res.json({
		default: getDefaultOutputFormat(),
		formats: outputFormats
	});
	return next();
}


module.exports = {
	getCapabilities,
	getServices,
	getOutputFormats,
	getDefaultOutputFormat,
	isValidOutputFormat,
	translateOutputFormat
};

