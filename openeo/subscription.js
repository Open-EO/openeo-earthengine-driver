var Subscription = {

	init() {
		const WebSocket = require('ws');
		this.websocketserver = new WebSocket.Server({noServer: true});
		console.log('INFO: WebSocket server initiated.');

		return new Promise((resolve, reject) => resolve());
	},

	routes(server) {
		server.addEndpoint('get', '/subscription', this.getSubscription.bind(this));
	},

	getSubscription(req, res, next) {
		if (!res.claimUpgrade) {
			res.send(400, 'In order to subscribe to jobs the connection must be upgradable to WebSockets.');
			return;
		}
		
		const wss = this.websocketserver;
		const upgrade = res.claimUpgrade();
		
		wss.handleUpgrade(req, upgrade.socket, upgrade.head, function done(ws) {
			wss.emit('connection', ws, req);
			console.log("Web sockets: Handled upgrade");
			setInterval(() => {
				ws.send("Hello World at " + (new Date()).toISOString() + "!");
				console.log("Web sockets: Sending a greeting.");
			}, 3000);
		});
		
		return next(false);
	}

};

module.exports = Subscription;