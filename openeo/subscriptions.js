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
		return (this.topics.get(hash) !== 'undefined');
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
		
		if (this.connection.readyState === this.connection.OPEN) {
			this.connection.send(JSON.stringify(message));
		}
	}

	sendMessageIfSubscribed(topic, params, payload) {
		if (!this.isSubscribed(topic, params)) {
			return;
		}

		this.sendMessage(topic, payload);
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
		server.addEndpoint('get', '/subscription', this.getSubscription.bind(this));

		return Promise.resolve();
	}

	createConnection(ws, user_id) {
		var oldConnection = this.connections.get(user_id);
		if (typeof oldConnection !== 'undefined') {
			oldConnection.close();
		}

		ws.user_id = user_id;
		var con = new SubscriptionConnection(this, ws, user_id);
		this.connections.set(user_id, con);
		return con;
	}

	registerTopic(topic) {
		this.topics.push(topic);
	}

	broadcast(topic, params, payload) {
		this.connections.forEach(con => {
			con.sendMessage(topic, payload);
		});
	}

	publishToAll(topic, params, payload) {
		this.connections.forEach(con => {
			con.sendMessageIfSubscribed(topic, params, payload);
		});
	}

	publish(user_id, topic, params, payload) {
		let con = this.getConnection(user_id);
		if (con !== null) {
			con.sendMessageIfSubscribed(topic, params, payload);
		}
	}

	getConnection(user_id) {
		if (!user_id) {
			return null;
		}

		let con = this.connections.get(user_id);
		return typeof con !== 'undefined' ? con : null;
	}

	xscribe(json, user_id, subscribe) {
		if (typeof json.payload.topics === 'object' && Array.isArray(json.payload.topics)) {
			var con = this.getConnection(user_id);
			if (con !== null) {
				if (subscribe) {
					con.subscribe(json.payload.topics);
				}
				else {
					con.unsubscribe(json.payload.topics);
				}
			}
		}
	}

	checkAuth(req, auth) {
		var i = auth.indexOf(' ');
		var scheme = auth.slice(0, i);
		var token = auth.slice(i+1);
		if (scheme !== 'Bearer') {
			throw new Error("Invalid authorization schema provided.");
		}

		return req.api.users.checkAuthToken(token);
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

				this.checkAuth(req, json.authorization)
				.then((user) => {
					if (typeof json.message.topic !== 'string') {
						return;
					}

					switch(json.message.topic) {
						case 'openeo.authorize':
							this.createConnection(ws, user._id);
							break;
						case 'openeo.subscribe':
							this.xscribe(json, user._id, true);
							break;
						case 'openeo.unsubscribe':
							this.xscribe(json, user._id, false);
							break;
					}
				})
				.catch(err => {
					if (global.server.config.debug) {
						console.log(err);
					}
					ws.close();
				});
			});
		 
			ws.on('close', () => {
				if (ws.user_id) {
					this.connections.delete(ws.user_id);
				}
			});
		});
		
		return; // Don't continue request chain after protocol upgrade so don't call next()
	}

};