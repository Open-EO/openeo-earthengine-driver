const Utils = require('./utils');
const WebSocket = require('ws');

// ToDo: This method doesn't allow multiple connections per user id, e.g. different clients bein connected. We may want to improve that.

class SubscriptionConnection {

	constructor(parent, connection, user_id) {
		this.parent = parent;
		this.connection = connection;
		this.authorized = 
		this.user_id = user_id;
		this.topics = new Map();
		this.sendWelcomeMessage();
	}

	subscribe(topics) {
		for(var i in topics) {
			var hash = Utils.hashJSON(topics[i]);
			this.topics.set(hash, topics[i]);
		}
	}

	unsubscribe(topics) {
		for(var i in topics) {
			var hash = Utils.hashJSON(topics[i]);
			this.topics.delete(hash);
		}
	}

	isSubscribed(topic, params) {
		params.topic = topic;
		var hash = Utils.hashJSON(params);
		return (topics.get(hash) !== 'undefined');
	}

	sendWelcomeMessage() {
		var payload = {
			topics: this.parent.topics
		};
		this.sendMessage("openeo.welcome", payload);
	}

	sendMessage(topic, payload) {
		var message = {
			message: {
				issued: (new Date()).toISOString(),
				topic: topic
			},
			payload: payload
		};
		
		this.connection.send(JSON.stringify(message));
	}

	sendMessageIfSubscribed(topic, params, payload) {
		if (!this.isSubscribed(topic, params)) {
			return;
		}

		this.sendMessage(this.user_id, topic, payload);
	}

	close() {
		this.connection.close();
	}

};

module.exports = class SubscriptionsAPI {

	constructor() {
		this.connections = new Map();
		this.topics = [];
		this.websocketserver = new WebSocket.Server({noServer: true});
		console.log('WebSocket Server started.');
	}

	beforeServerStart(server) {
//		server.addEndpoint('get', '/subscription', this.getSubscription.bind(this));  // ToDo

		return new Promise((resolve, reject) => resolve());
	}

	createConnection(ws, user_id) {
		var oldConnection = this.connections.get(user_id);
		if (typeof oldConnection !== 'undefined') {
			oldConnection.close();
		}

		var con = new SubscriptionConnection(this, ws, user_id);
		this.connections.set(user_id, con);
		return con;
	}

	registerTopic(topic) {
		this.topics.push(topic);
	}

	broadcast(topic, params, payload) {
		this.connections.forEach(con => {
			con.sendMessage(topic, params, payload);
		});
	}

	publishToAll(topic, params, payload) {
		this.connections.forEach(con => {
			con.sendMessageIfSubscribed(topic, params, payload);
		});
	}

	publish(req, topic, params, payload) {
		let con = this.getConnectionForAuthenticatedUser(req);
		if (con !== null) {
			con.sendMessageIfSubscribed(topic, params, payload);
		}
	}

	getConnectionForAuthenticatedUser(req) {
		if (!req.user._id) {
			return null;
		}

		let con = this.connections.get(req.user._id);
		return typeof con !== 'undefined' ? con : null;
	}

	getSubscription(req, res, next) {
		if (!req.user._id) {
			return next(new Errors.AuthenticationRequired());
		}
		if (!res.claimUpgrade) {
			return next(new Errors.WebSocketUpgradeNotRequested());
		}
		
		const user_id = req.user._id;
		const wss = this.websocketserver;
		const upgrade = res.claimUpgrade();
		
		wss.handleUpgrade(req, upgrade.socket, upgrade.head, (ws) => {
			wss.emit('connection', ws, req);

			var con = this.createConnection(ws, user_id);

			ws.on('message', data => {
				// ToDO: Error handling for invalid data
				var json = JSON.parse(data);
				if (typeof json.message.topic !== 'string' || !json.payload.topics || !Array.isArray(json.payload.topics)) {
					return;
				}
				switch(json.message.topic) {
					case 'openeo.authorize':
						con.authorize(json.payload.topics);
						break;
					case 'openeo.subscribe':
						con.subscribe(json.payload.topics);
						break;
					case 'openeo.unsubscribe':
						con.unsubscribe(json.payload.topics);
						break;
				}
			});
		 
			ws.on('close', () => {
				this.connections.delete(user_id);
			});
		});
		
		return; // Don't continue request chain after protocol upgrade so don't call next()
	}

};