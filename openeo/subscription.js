const Utils = require('./utils');

var Subscription = {

	connections: new Map(),
	subscriptions: new Map(),
	topics: [],

	init() {
		const WebSocket = require('ws');
		this.websocketserver = new WebSocket.Server({noServer: true});
		console.log('INFO: Subscriptions loaded - WebSocket Server started.');

		return new Promise((resolve, reject) => resolve());
	},

	routes(server) {
		server.addEndpoint('get', '/subscription', this.getSubscription.bind(this));
	},

	_createConnection(ws, user_id) {
		var oldWs = this.connections.get(user_id);
		if (typeof oldWs !== 'undefined') {
			oldWs.close();
		}

		this.connections.set(user_id, ws);
		this.subscriptions.set(user_id, new Map());
		console.log("Created websocket connection for " + user_id);
	},

	_getConnection(user_id) {
		return this.connections.get(user_id);
	},

	_removeConnection(user_id) {
		this.subscriptions.delete(user_id);
		this.connections.delete(user_id);
		console.log("Closed websocket connection for " + user_id);
	},

	_sendResponse(ws, topic, payload) {
		var message = {
			message: {
				issued: (new Date()).toISOString(),
				topic: topic
			},
			payload: payload
		};
		
		ws.send(JSON.stringify(message));
		console.log("Sent message for topic " + topic);
	},

	_sendWelcomeMessage(ws) {
		var payload = {
			topics: this.topics
		};
		this._sendResponse(ws, "openeo.welcome", payload);
	},

	_handleSubscribe(user_id, topics) {
		var subs = this.subscriptions.get(user_id);
		for(var i in topics) {
			var hash = Utils.hashJSON(topics[i]);
			subs.set(hash, topics[i]);
			console.log("Subscribed to " + JSON.stringify(topics[i]));
		}
	},

	_handleUnsubscribe(user_id, topics) {
		var subs = this.subscriptions.get(user_id);
		for(var i in topics) {
			var hash = Utils.hashJSON(topics[i]);
			subs.delete(hash);
			console.log("Unsubscribed from " + JSON.stringify(topics[i]));
		}
	},

	registerTopic(topic) {
		this.topics.push(topic);
		console.log("Registered topic " + topic);
	},

	isSubscribed(user_id, topic, params) {
		params.topic = topic;
		var subs = this.subscriptions.get(user_id);
		var hash = Utils.hashJSON(params);
		if (typeof subs.get(hash) !== 'undefined') {
			return true;
		}
		else {
			return false;
		}
	},

	sendMessage(user_id, topic, payload) {
		var ws = this._getConnection(user_id);
		this._sendResponse(ws, topic, payload);
	},

	sendMessageIfSubscribed(user_id, topic, params, payload) {
		if (!this.isSubscribed(user_id, topic, params)) {
			return;
		}

		this.sendMessage(user_id, topic, payload);
	},

	getSubscription(req, res, next) {
		if (!req.user._id) {
			res.send(403);
			return next();
		}
		if (!res.claimUpgrade) {
			res.send(400, 'In order to subscribe to jobs the connection must be upgradable to WebSockets.');
			return;
		}
		
		const user_id = req.user._id;
		const wss = this.websocketserver;
		const upgrade = res.claimUpgrade();
		
		wss.handleUpgrade(req, upgrade.socket, upgrade.head, (ws) => {
			wss.emit('connection', ws, req);

			this._createConnection(ws, user_id);
			this._sendWelcomeMessage(ws);

			ws.on('message', data => {
				// ToDO: Error handling for invalid data
				var json = JSON.parse(data);
				if (typeof json.message.topic !== 'string' || !json.payload.topics || !Array.isArray(json.payload.topics)) {
					return;
				}
				switch(json.message.topic) {
					case 'openeo.subscribe':
						this._handleSubscribe(user_id, json.payload.topics);
						break;
					case 'openeo.unsubscribe':
						this._handleUnsubscribe(user_id, json.payload.topics);
						break;
				}
			});
		 
			ws.on('close', () => {
				this._removeConnection(user_id);
			});
		});
		
		return next(false);
	}

};

module.exports = Subscription;