/**
 * Curalife Buy Box - Shared JavaScript
 * This file contains shared functionality for all buy box types.
 * It manages cart operations, UI state, and common interaction patterns.
 */

window.CuralifeBoxes = window.CuralifeBoxes || {
	instances: {},
	initialized: false,

	/**
	 * Core utility functions used across all buy box instances
	 */
	utils: {
		/**
		 * Display a notification message to the user
		 * @param {string} msg - The message to display
		 * @param {string} type - The notification type ('error', 'success', or 'debug')
		 * @param {boolean} forceShow - Whether to show the notification regardless of debug mode
		 */
		showNotification(msg, type = "error", forceShow = false) {
			// Check if this is a debug message and debug mode is not enabled
			if (type === "debug" && !this.isDebugMode && !forceShow) {
				// Only log to console if debug message is suppressed
				console.log("[Debug]", msg);
				return;
			}

			const note = document.createElement("div");
			note.className = `
        cart-notification ${type}
        fixed bottom-4 left-1/2 transform -translate-x-1/2
        p-4 rounded-lg shadow-lg z-[2147483640]
        transition-opacity duration-300
      `.replace(/\s+/g, " ");

			if (type === "error") {
				note.classList.add("bg-red-100", "border", "border-red-400", "text-red-700");
			} else if (type === "debug") {
				note.classList.add("bg-blue-100", "border", "border-blue-400", "text-blue-700");
			} else {
				note.classList.add("bg-green-100", "border", "border-green-400", "text-green-700");
			}

			note.innerHTML = `
        <div class="flex items-center">
          <div class="mr-3">${type === "error" ? "⚠️" : type === "debug" ? "🔍" : "✅"}</div>
          <div class="text-sm font-medium">${msg}</div>
          <button
            class="hover:text-gray-500 ml-auto text-gray-400"
            onclick="this.parentElement.parentElement.remove()"
          >
            ✕
          </button>
        </div>
      `;
			document.body.appendChild(note);
			setTimeout(() => {
				note.classList.add("opacity-0");
				setTimeout(() => note.remove(), 300);
			}, 5000);
		},

		/**
		 * Set debug mode
		 * @param {boolean} isDebug - Whether debug mode is enabled
		 */
		setDebugMode(isDebug) {
			this.isDebugMode = !!isDebug;
		},

		// Initialize debug mode to false by default
		isDebugMode: false,

		/**
		 * Fetch the current cart state
		 * @param {boolean} forceRefresh - Whether to bypass cache
		 * @returns {Promise<Object>} The cart data
		 */
		async getCart(forceRefresh = false) {
			try {
				const now = Date.now();
				const res = await fetch("/cart.js?t=" + now, {
					cache: "no-store",
					headers: {
						"Cache-Control": "no-cache",
						Pragma: "no-cache"
					}
				});

				if (!res.ok) throw new Error("Failed to fetch cart");
				return await res.json();
			} catch (err) {
				console.error("Error in getCart:", err);
			}
		},

		/**
		 * Clear all items from the cart
		 * @returns {Promise<Object>} The empty cart data
		 */
		async clearCart() {
			try {
				const res = await fetch("/cart/clear.js", {
					method: "POST",
					cache: "no-store",
					headers: {
						"Cache-Control": "no-cache",
						Pragma: "no-cache"
					}
				});

				if (!res.ok) {
					const errorData = await res.json();
					throw Object.assign(new Error("Failed to clear cart"), { response: errorData });
				}

				return res.json();
			} catch (err) {
				console.error("Error clearing cart:", err);
				throw err;
			}
		},

		/**
		 * Remove a specific item from the cart
		 * @param {string} key - The cart item key
		 * @returns {Promise<Object>} The updated cart data
		 */
		async removeCartItem(key) {
			try {
				const res = await fetch("/cart/update.js", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ updates: { [key]: 0 } })
				});

				if (!res.ok) {
					const errorData = await res.json();
					throw Object.assign(new Error("Failed to remove item"), { response: errorData });
				}

				return res.json();
			} catch (err) {
				console.error("Error removing cart item:", err);
				throw err;
			}
		},

		/**
		 * Add items to the cart
		 * @param {Array} items - The items to add
		 * @returns {Promise<Object>} The updated cart data
		 */
		async addToCart(items) {
			try {
				console.log("Adding items to cart:", JSON.stringify(items));

				const res = await fetch("/cart/add.js", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Cache-Control": "no-cache"
					},
					cache: "no-store",
					body: JSON.stringify({ items })
				});

				console.log("Cart add response status:", res.status);
				const responseText = await res.text();

				let responseData;
				try {
					responseData = JSON.parse(responseText);
				} catch (e) {
					console.error("Failed to parse response as JSON:", e);
					throw new Error("Invalid response from server");
				}

				if (!res.ok) {
					throw Object.assign(new Error(responseData.description || "Failed to add items to cart"), { response: responseData });
				}

				return responseData;
			} catch (err) {
				console.error("Error in addToCart:", err);
				throw err;
			}
		},

		/**
		 * Safely parse a number from a string or other value
		 * @param {*} value - The value to parse
		 * @param {number} defaultValue - Default value if parsing fails
		 * @returns {number} The parsed number or default value
		 */
		safeParseInt(value, defaultValue = 0) {
			if (value === undefined || value === null) return defaultValue;
			const parsed = parseInt(value, 10);
			return isNaN(parsed) ? defaultValue : parsed;
		},

		/**
		 * Format price using the shop's money format
		 * @param {number} cents - Price in cents
		 * @returns {string} Formatted price string
		 */
		formatMoney(cents) {
			const currencySymbol = window.Shopify?.currency?.active === "GBP" ? "£" : window.Shopify?.currency?.active === "USD" ? "$" : window.Shopify?.currency?.symbol || "$";
			return `${currencySymbol}${(cents / 100).toFixed(2)}`;
		}
	},

	/**
	 * Create a new buy box instance or return an existing one
	 * @param {string} SID - Section ID
	 * @returns {Object} The buy box instance
	 */
	createInstance(SID) {
		if (this.instances[SID]) return this.instances[SID];

		this.instances[SID] = {
			SID,

			// State management
			state: {
				isLoading: false,
				selectedBox: null,
				isInitialLoad: true,
				purchaseType: "subscribe",
				buyType: "add_to_cart",
				isRedirectingToCheckout: false,
				isDebug: false,

				// Global settings from section
				defaultSelectionIndex: 1,
				priceFormat: "total",
				saveFormat: "percentage",
				pricePer: "dont_split",
				thumbsLayout: "horizontal",

				// Feature flags
				isOneTimePurchase: false,
				isOneTimeGift: false,
				isSlideVariant: true,
				isPrimeEnabled: false,
				isShowReviews: false,
				isProductThumbs: true,
				isHideThumbs: false,
				isHideInfo: false,
				isBuyQuantity: false
			},

			// Elements
			elements: {
				section: document.getElementById(`cta-section-${SID}`),
				productActions: null,
				purchaseOptionBoxes: null,
				submitButton: null,
				submitSellingPlanId: null,
				submitVariantId: null,
				oneTimeButton: null,
				giftOptionContainers: null,
				priceDisplay: null,
				buyForm: null
			},

			/**
			 * Set state and update UI accordingly
			 * @param {Object} updates - State updates
			 */
			setState(updates) {
				Object.assign(this.state, updates);

				// Update UI based on state changes
				if ("isLoading" in updates) {
					this.updateLoadingState(this.state.isLoading);
				}
			},

			/**
			 * Update UI to reflect loading state
			 * @param {boolean} isLoading - Whether the box is in loading state
			 */
			updateLoadingState(isLoading) {
				if (!this.elements.submitButton) return;

				if (isLoading) {
					this.elements.submitButton.disabled = true;
					const originalText = this.elements.submitButton.getAttribute("data-original-text") || this.elements.submitButton.innerHTML;
					this.elements.submitButton.setAttribute("data-original-text", originalText);
					this.elements.submitButton.innerHTML = `<div class="button-spinner"></div>`;
					this.elements.submitButton.setAttribute("aria-busy", "true");
					this.elements.submitButton.classList.add("loading-active");

					if (this.elements.oneTimeButton) {
						this.elements.oneTimeButton.disabled = true;
						this.elements.oneTimeButton.classList.add("disabled");
					}

					this.elements.productActions.classList.add("processing-order");
				} else {
					this.elements.submitButton.disabled = false;
					const originalText = this.elements.submitButton.getAttribute("data-original-text");
					if (originalText) this.elements.submitButton.innerHTML = originalText;
					this.elements.submitButton.removeAttribute("aria-busy");
					this.elements.submitButton.classList.remove("loading-active");

					if (this.elements.oneTimeButton) {
						this.elements.oneTimeButton.disabled = false;
						this.elements.oneTimeButton.classList.remove("disabled");
					}

					this.elements.productActions.classList.remove("processing-order");
				}
			},

			/**
			 * Initialize the buy box instance
			 */
			init() {
				// Find all required elements
				if (!this.elements.section) return;

				// Read global settings from section element
				this.initGlobalSettings();

				this.elements.productActions = this.elements.section.querySelector(".product-actions");
				if (!this.elements.productActions) return;

				this.elements.purchaseOptionBoxes = this.elements.productActions.querySelectorAll(".variant-box");
				this.elements.submitButton = this.elements.productActions.querySelector(".checkout-button button");
				this.elements.submitSellingPlanId = this.elements.productActions.querySelector(".submit-selling-plan-id");
				this.elements.submitVariantId = this.elements.productActions.querySelector(".submit-variant-id");
				this.elements.oneTimeButton = this.elements.productActions.querySelector(".one-time-add-to-cart");
				this.elements.giftOptionContainers = this.elements.productActions.querySelectorAll(".gift-box");
				this.elements.priceDisplay = this.elements.productActions.querySelector(".price-display");

				// Find the form element if it exists
				if (this.elements.submitButton) {
					this.elements.buyForm = this.elements.submitButton.closest("form");

					// Completely disable the default form submission mechanism
					if (this.elements.buyForm) {
						// Prevent normal form submission
						this.elements.buyForm.addEventListener("submit", this.handleFormSubmit.bind(this), true);

						// Mark the form as handled by our custom handler
						this.elements.buyForm.setAttribute("data-handled-by-buybox-js", "true");

						// Remove any existing event listeners by cloning the form
						const oldForm = this.elements.buyForm;
						const newForm = oldForm.cloneNode(true);
						oldForm.parentNode.replaceChild(newForm, oldForm);
						this.elements.buyForm = newForm;

						// Re-find the button inside the cloned form
						this.elements.submitButton = this.elements.buyForm.querySelector("button");
					}
				}

				// Save original button text
				if (this.elements.submitButton) {
					this.elements.submitButton.setAttribute("data-original-text", this.elements.submitButton.textContent);

					// Remove default form behavior from button
					if (this.elements.submitButton.type === "submit") {
						this.elements.submitButton.type = "button";
					}
				}

				if (this.elements.oneTimeButton) {
					this.elements.oneTimeButton.setAttribute("data-original-text", this.elements.oneTimeButton.textContent);
				}

				// Read configuration from product actions (for backward compatibility)
				const productActions = this.elements.productActions;
				if (productActions.dataset.buyType && !this.state.buyType) {
					this.state.buyType = productActions.dataset.buyType;
					console.log(`Buy box ${this.SID} buy type set to: ${this.state.buyType}`);
				}

				// Explicitly check for "buy_now" text in the submit button
				if (this.elements.submitButton) {
					const buttonText = this.elements.submitButton.textContent.trim().toLowerCase();
					if (buttonText === "get started") {
						this.state.buyType = "buy_now";
						console.log(`Buy box ${this.SID} buy type overridden to buy_now based on button text`);
					}
				}

				// Initialize components
				this.initGiftSelection();
				this.initPurchaseOptions();
				this.initSubmitButton();
				this.initOneTimeButton();

				console.log(`Buy box ${this.SID} initialized with custom checkout handling (buyType: ${this.state.buyType})`);

				if (this.state.isDebug) {
					console.log("Buy box settings:", {
						buyType: this.state.buyType,
						defaultSelectionIndex: this.state.defaultSelectionIndex,
						isOneTimePurchase: this.state.isOneTimePurchase,
						isOneTimeGift: this.state.isOneTimeGift,
						isSlideVariant: this.state.isSlideVariant,
						isPrimeEnabled: this.state.isPrimeEnabled,
						priceFormat: this.state.priceFormat,
						pricePer: this.state.pricePer,
						saveFormat: this.state.saveFormat,
						thumbsLayout: this.state.thumbsLayout
					});
				}
			},

			/**
			 * Initialize global settings from section element data attributes
			 */
			initGlobalSettings() {
				const section = this.elements.section;

				if (section.hasAttribute("data-is-debug")) {
					this.state.isDebug = true;
					CuralifeBoxes.utils.setDebugMode(true);
				}

				/*
				 * Note: We support two approaches for global settings:
				 * 1. Data attributes on the section element (preferred, more efficient)
				 * 2. Template variables passed to individual templates (legacy, for backward compatibility)
				 *
				 * This dual approach enables a smooth transition while ensuring nothing breaks.
				 * The JavaScript code will prioritize settings from the section attributes.
				 */

				// Read buy type
				this.state.buyType = section.dataset.buyType || "add_to_cart";

				// Read selection settings
				this.state.defaultSelectionIndex = CuralifeBoxes.utils.safeParseInt(section.dataset.defaultSelection, 1);

				// Read format settings
				this.state.priceFormat = section.dataset.priceFormat || "total";
				this.state.saveFormat = section.dataset.saveFormat || "percentage";
				this.state.pricePer = section.dataset.pricePer || "dont_split";
				this.state.thumbsLayout = section.dataset.thumbs || "horizontal";

				// Read feature flags
				this.state.isOneTimePurchase = section.hasAttribute("data-one-time-purchase");
				this.state.isOneTimeGift = section.hasAttribute("data-one-time-gift");
				this.state.isSlideVariant = section.hasAttribute("data-slide-variant");
				this.state.isPrimeEnabled = section.hasAttribute("data-buy-with-prime");
				this.state.isShowReviews = section.hasAttribute("data-show-reviews");
				this.state.isProductThumbs = section.hasAttribute("data-product-thumbs");
				this.state.isHideThumbs = section.hasAttribute("data-hide-thumbs");
				this.state.isHideInfo = section.hasAttribute("data-hide-info");
				this.state.isBuyQuantity = section.hasAttribute("data-buy-quantity");

				if (this.state.isDebug) {
					console.log(`Buy box ${this.SID} initialized with global settings from section element`);
				}
			},

			/**
			 * Handle form submission and prevent default behavior
			 * @param {Event} e - The form submit event
			 */
			handleFormSubmit(e) {
				console.log("Intercepted form submission, using custom handler");
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();

				// Trigger our custom click handler
				if (!this.state.isLoading && this.elements.submitButton) {
					this.elements.submitButton.click();
				}
				return false;
			},

			/**
			 * Initialize gift selection functionality
			 */
			initGiftSelection() {
				if (!this.elements.giftOptionContainers || this.elements.giftOptionContainers.length === 0) return;

				// Set first gift as selected by default
				this.updateGiftSelection(this.elements.giftOptionContainers[0]);

				// Add click handlers to all gift options
				this.elements.giftOptionContainers.forEach(container => {
					container.addEventListener("click", () => this.updateGiftSelection(container));
				});
			},

			/**
			 * Update the selected gift in the UI
			 * @param {Element} container - The selected gift container
			 */
			updateGiftSelection(container) {
				if (!container) return;

				this.elements.giftOptionContainers.forEach(c => {
					const mark = c.querySelector(".check-mark");
					const isSelected = c === container;
					c.classList.toggle("selected", isSelected);
					if (mark) {
						mark.style.display = "block";
						mark.style.opacity = isSelected ? "1" : "0";
					}
				});
			},

			/**
			 * Initialize purchase option functionality
			 */
			initPurchaseOptions() {
				if (!this.elements.purchaseOptionBoxes || this.elements.purchaseOptionBoxes.length === 0) return;

				// Select default variant
				const defaultIndex = CuralifeBoxes.utils.safeParseInt(this.elements.productActions.dataset.defaultVariantIndex, 0);

				const defaultBox = this.elements.purchaseOptionBoxes[defaultIndex - 1] || this.elements.purchaseOptionBoxes[0];

				if (defaultBox) {
					this.togglePurchaseBox(defaultBox);
				}

				// Add click handlers for variant selection
				this.elements.productActions.addEventListener("click", e => {
					const radio = e.target.closest('input[type="radio"]');
					const box = e.target.closest(".variant-boxes .variant-box");

					if (radio) {
						e.preventDefault();
						const parentBox = radio.closest(".variant-box");
						if (parentBox) this.togglePurchaseBox(parentBox);
					} else if (box) {
						e.preventDefault();
						this.togglePurchaseBox(box);
					}
				});
			},

			/**
			 * Select a purchase option and update UI
			 * @param {Element} el - The selected variant box
			 */
			togglePurchaseBox(el) {
				if (!el) return;

				// Update selection state
				this.elements.purchaseOptionBoxes.forEach(box => {
					box.classList.remove("selected");
					const radio = box.querySelector('input[type="radio"]');
					if (radio) radio.checked = false;
				});

				const isSub = el.dataset.purchaseType === "subscribe";
				const planId = isSub ? el.dataset.subscriptionSellingPlanId : "";
				const variantId = el.dataset.variant;

				// Update form values
				if (this.elements.submitSellingPlanId) this.elements.submitSellingPlanId.value = planId;
				if (this.elements.submitVariantId) this.elements.submitVariantId.value = variantId;

				// Update UI
				el.classList.add("selected");
				const radio = el.querySelector('input[type="radio"]');
				if (radio) radio.checked = true;

				this.updateBuyButton(el);
				this.state.selectedBox = el;
				this.updatePriceDisplay(el);

				// Update image if needed
				if (typeof window.hasInitialImageUpdateHappened !== "undefined") {
					this.updateVariantImage(el);
				} else {
					window.hasInitialImageUpdateHappened = true;
				}
			},

			/**
			 * Update the price display based on selection
			 * @param {Element} el - The selected variant box
			 */
			updatePriceDisplay(el) {
				if (!this.elements.priceDisplay || !el) return;

				const priceDisplay = this.elements.priceDisplay;
				const priceFormat = el.dataset.priceFormat || this.elements.productActions.dataset.priceFormat || "per_bottle";

				const subItem = parseFloat(el.dataset.subscriptionItemPrice) / 100 || 0;
				const subPrice = parseFloat(el.dataset.subscriptionPrice) / 100 || 0;
				const origPerItem = parseFloat(el.dataset.originalItemCap) / 100 || 0;
				const bottles = parseInt(el.dataset.bottleQuantity, 10) || 1;

				const currencySymbol = window.Shopify?.currency?.active === "GBP" ? "£" : window.Shopify?.currency?.active === "USD" ? "$" : window.Shopify?.currency?.symbol || "$";

				const totalOrig = origPerItem * bottles;
				const saveAmt = priceFormat === "total" ? totalOrig - subPrice : (origPerItem - subItem) * bottles;

				// Update price display elements if present
				const mainPrice = priceDisplay.querySelector(".final-price");
				const discount = priceDisplay.querySelector(".discount-badge");
				const totalLine = priceDisplay.querySelector(".total-line");

				const newMain = `${currencySymbol}${(priceFormat === "total" ? subPrice : subItem).toFixed(2)}`;
				const newCompare = `${currencySymbol}${(priceFormat === "total" ? totalOrig : origPerItem).toFixed(2)}`;
				const flooredSave = Math.floor(saveAmt);

				// Handle initial load without animation
				if (this.state.isInitialLoad) {
					if (mainPrice) {
						const pSpan = mainPrice.querySelector(".price");
						const cSpan = mainPrice.querySelector(".cap");
						if (pSpan) pSpan.textContent = newMain;
						if (cSpan) cSpan.textContent = newCompare;
					}

					if (discount && priceFormat === "total") {
						discount.textContent = flooredSave > 0 ? `SAVE ${currencySymbol}${flooredSave}` : "";
					}

					if (totalLine && priceFormat === "per_bottle") {
						if (flooredSave > 0 && subPrice != totalOrig) {
							totalLine.innerHTML = `Total ${currencySymbol}${subPrice.toFixed(2)} <span class="total-price-cap text-gray-500 line-through">${currencySymbol}${(origPerItem * bottles).toFixed(2)}</span>`;
						} else {
							totalLine.textContent = "";
						}
					}

					this.state.isInitialLoad = false;
					return;
				}

				// Animate subsequent updates
				const animate = () => {
					// Fade elements out
					[mainPrice, discount, totalLine].forEach(el => {
						if (el) {
							el.style.transition = "opacity 200ms ease-out";
							el.style.opacity = "0";
						}
					});

					setTimeout(() => {
						// Update element content while they're faded out
						if (mainPrice) {
							const pSpan = mainPrice.querySelector(".price");
							const cSpan = mainPrice.querySelector(".cap");
							if (pSpan) pSpan.textContent = newMain;
							if (cSpan) cSpan.textContent = newCompare;
						}

						if (discount && priceFormat === "total") {
							discount.textContent = flooredSave > 0 ? `SAVE ${currencySymbol}${flooredSave}` : "";
						}

						if (totalLine && priceFormat === "per_bottle") {
							if (flooredSave > 0 && subPrice != subItem) {
								totalLine.innerHTML = `Total ${currencySymbol}${subPrice.toFixed(2)} <span class="total-price-cap text-gray-500 line-through">${currencySymbol}${(origPerItem * bottles).toFixed(2)}</span>`;
							} else {
								totalLine.textContent = " ";
							}
						}

						// Fade elements back in, staggered for visual effect
						setTimeout(() => mainPrice && (mainPrice.style.opacity = "1"), 50);
						setTimeout(() => discount && (discount.style.opacity = "1"), 100);
						setTimeout(() => totalLine && (totalLine.style.opacity = "1"), 150);
					}, 200);
				};

				requestAnimationFrame(animate);
			},

			/**
			 * Update buy button attributes and tracking
			 * @param {Element} el - The selected variant box
			 */
			updateBuyButton(el) {
				if (!this.elements.submitButton || !el) return;

				const sku = el.dataset.sku;
				const purchase = el.dataset.purchaseType;

				// Update button's tracking name attribute
				const currName = this.elements.submitButton.getAttribute("name") || "";
				const parts = currName.split("|");
				const params = {};

				parts.slice(1).forEach(p => {
					const [k, v] = p.split(":");
					if (k) params[k] = v;
				});

				params["variant-sku"] = sku;
				params["purchase-type"] = purchase;

				const newName = `track:add|${Object.entries(params)
					.map(([k, v]) => `${k}:${v}`)
					.join("|")}`;

				// Update button attributes
				this.elements.submitButton.setAttribute("name", newName);
				this.elements.submitButton.setAttribute("data-sku", sku);
				this.elements.submitButton.setAttribute("data-purchase-type", purchase);
			},

			/**
			 * Update variant image in slider if available
			 * @param {Element} el - The selected variant box
			 */
			updateVariantImage(el) {
				if (!el) return;

				const variantId = el.dataset.variant;
				if (!variantId) return;

				const sliderId = `productSliderAllInOne${this.SID}`;
				let slider = window[sliderId];

				if (!slider?.slides?.length) {
					// Slider not loaded yet, wait for it
					const checkInterval = setInterval(() => {
						slider = window[sliderId];
						if (slider?.slides?.length) {
							clearInterval(checkInterval);
							this.performSlideUpdate(slider, variantId);
						}
					}, 100);

					// Don't wait forever
					setTimeout(() => clearInterval(checkInterval), 5000);
					return;
				}

				this.performSlideUpdate(slider, variantId);
			},

			/**
			 * Perform the actual slide update
			 * @param {Object} slider - The slider instance
			 * @param {string} variantId - The variant ID
			 */
			performSlideUpdate(slider, variantId) {
				try {
					if (!slider || !variantId) return;
					const idx = Array.from(slider.slides).findIndex(s => s.dataset.variantId === variantId);
					if (idx !== -1) {
						slider.update();
						requestAnimationFrame(() => {
							slider.slideTo(idx, 300);
							setTimeout(() => slider.update(), 350);
						});
					}
				} catch (err) {
					console.error("Slide update error:", err);
				}
			},

			/**
			 * Handle the buy now checkout flow
			 * @param {Array} items - Items to add to cart
			 * @returns {Promise<void>}
			 */
			async handleBuyNowFlow(items) {
				try {
					// Prevent multiple checkout attempts
					if (this.state.isRedirectingToCheckout) {
						console.log("Checkout already in progress, ignoring duplicate request");
						return;
					}

					this.setState({
						isLoading: true,
						isRedirectingToCheckout: true
					});

					console.log("Starting buy now flow with items:", JSON.stringify(items));
					if (this.state.isDebug) {
						CuralifeBoxes.utils.showNotification("Starting buy now flow", "debug");
					}

					// Remove cart popup if it exists
					const cartPopup = document.getElementById("upCart");
					if (cartPopup) cartPopup.remove();

					// Always clear the cart first - this is critical to prevent duplicated items
					console.log("Clearing cart before checkout...");
					try {
						await CuralifeBoxes.utils.clearCart();
						// Verify cart is empty
						const emptyCart = await CuralifeBoxes.utils.getCart();
						if (emptyCart && emptyCart.items && emptyCart.items.length > 0) {
							console.warn("Cart was not properly cleared! Still has items:", emptyCart.items.length);
							if (this.state.isDebug) {
								CuralifeBoxes.utils.showNotification(`Cart was not cleared properly! ${emptyCart.items.length} items remain`, "debug");
							}
							// Try once more to ensure it's cleared
							await CuralifeBoxes.utils.clearCart();
						}
					} catch (clearErr) {
						console.error("Error clearing cart:", clearErr);
						if (this.state.isDebug) {
							CuralifeBoxes.utils.showNotification(`Error clearing cart: ${clearErr.message}`, "debug");
						}
					}

					// Process selling plan IDs
					items.forEach(item => {
						if (item.selling_plan !== undefined) {
							item.selling_plan = parseInt(item.selling_plan, 10);
							if (isNaN(item.selling_plan)) {
								console.error(`Invalid selling_plan value: ${item.selling_plan}`);
								if (this.state.isDebug) {
									CuralifeBoxes.utils.showNotification(`Invalid selling_plan value: ${item.selling_plan}`, "debug");
								}
								delete item.selling_plan;
							}
						}
					});

					// Add items to cart
					console.log("Adding items to cleared cart:", JSON.stringify(items));
					try {
						const addRes = await CuralifeBoxes.utils.addToCart(items);
						console.log("Add to cart response:", addRes);
						if (this.state.isDebug) {
							CuralifeBoxes.utils.showNotification("Items added to cart successfully", "debug");
						}
					} catch (addErr) {
						console.error("Error adding items to cart:", addErr);
						if (this.state.isDebug) {
							CuralifeBoxes.utils.showNotification(`Error adding items to cart: ${addErr.message}`, "debug");
						}
						throw addErr;
					}

					// Verify cart contents
					try {
						const cart = await CuralifeBoxes.utils.getCart();
						console.log("Cart contents after adding items:", cart);
						if (cart.items.length !== items.length) {
							console.warn(`Expected ${items.length} items in cart, found ${cart.items.length}`);
							if (this.state.isDebug) {
								CuralifeBoxes.utils.showNotification(`Expected ${items.length} items in cart, found ${cart.items.length}`, "debug");
							}
						}
						const hasSubscription = cart.items.some(item => item.selling_plan_allocation);
						if (!hasSubscription && items.some(i => i.selling_plan)) {
							console.warn("No subscription items found in cart after adding. Check selling plan ID.");
							if (this.state.isDebug) {
								CuralifeBoxes.utils.showNotification("No subscription items found in cart after adding", "debug");
							}
						}
					} catch (e) {
						console.error("Failed to verify cart contents:", e);
						if (this.state.isDebug) {
							CuralifeBoxes.utils.showNotification(`Failed to verify cart contents: ${e.message}`, "debug");
						}
					}

					// Reset loading states before redirecting
					this.setState({
						isRedirectingToCheckout: false,
						isLoading: false
					});

					// Redirect to checkout
					console.log("Redirecting to checkout...");
					if (this.state.isDebug) {
						CuralifeBoxes.utils.showNotification("Redirecting to checkout...", "debug");
					}

					// Small delay to ensure state update completes before redirect
					setTimeout(() => {
						window.location.href = "/checkout";
					}, 50);
				} catch (err) {
					console.error("Buy now flow error:", err);
					this.setState({
						isRedirectingToCheckout: false,
						isLoading: false
					});
					CuralifeBoxes.utils.showNotification(err.message || "Failed to proceed to checkout. Please try again.");
					throw err;
				}
			},

			/**
			 * Add items to cart and handle subscription conflicts
			 * @param {Array} items - Items to add to cart
			 * @returns {Promise<Object>} Result of the operation
			 */
			async addValidItemsToCart(items) {
				try {
					// Check if we should be redirecting to checkout instead (buy_now mode)
					if (this.state.buyType === "buy_now") {
						console.log("Detected buy_now mode, redirecting to checkout instead of adding to cart");
						if (this.state.isDebug) {
							CuralifeBoxes.utils.showNotification("Detected buy_now mode, redirecting to checkout", "debug");
						}
						return await this.handleBuyNowFlow(items);
					}

					// Get current cart
					let cart = await CuralifeBoxes.utils.getCart();
					if (this.state.isDebug) {
						CuralifeBoxes.utils.showNotification(`Current cart has ${cart.items.length} items`, "debug");
					}

					// First check if we already have these items in cart
					const hasExactItems = items.every(newItem => {
						return cart.items.some(cartItem => {
							return (
								cartItem.variant_id === newItem.id &&
								((!cartItem.selling_plan_allocation && !newItem.selling_plan) || (cartItem.selling_plan_allocation && cartItem.selling_plan_allocation.selling_plan.id == newItem.selling_plan))
							);
						});
					});

					// If we already have the exact items, clear cart to prevent duplication
					if (hasExactItems) {
						if (this.state.isDebug) {
							CuralifeBoxes.utils.showNotification("Exact items already in cart, clearing to prevent duplication", "debug");
						}
						await CuralifeBoxes.utils.clearCart();
						cart = { items: [] };
					}

					// Handle subscription conflicts
					const subItem = items.find(i => i.selling_plan);
					let updatedExistingSub = false;

					if (subItem) {
						const selectedBox = this.elements.productActions.querySelector(".variant-box.selected");
						const productId = selectedBox?.dataset?.product;

						if (productId) {
							const existingSub = cart.items.find(ci => ci.product_id === parseInt(productId, 10) && Boolean(ci.selling_plan_allocation));

							if (existingSub) {
								if (this.state.isDebug) {
									CuralifeBoxes.utils.showNotification(`Removing existing subscription for product ${productId}`, "debug");
								}
								await CuralifeBoxes.utils.removeCartItem(existingSub.key);
								cart = await CuralifeBoxes.utils.getCart();
								updatedExistingSub = true;
							}
						}
					}

					if (this.state.isDebug) {
						CuralifeBoxes.utils.showNotification(`Adding ${items.length} items to cart`, "debug");
					}
					const addRes = await CuralifeBoxes.utils.addToCart(items);

					// Only show "subscription updated" if we actually updated an existing subscription
					const successMessage = updatedExistingSub ? "Subscription updated in your cart" : "Items added to cart";
					CuralifeBoxes.utils.showNotification(successMessage, "success");

					if (typeof window.updateCart === "function") {
						window.updateCart();
					}

					return { success: true, addedItems: items };
				} catch (err) {
					console.error("addValidItemsToCart error:", err);
					CuralifeBoxes.utils.showNotification(err.message || "Error adding items. Please try again.");
					return { success: false, addedItems: [] };
				}
			},

			/**
			 * Initialize the main submit button
			 */
			initSubmitButton() {
				if (!this.elements.submitButton) return;

				let isSubmitting = false;

				// Clear any existing event listeners by replacing with a clone
				const oldButton = this.elements.submitButton;
				const newButton = oldButton.cloneNode(true);
				oldButton.parentNode.replaceChild(newButton, oldButton);
				this.elements.submitButton = newButton;

				// Make sure the button is not of type=submit
				if (this.elements.submitButton.type === "submit") {
					this.elements.submitButton.type = "button";
				}

				// Add data attribute to mark as using custom handler
				this.elements.submitButton.setAttribute("data-using-custom-handler", "true");

				// Check if we should be in buy_now mode based on button text
				const buttonText = this.elements.submitButton.textContent.trim().toLowerCase();
				if (buttonText === "get started") {
					this.state.buyType = "buy_now";
					console.log(`Buy box button text is "Get Started", setting buyType to buy_now`);
				}

				this.elements.submitButton.addEventListener("click", async e => {
					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation();

					// Prevent double-clicks or multiple submissions
					if (isSubmitting || this.state.isLoading || this.state.isRedirectingToCheckout) {
						console.log("Submission already in progress, ignoring duplicate click");
						return;
					}

					isSubmitting = true;
					this.setState({ isLoading: true });

					console.log(`Button clicked, buy type: ${this.state.buyType}`);

					try {
						const box = this.elements.productActions.querySelector(".variant-box.selected");
						const giftsAmount = parseInt(this.elements.productActions.dataset.giftsAmount || "0", 10);

						if (!box) {
							throw new Error("Please select a purchase option");
						}

						// Get variant data
						const isSub = box.dataset.purchaseType === "subscribe";
						// Try originalVariant if variant is not available
						const variant = box.dataset.originalVariant || box.dataset.variant;

						if (!variant) {
							throw new Error("No valid variant ID found");
						}

						let items = [
							{
								id: parseInt(variant, 10),
								quantity: 1,
								selling_plan: isSub ? parseInt(box.dataset.subscriptionSellingPlanId, 10) || undefined : undefined
							}
						];

						// Add gift if available
						if (giftsAmount > 0) {
							const giftEl = document.querySelector(".gift-box.selected");
							if (!giftEl?.querySelector(".gift-option-border")) {
								throw new Error("Please select a gift option");
							}

							const giftB = giftEl.querySelector(".gift-option-border");
							const giftID = isSub ? giftB?.dataset.giftIdSubscription : giftB?.dataset.giftId;

							if (!giftID) throw new Error("Invalid gift selection");
							items.push({ id: parseInt(giftID, 10), quantity: 1 });
						}

						// Remove any undefined selling_plan values
						items.forEach(item => {
							if (item.selling_plan === undefined || isNaN(item.selling_plan)) {
								delete item.selling_plan;
							}
						});

						console.log(`Ready to process items with buyType=${this.state.buyType}`, items);

						if (this.state.buyType === "buy_now") {
							console.log("Proceeding with buy_now flow (redirect to checkout)");
							await this.handleBuyNowFlow(items);
						} else {
							console.log("Proceeding with add_to_cart flow");
							await this.addValidItemsToCart(items);
							isSubmitting = false;
							this.setState({ isLoading: false });
						}
					} catch (err) {
						console.error("Submit error:", err);
						CuralifeBoxes.utils.showNotification(err.message || "Error adding items to cart. Please try again.");
						isSubmitting = false;
						this.setState({ isLoading: false });
					}
				});
			},

			/**
			 * Initialize the one-time purchase button
			 */
			initOneTimeButton() {
				if (!this.elements.oneTimeButton) return;

				let isSubmittingOneTime = false;

				this.elements.oneTimeButton.addEventListener("click", async e => {
					e.preventDefault();

					// Prevent multiple submissions
					if (isSubmittingOneTime || this.state.isLoading) {
						return;
					}

					isSubmittingOneTime = true;
					this.setState({ isLoading: true });

					const origText = this.elements.oneTimeButton.textContent;
					this.elements.oneTimeButton.textContent = "Adding...";

					try {
						const giftEl = document.querySelector(".gift-box.selected");
						const giftB = giftEl?.querySelector(".gift-option-border");
						const giftID = giftB?.dataset.giftId;
						const variant1 = this.elements.oneTimeButton.dataset.variantId;

						if (!variant1) {
							throw new Error("Invalid variant ID");
						}

						const toAdd = [{ id: parseInt(variant1, 10), quantity: 1 }];

						// Add gift for one-time purchase if enabled
						if (giftID && this.elements.productActions.hasAttribute("data-one-time-gift")) {
							toAdd.push({ id: parseInt(giftID, 10), quantity: 1 });
						}

						if (this.state.buyType === "buy_now") {
							// Optimize for buy now flow
							this.setState({ isRedirectingToCheckout: true });

							// Remove cart popup
							const cartPopup = document.getElementById("upCart");
							if (cartPopup) cartPopup.remove();

							// ALWAYS clear cart first for buy now flow
							console.log("One-time purchase: Clearing cart before checkout...");
							await CuralifeBoxes.utils.clearCart();

							// Add items to cleared cart
							console.log("One-time purchase: Adding items to cleared cart:", JSON.stringify(toAdd));
							await CuralifeBoxes.utils.addToCart(toAdd);

							// Verify cart contents
							try {
								const cart = await CuralifeBoxes.utils.getCart();
								console.log("One-time purchase: Cart contents after adding items:", cart);
								if (cart.items.length !== toAdd.length) {
									console.warn(`Expected ${toAdd.length} items in cart, found ${cart.items.length}`);
								}
							} catch (e) {
								console.error("Failed to verify cart contents:", e);
							}

							// Reset loading states before redirecting
							isSubmittingOneTime = false;
							this.setState({
								isLoading: false,
								isRedirectingToCheckout: false
							});

							// Go to checkout with a small delay to ensure state updates
							console.log("One-time purchase: Redirecting to checkout...");
							setTimeout(() => {
								window.location.href = "/checkout";
							}, 50);
						} else {
							// Regular add to cart
							await CuralifeBoxes.utils.addToCart(toAdd);

							// Update cart UI
							if (typeof window.updateCart === "function") {
								window.updateCart();
							}

							this.elements.oneTimeButton.textContent = "Added!";
							setTimeout(() => {
								this.elements.oneTimeButton.textContent = origText;
								isSubmittingOneTime = false;
								this.setState({ isLoading: false });
							}, 2000);
						}
					} catch (err) {
						console.error("One-time purchase error:", err);
						CuralifeBoxes.utils.showNotification(err.message || "Error adding items to cart");
						this.elements.oneTimeButton.textContent = "Failed";

						setTimeout(() => {
							this.elements.oneTimeButton.textContent = origText;
							isSubmittingOneTime = false;
							this.setState({ isLoading: false });
						}, 2000);
					}
				});
			}
		};

		return this.instances[SID];
	},

	/**
	 * Initialize all buy boxes on the page
	 */
	initAll() {
		if (this.initialized) return;

		// Find all buy box sections on the page
		document.querySelectorAll('[id^="cta-section-"]').forEach(section => {
			// Skip sections that are marked as using the new buy box implementation
			const productActions = section.querySelector(".product-actions");
			if (productActions && productActions.dataset.buyBoxNewRoot === "true") {
				console.log(`Skipping section ${section.id} as it uses new buy box implementation`);
				return;
			}

			const SID = section.id.replace("cta-section-", "");
			const instance = this.createInstance(SID);
			instance.init();
		});

		this.initialized = true;
		console.log("All legacy buy boxes initialized");

		// Add styles for buy box UI elements
		this.addStyles();
	},

	/**
	 * Add required styles to the document
	 */
	addStyles() {
		if (document.getElementById("curalife-buy-box-styles")) return;

		const styleElement = document.createElement("style");
		styleElement.id = "curalife-buy-box-styles";
		styleElement.textContent = `
			.button-spinner {
				display: inline-block;
				width: 1.5rem;
				height: 1.5rem;
				border: 2px solid rgba(255, 255, 255, 0.2);
				border-radius: 9999px;
				border-top-color: #fff;
				animation: button-spinner 0.6s linear infinite;
			}

			@keyframes button-spinner {
				0%   { transform: rotate(0deg);   }
				100% { transform: rotate(360deg); }
			}

			.processing-order {
				position: relative;
			}

			.processing-order::after {
				content: "";
				position: absolute;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				background: rgba(255, 255, 255, 0.6);
				z-index: 5;
				pointer-events: none;
			}

			.disabled {
				opacity: 0.3;
				pointer-events: none;
			}
		`;
		document.head.appendChild(styleElement);
	}
};

// Initialize all buy boxes when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
	window.CuralifeBoxes.initAll();
});
