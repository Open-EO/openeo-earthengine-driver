const Utils = require('../utils');

// ToDo: This method doesn't allow multiple connections per user id, e.g. different clients being connected. We may want to improve that.

module.exports = class SubscriptionConnection {

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