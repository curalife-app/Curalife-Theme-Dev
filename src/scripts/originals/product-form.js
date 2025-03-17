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
