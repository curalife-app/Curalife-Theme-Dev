// Guard against multiple script loading
if (typeof window.subscribe === "undefined") {
	let subscribers = {};

	function subscribe(eventName, callback) {
		if (subscribers[eventName] === undefined) {
			subscribers[eventName] = [];
		}

		subscribers[eventName] = [...subscribers[eventName], callback];

		return function unsubscribe() {
			subscribers[eventName] = subscribers[eventName].filter(cb => {
				return cb !== callback;
			});
		};
	}

	function publish(eventName, data) {
		if (subscribers[eventName]) {
			subscribers[eventName].forEach(callback => {
				callback(data);
			});
		}
	}

	// Make pubsub functions globally available for all bundles
	window.subscribe = subscribe;
	window.publish = publish;
}
