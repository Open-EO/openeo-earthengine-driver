const SubscriptionConnection = require('./connection');

module.exports = class SubscriptionsPool {

	constructor() {
		this.connections = new Map();
		this.topics = [];

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

	closeConnection(user_id) {
		this.connections.delete(user_id);
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

	subscribe(json, user_id) {
		this.xscribe(json, user_id, true);
	}

	unsubscribe(json, user_id) {
		this.xscribe(json, user_id, false);
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

};