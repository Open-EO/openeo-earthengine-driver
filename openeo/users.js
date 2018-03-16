function getUserCredits(req, res, next) {
	res.header('content-type', 'text/plain');
	res.send(200, "0");
	return next();
}

module.exports = {
	getUserCredits
};
