// class QuantityInput extends HTMLElement {
// 	constructor() {
// 		super();
// 		this.input = this.querySelector("input");
// 		this.changeEvent = new Event("change", { bubbles: true });

// 		this.input.addEventListener("change", this.onInputChange.bind(this));
// 		this.querySelectorAll("button").forEach(button => button.addEventListener("click", this.onButtonClick.bind(this)));
// 	}

// 	quantityUpdateUnsubscriber = undefined;

// 	connectedCallback() {
// 		this.validateQtyRules();
// 		this.quantityUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.quantityUpdate, this.validateQtyRules.bind(this));
// 	}

// 	disconnectedCallback() {
// 		if (this.quantityUpdateUnsubscriber) {
// 			this.quantityUpdateUnsubscriber();
// 		}
// 	}

// 	onInputChange(event) {
// 		this.validateQtyRules();
// 	}

// 	onButtonClick(event) {
// 		event.preventDefault();
// 		const previousValue = this.input.value;

// 		event.target.name === "plus" ? this.input.stepUp() : this.input.stepDown();
// 		if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);
// 	}

// 	validateQtyRules() {
// 		const value = parseInt(this.input.value);
// 		if (this.input.min) {
// 			const min = parseInt(this.input.min);
// 			const buttonMinus = this.querySelector(".quantity__button[name='minus']");
// 			buttonMinus.classList.toggle("disabled", value <= min);
// 		}
// 		if (this.input.max) {
// 			const max = parseInt(this.input.max);
// 			const buttonPlus = this.querySelector(".quantity__button[name='plus']");
// 			buttonPlus.classList.toggle("disabled", value >= max);
// 		}
// 	}
// }

// customElements.define("quantity-input", QuantityInput);

// function debounce(fn, wait) {
// 	let t;
// 	return (...args) => {
// 		clearTimeout(t);
// 		t = setTimeout(() => fn.apply(this, args), wait);
// 	};
// }

// function fetchConfig(type = "json") {
// 	return {
// 		method: "POST",
// 		headers: { "Content-Type": "application/json", Accept: `application/${type}` }
// 	};
// }

/*
 * Shopify Common JS
 *
 */
if (typeof window.Shopify == "undefined") {
	window.Shopify = {};
}

Shopify.bind = function (fn, scope) {
	return function () {
		return fn.apply(scope, arguments);
	};
};

Shopify.setSelectorByValue = function (selector, value) {
	for (var i = 0, count = selector.options.length; i < count; i++) {
		var option = selector.options[i];
		if (value == option.value || value == option.innerHTML) {
			selector.selectedIndex = i;
			return i;
		}
	}
};

Shopify.addListener = function (target, eventName, callback) {
	target.addEventListener ? target.addEventListener(eventName, callback, false) : target.attachEvent("on" + eventName, callback);
};

Shopify.postLink = function (path, options) {
	options = options || {};
	var method = options["method"] || "post";
	var params = options["parameters"] || {};

	var form = document.createElement("form");
	form.setAttribute("method", method);
	form.setAttribute("action", path);

	for (var key in params) {
		var hiddenField = document.createElement("input");
		hiddenField.setAttribute("type", "hidden");
		hiddenField.setAttribute("name", key);
		hiddenField.setAttribute("value", params[key]);
		form.appendChild(hiddenField);
	}
	document.body.appendChild(form);
	form.submit();
	document.body.removeChild(form);
};

Shopify.CountryProvinceSelector = function (country_domid, province_domid, options) {
	this.countryEl = document.getElementById(country_domid);
	this.provinceEl = document.getElementById(province_domid);
	this.provinceContainer = document.getElementById(options["hideElement"] || province_domid);

	Shopify.addListener(this.countryEl, "change", Shopify.bind(this.countryHandler, this));

	this.initCountry();
	this.initProvince();
};

Shopify.CountryProvinceSelector.prototype = {
	initCountry: function () {
		var value = this.countryEl.getAttribute("data-default");
		Shopify.setSelectorByValue(this.countryEl, value);
		this.countryHandler();
	},

	initProvince: function () {
		var value = this.provinceEl.getAttribute("data-default");
		if (value && this.provinceEl.options.length > 0) {
			Shopify.setSelectorByValue(this.provinceEl, value);
		}
	},

	countryHandler: function (e) {
		var opt = this.countryEl.options[this.countryEl.selectedIndex];
		var raw = opt.getAttribute("data-provinces");
		var provinces = JSON.parse(raw);

		this.clearOptions(this.provinceEl);
		if (provinces && provinces.length == 0) {
			this.provinceContainer.style.display = "none";
		} else {
			for (var i = 0; i < provinces.length; i++) {
				var opt = document.createElement("option");
				opt.value = provinces[i][0];
				opt.innerHTML = provinces[i][1];
				this.provinceEl.appendChild(opt);
			}

			this.provinceContainer.style.display = "";
		}
	},

	clearOptions: function (selector) {
		while (selector.firstChild) {
			selector.removeChild(selector.firstChild);
		}
	},

	setOptions: function (selector, values) {
		for (var i = 0, count = values.length; i < values.length; i++) {
			var opt = document.createElement("option");
			opt.value = values[i];
			opt.innerHTML = values[i];
			selector.appendChild(opt);
		}
	}
};
