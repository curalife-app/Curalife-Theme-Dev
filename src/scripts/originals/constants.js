// Guard against multiple script loading
if (typeof window.ON_CHANGE_DEBOUNCE_TIMER === "undefined") {
	const ON_CHANGE_DEBOUNCE_TIMER = 300;

	const PUB_SUB_EVENTS = {
		cartUpdate: "cart-update",
		quantityUpdate: "quantity-update",
		variantChange: "variant-change"
	};

	// Debounce utility function - used by cart, product-form, and other components
	function debounce(fn, wait) {
		let t;
		return (...args) => {
			clearTimeout(t);
			t = setTimeout(() => fn.apply(this, args), wait);
		};
	}

	// Fetch configuration utility - used by cart, product-form, and other components
	function fetchConfig(type = "json") {
		return {
			method: "POST",
			headers: { "Content-Type": "application/json", Accept: `application/${type}` }
		};
	}

	// Make utility functions and constants globally available for all bundles
	window.debounce = debounce;
	window.fetchConfig = fetchConfig;
	window.ON_CHANGE_DEBOUNCE_TIMER = ON_CHANGE_DEBOUNCE_TIMER;
	window.PUB_SUB_EVENTS = PUB_SUB_EVENTS;
}
