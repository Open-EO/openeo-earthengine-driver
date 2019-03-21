const WebSocket = require('ws');
const Errors = require('../errors');

module.exports = class SubscriptionsAPI {

	constructor(context) {
		this.pool = context.subscriptions();
		this.context = context;
		this.websocketserver = new WebSocket.Server({noServer: true});
		console.log('WebSocket Server started.');
	}

	beforeServerStart(server) {
		server.addEndpoint('get', '/subscription', this.getSubscription.bind(this));

		return Promise.resolve();
	}

	getSubscription(req, res, next) {
		if (!res.claimUpgrade) {
			return next(new Errors.WebSocketUpgradeNotRequested());
		}

		const wss = this.websocketserver;
		const upgrade = res.claimUpgrade();
		
		wss.handleUpgrade(req, upgrade.socket, upgrade.head, (ws) => {
			wss.emit('connection', ws, req);

			ws.on('message', data => {
				// ToDo: Error handling for invalid JSON data
				var json = JSON.parse(data);
	
				if (typeof json.authorization !== 'string') {
					ws.close();
					throw new Error("No authorization details provided.");
				}

				// Split authorizantion header
				var i = json.authorization.indexOf(' ');
				var scheme = json.authorization.slice(0, i);
				var token = json.authorization.slice(i+1);
				if (scheme !== 'Bearer') {
					throw new Error("Invalid authorization schema provided.");
				}
		
				this.context.users().checkAuthToken(token)
				.then((user) => {
					if (typeof json.message.topic !== 'string') {
						return;
					}

					switch(json.message.topic) {
						case 'openeo.authorize':
							this.pool.createConnection(ws, user._id);
							break;
						case 'openeo.subscribe':
							this.pool.subscribe(json, user._id);
							break;
						case 'openeo.unsubscribe':
							this.pool.unsubscribe(json, user._id);
							break;
					}
				})
				.catch(err => {
					if (this.context.debug) {
						console.log(err);
					}
					ws.close();
				});
			});
		 
			ws.on('close', () => {
				if (ws.user_id) {
					this.pool.closeConnection(ws.user_id);
				}
			});
		});
		
		return; // Don't continue request chain after protocol upgrade so don't call next()
	}

};