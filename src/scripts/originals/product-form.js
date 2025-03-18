if (!customElements.get("product-form")) {
	customElements.define(
		"product-form",
		class ProductForm extends HTMLElement {
			constructor() {
				super();

				this.form = this.querySelector("form");
				this.form.querySelector("[name=id]").disabled = false;
				this.form.addEventListener("submit", this.onSubmitHandler.bind(this));
				this.cart = document.querySelector("cart-notification") || document.querySelector("cart-drawer");
				this.submitButton = this.querySelector('[type="submit"]');

				if (document.querySelector("cart-drawer")) this.submitButton.setAttribute("aria-haspopup", "dialog");

				this.hideErrors = this.dataset.hideErrors === "true";
			}

			onSubmitHandler(evt) {
				evt.preventDefault();
				if (this.submitButton.getAttribute("aria-disabled") === "true") return;

				this.handleErrorMessage();

				this.submitButton.setAttribute("aria-disabled", true);
				this.submitButton.classList.add("loading");
				this.querySelector(".submit-title").classList.add("hidden");
				this.querySelector(".loading-overlay__spinner").classList.remove("hidden");

				const config = fetchConfig("javascript");
				config.headers["X-Requested-With"] = "XMLHttpRequest";
				delete config.headers["Content-Type"];

				const formData = new FormData(this.form);
				if (this.cart) {
					if (typeof this.cart.getSectionsToRender === "function") {
						formData.append(
							"sections",
							this.cart.getSectionsToRender().map(section => section.id)
						);
					} else {
						formData.append("sections", "");
					}
					formData.append("sections_url", window.location.pathname);
					if (typeof this.cart.setActiveElement === "function") {
						this.cart.setActiveElement(document.activeElement);
					}
				}
				config.body = formData;

				fetch(`${routes.cart_add_url}`, config)
					.then(response => response.json())
					.then(response => {
						if (response.status) {
							if (typeof publish === "function") {
								publish(PUB_SUB_EVENTS.cartError, {
									source: "product-form",
									productVariantId: formData.get("id"),
									errors: response.errors || response.description,
									message: response.message
								});
							}
							this.handleErrorMessage(response.description);

							const soldOutMessage = this.submitButton.querySelector(".sold-out-message");
							if (!soldOutMessage) return;
							this.submitButton.setAttribute("aria-disabled", true);
							this.submitButton.querySelector("span").classList.add("hidden");
							soldOutMessage.classList.remove("hidden");
							this.error = true;
							return;
						} else if (!this.cart) {
							window.location = window.routes.cart_url;
							return;
						}

						if (!this.error && typeof publish === "function") publish(PUB_SUB_EVENTS.cartUpdate, { source: "product-form", productVariantId: formData.get("id"), cartData: response });
						this.error = false;
						const quickAddModal = this.closest("quick-add-modal");
						if (quickAddModal) {
							document.body.addEventListener(
								"modalClosed",
								() => {
									setTimeout(() => {
										if (typeof this.cart.renderContents === "function") {
											this.cart.renderContents(response);
										}
									});
								},
								{ once: true }
							);
							quickAddModal.hide(true);
						} else {
							if (typeof this.cart.renderContents === "function") {
								this.cart.renderContents(response);
							}
						}
					})
					.catch(e => {
						console.error(e);
					})
					.finally(() => {
						this.submitButton.classList.remove("loading");
						if (this.cart && this.cart.classList.contains("is-empty")) this.cart.classList.remove("is-empty");
						if (!this.error) this.submitButton.removeAttribute("aria-disabled");
						this.querySelector(".submit-title").classList.remove("hidden");
						this.querySelector(".loading-overlay__spinner").classList.add("hidden");
						let quantityElement = this.form.querySelector("[name=quantity]");
						if (quantityElement) quantityElement.value = 1;
					});
			}

			handleErrorMessage(errorMessage = false) {
				if (this.hideErrors) return;

				this.errorMessageWrapper = this.errorMessageWrapper || this.querySelector(".product-form__error-message-wrapper");
				if (!this.errorMessageWrapper) return;
				this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector(".product-form__error-message");

				this.errorMessageWrapper.toggleAttribute("hidden", !errorMessage);

				if (errorMessage) {
					this.errorMessage.textContent = errorMessage;
				}
			}
		}
	);
}

const ON_CHANGE_DEBOUNCE_TIMER = 300;

const PUB_SUB_EVENTS = {
	cartUpdate: "cart-update",
	quantityUpdate: "quantity-update",
	variantChange: "variant-change"
};

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

class QuantityInput extends HTMLElement {
	constructor() {
		super();
		this.input = this.querySelector("input");
		this.changeEvent = new Event("change", { bubbles: true });

		this.input.addEventListener("change", this.onInputChange.bind(this));
		this.querySelectorAll("button").forEach(button => button.addEventListener("click", this.onButtonClick.bind(this)));
	}

	quantityUpdateUnsubscriber = undefined;

	connectedCallback() {
		this.validateQtyRules();
		this.quantityUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.quantityUpdate, this.validateQtyRules.bind(this));
	}

	disconnectedCallback() {
		if (this.quantityUpdateUnsubscriber) {
			this.quantityUpdateUnsubscriber();
		}
	}

	onInputChange(event) {
		this.validateQtyRules();
	}

	onButtonClick(event) {
		event.preventDefault();
		const previousValue = this.input.value;

		event.target.name === "plus" ? this.input.stepUp() : this.input.stepDown();
		if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);
	}

	validateQtyRules() {
		const value = parseInt(this.input.value);
		if (this.input.min) {
			const min = parseInt(this.input.min);
			const buttonMinus = this.querySelector(".quantity__button[name='minus']");
			buttonMinus.classList.toggle("disabled", value <= min);
		}
		if (this.input.max) {
			const max = parseInt(this.input.max);
			const buttonPlus = this.querySelector(".quantity__button[name='plus']");
			buttonPlus.classList.toggle("disabled", value >= max);
		}
	}
}

customElements.define("quantity-input", QuantityInput);

function debounce(fn, wait) {
	let t;
	return (...args) => {
		clearTimeout(t);
		t = setTimeout(() => fn.apply(this, args), wait);
	};
}

function fetchConfig(type = "json") {
	return {
		method: "POST",
		headers: { "Content-Type": "application/json", Accept: `application/${type}` }
	};
}
