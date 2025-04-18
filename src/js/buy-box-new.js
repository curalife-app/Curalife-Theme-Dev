const CartCache = {
	data: null,
	lastFetched: 0,
	maxAge: 2000, // 2 seconds

	async getCart(forceRefresh = false) {
		const now = Date.now();
		if (!forceRefresh && this.data && now - this.lastFetched < this.maxAge) {
			return this.data;
		}

		try {
			const res = await fetch("/cart.js?t=" + now, {
				cache: "no-store",
				headers: {
					"Cache-Control": "no-cache",
					Pragma: "no-cache"
				}
			});

			if (!res.ok) throw new Error("Failed to fetch cart");
			this.data = await res.json();
			this.lastFetched = now;
			return this.data;
		} catch (err) {
			console.error("Error fetching cart:", err);
			throw err;
		}
	},

	invalidate() {
		this.data = null;
		this.lastFetched = 0;
	}
};

const DOMUtils = {
	updateProperty(element, property, newValue) {
		if (!element) return false;
		if (element[property] !== newValue) {
			element[property] = newValue;
			return true;
		}
		return false;
	},

	updateAttribute(element, attribute, newValue) {
		if (!element) return false;
		const currentValue = element.getAttribute(attribute);
		if (currentValue !== newValue) {
			element.setAttribute(attribute, newValue);
			return true;
		}
		return false;
	},

	toggleClass(element, className, shouldHave) {
		if (!element) return false;
		const hasClass = element.classList.contains(className);
		if (shouldHave && !hasClass) {
			element.classList.add(className);
			return true;
		} else if (!shouldHave && hasClass) {
			element.classList.remove(className);
			return true;
		}
		return false;
	},

	updateStyle(element, property, newValue) {
		if (!element) return false;
		if (element.style[property] !== newValue) {
			element.style[property] = newValue;
			return true;
		}
		return false;
	},

	createElement(tagName, properties = {}, parent = null) {
		const element = document.createElement(tagName);
		Object.entries(properties).forEach(([key, value]) => {
			if (key === "className") {
				element.className = value;
			} else if (key === "innerHTML") {
				element.innerHTML = value;
			} else if (key === "textContent") {
				element.textContent = value;
			} else if (key === "style" && typeof value === "object") {
				Object.entries(value).forEach(([prop, val]) => {
					element.style[prop] = val;
				});
			} else if (key.startsWith("data-")) {
				element.setAttribute(key, value);
			} else if (key.startsWith("on") && typeof value === "function") {
				const eventName = key.substring(2).toLowerCase();
				element.addEventListener(eventName, value);
			} else {
				element[key] = value;
			}
		});
		if (parent) {
			parent.appendChild(element);
		}
		return element;
	}
};

function showNotification(msg, type = "error") {
	const note = document.createElement("div");
	note.className = `
		cart-notification ${type}
		fixed bottom-4 left-1/2 transform -translate-x-1/2
		p-4 rounded-lg shadow-lg z-[2147483640]
		transition-opacity duration-300
	`.replace(/\s+/g, " ");

	if (type === "error") {
		note.classList.add("bg-red-100", "border", "border-red-400", "text-red-700");
	} else {
		note.classList.add("bg-green-100", "border", "border-green-400", "text-green-700");
	}

	note.innerHTML = `
		<div class="flex items-center">
			<div class="mr-3">${type === "error" ? "⚠️" : "✅"}</div>
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
}

function parseErrorMessage(error, context = "") {
	console.error(`Error in ${context}:`, {
		message: error.message,
		response: error.response,
		stack: error.stack,
		originalError: error
	});

	if (error.response && typeof error.response === "object") {
		if (error.response.description) return error.response.description;
		if (error.response.message) return error.response.message;
	}

	if (error.message?.includes("network")) return "Network connection issue. Please check your internet connection and try again.";
	if (error.message?.includes("timeout")) return "Request timed out. Please try again.";
	if (error.message?.includes("sold out")) return "This product is currently sold out. Please try again later.";
	if (error.message?.includes("variant")) return "There was an issue with the selected option. Please try selecting a different option.";

	switch (context) {
		case "cart-add":
			return "Unable to add items to your cart. Please try again.";
		case "checkout":
			return "Unable to proceed to checkout. Please try again.";
		case "frequency-selection":
			return "Unable to update subscription frequency. Please try again.";
		default:
			return "Something went wrong. Please try again or contact customer support.";
	}
}

async function getCart(forceRefresh = false) {
	try {
		return await CartCache.getCart(forceRefresh);
	} catch (err) {
		console.error("Error in getCart:", err);
		throw new Error("Unable to access your cart");
	}
}

async function removeCartItem(key) {
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
		CartCache.invalidate();
		return res.json();
	} catch (err) {
		console.error("Error removing cart item:", err);
		throw err;
	}
}

async function clearCart() {
	try {
		const res = await fetch("/cart/clear.js", {
			method: "POST",
			cache: "no-store",
			headers: { "Cache-Control": "no-cache", Pragma: "no-cache" }
		});
		if (!res.ok) {
			const errorData = await res.json();
			throw Object.assign(new Error("Failed to clear cart"), { response: errorData });
		}
		CartCache.invalidate();
		return res.json();
	} catch (err) {
		console.error("Error clearing cart:", err);
		throw err;
	}
}

function extractFrequency(planName) {
	if (!planName) return { value: 1, unit: "month" };

	let daysMatch = planName.match(/(\d+)\s*Day/i);
	if (daysMatch) {
		return { value: parseInt(daysMatch[1], 10), unit: "day" };
	}

	let weeksMatch = planName.match(/(\d+)\s*Week/i);
	if (weeksMatch) {
		return { value: parseInt(weeksMatch[1], 10), unit: "week" };
	}

	let monthsMatch = planName.match(/(\d+)\s*Month/i);
	if (monthsMatch) {
		return { value: parseInt(monthsMatch[1], 10), unit: "month" };
	}

	return { value: 1, unit: "month" };
}

// At the top of the file, add a static instances map for tracking
const BuyBoxNewInstances = new Map();

class BuyBoxNew {
	constructor(container, config) {
		// Check if an instance already exists for this SID
		if (BuyBoxNewInstances.has(config.SID)) {
			return BuyBoxNewInstances.get(config.SID);
		}

		this.container = container;
		this.config = config;
		this.elements = {};
		this.state = {
			selectedBox: null,
			selectedFrequency: null,
			isInitialLoad: true,
			isLoading: false,
			isRedirectingToCheckout: false,
			productId: null,
			variantId: null,
			sellingPlanId: null,
			purchaseType: null,
			currencySymbol: this.config.currencySymbol || "$",
			loadingButton: null // Track which button is loading: 'submit', 'oneTime', or null
		};

		if (!this.container) {
			return;
		}

		// Store this instance in the map
		BuyBoxNewInstances.set(config.SID, this);

		this.bindElements();
		this.storeInitialProductData();
		this.initState();
		this.attachEventListeners();
		this.moveCtaTextIfNeeded();
	}

	bindElements() {
		this.elements.productActions = this.container;

		if (!this.elements.productActions || !this.elements.productActions.classList.contains("product-actions")) {
			return; // Stop binding if the container is wrong
		}

		this.elements.purchaseOptionBoxes = this.elements.productActions.querySelectorAll(".variant-box");
		this.elements.submitButton = this.elements.productActions.querySelector(".checkout-button button");
		this.elements.submitSellingPlanId = this.elements.productActions.querySelector(".submit-selling-plan-id"); // Hidden input likely
		this.elements.submitVariantId = this.elements.productActions.querySelector(".submit-variant-id"); // Hidden input likely
		this.elements.sellingPlanInput = this.elements.productActions.querySelector('input[name="selling_plan"]'); // Find the actual form input
		this.elements.oneTimeButton = this.elements.productActions.querySelector(".one-time-add-to-cart");
		this.elements.frequencyContainer = this.elements.productActions.querySelector("[data-frequency-container]");
		this.elements.frequencyOptions = this.elements.productActions.querySelector(`#frequency-options-${this.config.SID}`);
		this.elements.frequencyDropdown = this.elements.productActions.querySelector(`#frequency-dropdown-${this.config.SID}`);
		this.elements.frequencyDescription = this.elements.productActions.querySelector(".frequency-description");
		this.elements.priceDisplays = this.elements.productActions.querySelectorAll(".price-display");
		this.elements.ctaText = this.container.querySelector(".cta-text");
		this.elements.giftContainer = this.elements.productActions.querySelector(".gift-container"); // Assuming a container for gifts
	}

	storeInitialProductData() {
		if (!window.productData) window.productData = {};

		const productIdFromData = this.container.dataset.productId;
		if (!productIdFromData) {
			return; // Cannot proceed without product ID
		}

		this.state.productId = productIdFromData;

		// Check if data for this product ID was already populated by the inline script
		if (window.productData[productIdFromData]?.initialized) {
			this.config.product = window.productData[productIdFromData]; // Assign to instance config
		} else {
			// If not pre-populated (e.g., inline script failed or wasn't present), log a warning.
			// The findVariantInProductData method might still work if data exists but lacks the 'initialized' flag.
			if (!window.productData[productIdFromData]) {
				window.productData[productIdFromData] = { id: productIdFromData, variants: [], initialized: false };
			}
		}
	}

	setState(updates) {
		const previousState = { ...this.state };
		Object.assign(this.state, updates);
		this.updateUI(updates, previousState);
	}

	updateUI(changes, previousState) {
		if ("isLoading" in changes) this.updateLoadingState(this.state.isLoading);
		if ("selectedBox" in changes && this.state.selectedBox !== previousState.selectedBox) {
			this.updateSelectedBoxUI(this.state.selectedBox);
		}
		if ("selectedFrequency" in changes || "sellingPlanId" in changes) {
			this.updateFrequencyUI();
		}
	}

	updateSelectedBoxUI(boxElement) {
		if (!boxElement || !this.elements.productActions) return;

		const isSub = boxElement.dataset.purchaseType === "subscribe";
		const variantId = boxElement.dataset.variant;
		let planId = isSub ? boxElement.dataset.subscriptionSellingPlanId : null;

		if (this.elements.submitSellingPlanId) this.elements.submitSellingPlanId.value = planId || "";
		if (this.elements.submitVariantId) this.elements.submitVariantId.value = variantId || "";
		if (this.elements.sellingPlanInput) {
			this.elements.sellingPlanInput.value = planId || "";
		}

		this.setState({
			sellingPlanId: planId,
			variantId: variantId,
			purchaseType: boxElement.dataset.purchaseType,
			productId: boxElement.dataset.product
		});

		// Visual selection update using aria-selected for accessibility and styling
		this.elements.purchaseOptionBoxes.forEach(box => {
			const isSelected = box === boxElement;

			// Set aria-selected for accessibility and styling
			box.setAttribute("aria-selected", isSelected ? "true" : "false");

			// Update radio button state
			const radio = box.querySelector('input[type="radio"]');
			if (radio) DOMUtils.updateProperty(radio, "checked", isSelected);
		});

		this.updateBuyButtonTracking(boxElement);
		this.updatePriceDisplay(boxElement);
		this.handleFrequencySelectorVisibility(isSub, boxElement);

		if (this.config.isSlideVariant) {
			this.updateVariantImage(boxElement);
		}
	}

	updateFrequencyUI() {
		const sellingPlanId = this.state.sellingPlanId;
		if (!sellingPlanId) return;

		const uiType = this.elements.frequencyContainer?.dataset.uiType || "tabs";

		if (uiType === "tabs" && this.elements.frequencyOptions) {
			this.elements.frequencyOptions.querySelectorAll("div[data-selling-plan-id]").forEach(box => {
				const boxId = box.getAttribute("data-selling-plan-id");
				const isSelected = boxId === sellingPlanId;
				// Use aria-selected for accessibility and styling
				box.setAttribute("aria-selected", isSelected ? "true" : "false");
			});
		} else if (uiType === "dropdown" && this.elements.frequencyDropdown) {
			// Dropdown selection is handled by its 'change' event,
			// but ensure value matches state if updated programmatically
			if (this.elements.frequencyDropdown.value !== sellingPlanId) {
				this.elements.frequencyDropdown.value = sellingPlanId;
			}
		}

		this.updateFrequencyDescription();
	}

	updateLoadingState(isLoading) {
		const { loadingButton } = this.state;

		if (this.elements.submitButton) {
			const isSubmitLoading = isLoading && loadingButton === "submit";
			this.elements.submitButton.setAttribute("aria-busy", isSubmitLoading ? "true" : "false");
			this.elements.submitButton.disabled = isSubmitLoading;

			if (isSubmitLoading) {
				this.elements.submitButton.innerHTML = `<div class="border-white/20 border-t-white animate-spin inline-block w-6 h-6 mx-auto border-2 rounded-full"></div>`;
			} else {
				this.elements.submitButton.innerHTML = this.elements.submitButton.getAttribute("data-original-text") || "Add To Cart";
			}
		}

		if (this.elements.oneTimeButton) {
			const isOneTimeLoading = isLoading && loadingButton === "oneTime";
			this.elements.oneTimeButton.setAttribute("aria-busy", isOneTimeLoading ? "true" : "false");
			this.elements.oneTimeButton.disabled = isOneTimeLoading;

			// Update one-time button content based on loading state
			if (isOneTimeLoading) {
				this.elements.oneTimeButton.innerHTML = '<div class="border-primary/20 border-t-primary animate-spin inline-block w-4 h-4 mr-2 align-middle border-2 rounded-full"></div> Adding...';
			} else {
				this.elements.oneTimeButton.innerHTML = this.elements.oneTimeButton.getAttribute("data-original-text") || "One-Time Purchase";
			}
		}

		if (this.elements.productActions) {
			this.elements.productActions.setAttribute("data-processing", isLoading ? "true" : "false");
		}
	}

	handleFrequencySelectorVisibility(isSubscription, selectedBoxElement) {
		if (!this.elements.frequencyContainer) return;

		if (isSubscription) {
			DOMUtils.toggleClass(this.elements.frequencyContainer, "hidden", false);
			// Ensure display is block if not hidden
			if (this.elements.frequencyContainer.style.display === "none") {
				this.elements.frequencyContainer.style.display = "block";
			}
			this.populateFrequencySelector(selectedBoxElement); // Populate/update options
		} else {
			DOMUtils.toggleClass(this.elements.frequencyContainer, "hidden", true);
		}
	}

	initState() {
		if (!this.elements.productActions || !this.elements.purchaseOptionBoxes?.length > 0) {
			return;
		}

		const defaultIdx = parseInt(this.elements.productActions.dataset.defaultVariantIndex, 10) || 0;
		let defaultBox = null;

		if (defaultIdx > 0 && this.elements.purchaseOptionBoxes.length >= defaultIdx) {
			defaultBox = this.elements.purchaseOptionBoxes[defaultIdx - 1];
		}
		if (!defaultBox) {
			defaultBox = Array.from(this.elements.purchaseOptionBoxes).find(box => box.dataset.purchaseType === "subscribe") || this.elements.purchaseOptionBoxes[0];
		}

		if (this.elements.submitButton) {
			this.elements.submitButton.setAttribute("data-original-text", this.elements.submitButton.textContent);
		}
		if (this.elements.oneTimeButton) {
			this.elements.oneTimeButton.setAttribute("data-original-text", this.elements.oneTimeButton.textContent);
		}

		if (defaultBox) {
			// Set initial state WITHOUT triggering full UI update yet
			this.state.selectedBox = defaultBox;
			this.state.purchaseType = defaultBox.dataset.purchaseType || null;
			this.state.variantId = defaultBox.dataset.variant || null;
			this.state.productId = defaultBox.dataset.product || null;

			// For subscriptions, we'll get the selling plan ID from the populateFrequencySelector method
			// which will identify the recommended plan
			if (this.state.purchaseType === "subscribe") {
				// Don't set sellingPlanId yet - let populateFrequencySelector determine the recommended one
				this.state.sellingPlanId = null;
			} else {
				this.state.sellingPlanId = null;
			}

			// Manually apply initial UI state based on the default box
			this.updateSelectedBoxUI(defaultBox); // This handles selection visuals, price, frequency visibility etc.

			// Populate frequency selector explicitly if it's a subscription
			if (this.state.purchaseType === "subscribe") {
				this.handleFrequencySelectorVisibility(true, defaultBox);
			}
		}

		setTimeout(() => this.setState({ isInitialLoad: false }), 100);
	}

	attachEventListeners() {
		if (!this.elements.productActions) {
			return;
		}

		// Variant box selection - click event
		this.elements.productActions.addEventListener("click", e => {
			const box = e.target.closest(".variant-boxes .variant-box");
			if (box && box.getAttribute("aria-selected") !== "true") {
				e.preventDefault();
				this.setState({ selectedBox: box }); // Trigger state update
			}
		});

		// Variant box keyboard navigation
		this.elements.productActions.addEventListener("keydown", e => {
			if (e.key !== "Enter" && e.key !== " ") return;

			const box = e.target.closest(".variant-boxes .variant-box");
			if (box && box.getAttribute("aria-selected") !== "true") {
				e.preventDefault();
				this.setState({ selectedBox: box }); // Trigger state update
			}
		});

		// Frequency selection (Tabs) - click event
		if (this.elements.frequencyOptions) {
			this.elements.frequencyOptions.addEventListener("click", e => {
				const option = e.target.closest(".frequency-box[data-selling-plan-id]");
				if (option) {
					this.selectFrequencyOption(option);
				}
			});

			// Frequency selection keyboard navigation
			this.elements.frequencyOptions.addEventListener("keydown", e => {
				if (e.key !== "Enter" && e.key !== " ") return;

				const option = e.target.closest(".frequency-box[data-selling-plan-id]");
				if (option) {
					e.preventDefault();
					this.selectFrequencyOption(option);
				}
			});
		}

		// Frequency selection (Dropdown)
		if (this.elements.frequencyDropdown) {
			this.elements.frequencyDropdown.addEventListener("change", e => {
				this.selectFrequencyOption(e.target.options[e.target.selectedIndex]);
				// Remove focus after selection
				e.target.blur();
			});
		}

		// Main submit button
		if (this.elements.submitButton) {
			this.elements.submitButton.addEventListener("click", async e => {
				e.preventDefault();
				if (this.state.isLoading || this.state.isRedirectingToCheckout) return;

				this.setState({ isLoading: true, loadingButton: "submit" });

				try {
					const items = this.prepareItemsForCart();
					if (!items) {
						this.setState({ isLoading: false, loadingButton: null });
						return;
					}

					if (this.config.buyType === "buy_now") {
						await this.handleBuyNowFlow(items);
						// Loading state reset happens in handleBuyNowFlow
					} else {
						await this.addValidItemsToCart(items);
						this.setState({ isLoading: false, loadingButton: null });
					}
				} catch (err) {
					console.error("Submit error:", err);
					showNotification(parseErrorMessage(err, "checkout"), "error");
					this.setState({ isLoading: false, loadingButton: null });
				}
			});
		}

		// One-time purchase button
		if (this.elements.oneTimeButton) {
			this.elements.oneTimeButton.addEventListener("click", async e => {
				e.preventDefault();
				if (this.state.isLoading || this.state.isRedirectingToCheckout) return;

				this.setState({ isLoading: true, loadingButton: "oneTime" });

				try {
					const variantId = this.elements.oneTimeButton.dataset.variantId;
					if (!variantId) throw new Error("Invalid variant ID for one-time purchase");

					let items = [{ id: parseInt(variantId, 10), quantity: 1 }];

					// Add gift if applicable and selected for one-time
					if (this.config.isOneTimeGift) {
						const selectedGiftId = this.getSelectedGiftId(false); // Get non-subscription gift ID
						if (selectedGiftId) {
							items.push({ id: parseInt(selectedGiftId, 10), quantity: 1 });
						} else if (this.elements.productActions?.dataset.giftsAmount > 0) {
							// If gifts are present but none selected specifically for one-time,
							// decide if this is an error or if a gift isn't mandatory for one-time.
							// Currently assuming gift is optional or handled elsewhere if mandatory.
							// console.warn("One-time gift enabled but no gift selected.");
						}
					}

					if (this.config.buyType === "buy_now") {
						await this.handleBuyNowFlow(items);
					} else {
						await this.addValidItemsToCart(items);

						// Show success state for 2 seconds then reset
						this.elements.oneTimeButton.innerHTML = "✓ Added!";
						this.elements.oneTimeButton.classList.add("text-green-700", "border-green-700");
						this.elements.oneTimeButton.classList.remove("text-red-600", "border-red-600");

						setTimeout(() => {
							this.setState({ isLoading: false, loadingButton: null });
							this.elements.oneTimeButton.classList.remove("text-green-700", "border-green-700");
						}, 2000);
					}
				} catch (err) {
					console.error("One-time add error:", err);
					showNotification(parseErrorMessage(err, "cart-add"), "error");

					// Show error state for 2 seconds then reset
					this.elements.oneTimeButton.innerHTML = "⚠ Failed";
					this.elements.oneTimeButton.classList.add("text-red-600", "border-red-600");
					this.elements.oneTimeButton.classList.remove("text-green-700", "border-green-700");

					setTimeout(() => {
						this.setState({ isLoading: false, loadingButton: null });
						this.elements.oneTimeButton.classList.remove("text-red-600", "border-red-600");
					}, 2000);
				}
			});
		}

		// Add visibility change listener to handle browser back button
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "visible") {
				// Small delay to ensure DOM is ready after tab/page becomes visible
				setTimeout(() => {
					// Check if we need to repopulate the frequency selector
					if (this.state.selectedBox && this.state.purchaseType === "subscribe") {
						this.handleFrequencySelectorVisibility(true, this.state.selectedBox);
					}
				}, 100);
			}
		});

		// Add pageshow event as additional protection for back button
		window.addEventListener("pageshow", event => {
			// persisted is true if the page was restored from the bfcache
			if (event.persisted) {
				// Reinitialize UI elements
				if (this.state.selectedBox) {
					this.updateSelectedBoxUI(this.state.selectedBox);
				}
			}
		});
	}

	prepareItemsForCart() {
		const selectedBox = this.state.selectedBox;
		if (!selectedBox) {
			showNotification("Please select a purchase option");
			return null;
		}

		const variantId = this.state.variantId;
		const isSub = this.state.purchaseType === "subscribe";
		const sellingPlanId = isSub ? this.state.sellingPlanId : null;

		if (!variantId) {
			showNotification("Invalid product option selected");
			return null;
		}
		if (isSub && !sellingPlanId) {
			// Attempt to auto-select first available plan if none chosen - might be needed if UI fails
			const variantData = this.findVariantInProductData(variantId);
			if (variantData?.selling_plan_allocations?.length > 0) {
				this.state.sellingPlanId = variantData.selling_plan_allocations[0].selling_plan.id;
			} else {
				showNotification("Please select a subscription frequency");
				return null;
			}
		}

		let items = [
			{
				id: parseInt(variantId, 10),
				quantity: 1,
				...(isSub && this.state.sellingPlanId ? { selling_plan: this.state.sellingPlanId } : {})
			}
		];

		const giftsAmount = parseInt(this.elements.productActions?.dataset.giftsAmount || "0", 10);

		if (giftsAmount > 0) {
			const selectedGiftId = this.getSelectedGiftId(isSub);
			if (!selectedGiftId) {
				showNotification("Please select your free gift");
				return null;
			}
			items.push({ id: parseInt(selectedGiftId, 10), quantity: 1 });
		}

		return items;
	}

	getSelectedGiftId(isSubscription) {
		if (!this.elements.giftContainer) {
			return null;
		}

		// Find the selected gift box using the class added by the inline script
		const selectedGiftBox = this.elements.giftContainer.querySelector(".gift-box.selected");
		if (!selectedGiftBox) {
			return null;
		}

		// Find the border element *within* the selected gift box
		const selectedGiftOption = selectedGiftBox.querySelector(".gift-option-border");
		if (!selectedGiftOption) {
			return null;
		}

		// Return the appropriate gift ID
		const giftId = isSubscription ? selectedGiftOption.dataset.giftIdSubscription : selectedGiftOption.dataset.giftId;
		return giftId;
	}

	async handleBuyNowFlow(items) {
		try {
			this.setState({ isRedirectingToCheckout: true });

			// Remove cart popup if it exists
			const cartPopup = document.getElementById("upCart");
			if (cartPopup) cartPopup.remove();

			// Perform operations sequentially for safety in buy now
			await clearCart(); // Ensure cart is empty

			const addRes = await fetch("/cart/add.js", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ items }),
				cache: "no-store"
			});

			if (!addRes.ok) {
				const errorData = await addRes.json();
				throw Object.assign(new Error("Failed to add items for buy now"), { response: errorData });
			}

			CartCache.invalidate();

			// Add detailed debug logging right before checkout
			try {
				const cartData = await getCart(true); // Force fresh cart data
				console.log("=== CHECKOUT DEBUG INFO ===");
				console.log("Cart Items:", cartData.items);
				console.log("Item Count:", cartData.item_count);
				console.log("Total Price:", cartData.total_price);
				console.log("Items Detail:");
				cartData.items.forEach((item, index) => {
					console.log(`Item ${index + 1}:`, {
						title: item.title,
						variant_title: item.variant_title,
						quantity: item.quantity,
						price: item.price,
						line_price: item.line_price,
						final_price: item.final_price,
						discounted_price: item.discounted_price,
						selling_plan_allocation: item.selling_plan_allocation,
						variant_id: item.variant_id,
						sku: item.sku,
						properties: item.properties
					});
				});
				console.log("Cart Attributes:", cartData.attributes);
				console.log("Original Total Price:", cartData.original_total_price);
				console.log("Cart Token:", cartData.token);
				console.log("=== END CHECKOUT DEBUG INFO ===");
			} catch (debugErr) {
				console.warn("Failed to log checkout debug info:", debugErr);
			}

			// Reset loading states before redirecting
			this.setState({ isRedirectingToCheckout: false, isLoading: false, loadingButton: null });

			// Small delay to ensure state update completes before redirect
			setTimeout(() => {
				window.location.href = "/checkout";
			}, 50);
		} catch (err) {
			console.error("handleBuyNowFlow error:", err);
			// Reset state only if redirect fails
			this.setState({ isRedirectingToCheckout: false, isLoading: false, loadingButton: null });
			throw err; // Re-throw to be handled by caller
		}
	}

	async addValidItemsToCart(items) {
		try {
			// Check for existing subscriptions only if adding a subscription
			const subItemToAdd = items.find(i => i.selling_plan);
			if (subItemToAdd) {
				let cart = await getCart(true); // Force fresh fetch
				const variantIdToAdd = subItemToAdd.id;
				const itemsToRemove = {}; // Use object for easier update format

				cart.items.forEach(item => {
					// Check if existing item is a subscription for the *same variant*
					if (item.selling_plan_allocation && item.variant_id === variantIdToAdd) {
						itemsToRemove[item.key] = 0; // Mark for removal
					}
				});

				if (Object.keys(itemsToRemove).length > 0) {
					await fetch("/cart/update.js", {
						method: "POST",
						headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
						cache: "no-store",
						body: JSON.stringify({ updates: itemsToRemove })
					});
					CartCache.invalidate();
				}
			}

			// Add the new items
			const res = await fetch("/cart/add.js", {
				method: "POST",
				headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
				cache: "no-store",
				body: JSON.stringify({ items })
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw Object.assign(new Error("Failed to add items to cart"), { response: errorData });
			}

			CartCache.invalidate();
			if (typeof window.updateCart === "function") window.updateCart();
			showNotification("Items added to cart!", "success");
			return res.json();
		} catch (err) {
			console.error("Error in addValidItemsToCart:", err);
			throw err; // Re-throw
		}
	}

	updatePriceDisplay(el) {
		if (!this.elements.priceDisplays || this.elements.priceDisplays.length === 0 || !el) return;

		const subItemPrice = parseFloat(el.dataset.subscriptionItemPrice) || 0;
		const subTotalPrice = parseFloat(el.dataset.subscriptionPrice) || 0;
		const origItemCap = parseFloat(el.dataset.originalItemCap) || 0;
		const bottles = parseInt(el.dataset.bottleQuantity, 10) || 1;

		if (origItemCap === 0) return; // Avoid division by zero

		const totalOrigCap = origItemCap * bottles;

		const subscriptionDiscountPercent = parseFloat(el.dataset.subscriptionDiscount) || 0;
		const firstMonthDiscountPercent = parseFloat(el.dataset.firstMonthDiscount) || 0;

		// Price calculation based on applied discounts
		const effectiveDiscountPercent = subscriptionDiscountPercent + firstMonthDiscountPercent;
		const effectiveMultiplier = (100 - effectiveDiscountPercent) / 100;

		const firstMonthItemPrice = origItemCap * effectiveMultiplier;
		const firstMonthTotalPrice = totalOrigCap * effectiveMultiplier;

		// Regular price after first month (only subscription discount applies)
		const regularMultiplier = (100 - subscriptionDiscountPercent) / 100;
		const regularItemPrice = origItemCap * regularMultiplier;
		const regularTotalPrice = totalOrigCap * regularMultiplier;

		// Determine which price to display (per bottle or total)
		const displayItemPrice = this.config.priceFormat === "per_bottle" ? firstMonthItemPrice : firstMonthTotalPrice;
		const displayOrigPrice = this.config.priceFormat === "per_bottle" ? origItemCap : totalOrigCap;
		const displayRegularPrice = this.config.priceFormat === "per_bottle" ? regularItemPrice : regularTotalPrice;

		// Calculate savings IN CENTS
		const saveAmount = displayOrigPrice - displayItemPrice;

		// Calculate savings IN DOLLARS and round to nearest whole number
		const saveAmountDollars = saveAmount / 100;
		const roundedSaveAmountDollars = Math.round(saveAmountDollars);
		const savingsText = roundedSaveAmountDollars > 0 ? `SAVE ${this.state.currencySymbol}${roundedSaveAmountDollars}` : "";

		// Format prices (expects cents input)
		const formatMoney = amount => `${this.state.currencySymbol}${(amount / 100).toFixed(2)}`;
		const newMainPriceText = formatMoney(displayItemPrice);
		const newComparePriceText = formatMoney(displayOrigPrice);
		const regularPriceFormatted = formatMoney(displayRegularPrice);

		// Future price notice text
		const newFuturePriceText = firstMonthDiscountPercent > 0 ? `Special price for first order. Refills for ${regularPriceFormatted}${this.config.priceFormat === "per_bottle" ? "/bottle" : ""}.` : "";

		// Total line text (only shown for 'per_bottle' format when there's a difference)
		const newTotalLineHTML =
			this.config.priceFormat === "per_bottle" && firstMonthTotalPrice !== firstMonthItemPrice
				? `Total ${formatMoney(firstMonthTotalPrice / 100)} <span class="total-price-cap text-gray-500 line-through">${formatMoney(totalOrigCap / 100)}</span>`
				: "";

		this.elements.priceDisplays.forEach(display => {
			// Check if content has actually changed to avoid unnecessary animations
			const mainPriceEl = display.querySelector(".main-price .price");
			const capEl = display.querySelector(".cap");
			const discountBadgeEl = display.querySelector(".discount-badge");
			const totalLineEl = display.querySelector(".total-line");
			const futurePriceEl = display.querySelector(".future-price-notice");
			const perText = display.querySelector(".per-text");

			const hasContentChanged =
				(mainPriceEl && mainPriceEl.textContent !== newMainPriceText) ||
				(capEl && capEl.textContent !== newComparePriceText) ||
				(discountBadgeEl && discountBadgeEl.textContent !== savingsText) ||
				(totalLineEl && totalLineEl.innerHTML !== newTotalLineHTML) ||
				(futurePriceEl && futurePriceEl.textContent !== newFuturePriceText);

			// Add a data attribute to the display for price format
			display.setAttribute("data-price-format", this.config.priceFormat);

			// Set data attributes for saving calculations
			display.setAttribute("data-has-savings", saveAmount > 0 ? "true" : "false");

			// If content has changed and not initial load, animate the transition
			if (hasContentChanged && !this.state.isInitialLoad) {
				// Start fade out
				display.setAttribute("data-updating", "true");

				// After fade out completes, update content and start fade in
				setTimeout(() => {
					// Set prices
					if (mainPriceEl) mainPriceEl.textContent = newMainPriceText;
					if (capEl) capEl.textContent = newComparePriceText;
					if (discountBadgeEl) {
						discountBadgeEl.textContent = savingsText;
						discountBadgeEl.setAttribute("data-visible", saveAmount > 0 && this.config.priceFormat === "total" ? "true" : "false");
					}
					if (totalLineEl) totalLineEl.innerHTML = newTotalLineHTML;
					if (futurePriceEl) futurePriceEl.textContent = newFuturePriceText;

					// Set per bottle text visibility based on format
					if (perText) {
						perText.style.display = this.config.priceFormat === "total" ? "none" : "";
					}

					// Start fade in
					display.setAttribute("data-updating", "false");
				}, 220); // Slightly longer than the fadeOut animation duration
			} else {
				// No animation needed, just update content
				if (mainPriceEl) mainPriceEl.textContent = newMainPriceText;
				if (capEl) capEl.textContent = newComparePriceText;
				if (discountBadgeEl) {
					discountBadgeEl.textContent = savingsText;
					discountBadgeEl.setAttribute("data-visible", saveAmount > 0 && this.config.priceFormat === "total" ? "true" : "false");
				}
				if (totalLineEl) totalLineEl.innerHTML = newTotalLineHTML;
				if (futurePriceEl) futurePriceEl.textContent = newFuturePriceText;

				// Set per bottle text visibility based on format
				if (perText) {
					perText.style.display = this.config.priceFormat === "total" ? "none" : "";
				}
			}
		});
	}

	performSlideUpdate(slider, variantId) {
		try {
			if (!slider || !variantId) return;
			const slideIndex = Array.from(slider.slides).findIndex(s => s.dataset.variantId === variantId);
			if (slideIndex !== -1 && slider.activeIndex !== slideIndex) {
				slider.update(); // Update swiper state before sliding
				requestAnimationFrame(() => {
					slider.slideTo(slideIndex, 300); // Animate to the correct slide
					// Swiper usually updates itself after slideTo, but an extra update can help sometimes
					// setTimeout(() => slider.update(), 350);
				});
			}
		} catch (err) {
			console.error("Swiper slide update error:", err);
		}
	}

	updateVariantImage(el) {
		const variantId = el.dataset.variant;
		if (!variantId) return;

		const sliderInstanceId = `productSliderAllInOne${this.config.SID}`;
		let slider = window[sliderInstanceId];

		// If slider exists and is initialized, perform update
		if (slider?.slides?.length) {
			this.performSlideUpdate(slider, variantId);
		} else {
			// Poll for slider initialization if it's not ready yet
			let attempts = 0;
			const maxAttempts = 50; // Try for 5 seconds (50 * 100ms)
			const interval = setInterval(() => {
				slider = window[sliderInstanceId];
				if (slider?.slides?.length) {
					clearInterval(interval);
					this.performSlideUpdate(slider, variantId);
				} else if (++attempts >= maxAttempts) {
					clearInterval(interval);
					console.warn(`Swiper instance ${sliderInstanceId} not found after ${maxAttempts} attempts.`);
				}
			}, 100);
		}
	}

	updateBuyButtonTracking(el) {
		if (!this.elements.submitButton || !el) return;
		const sku = el.dataset.sku;
		const purchaseType = el.dataset.purchaseType;

		// Update tracking name attribute if it follows the expected pattern
		const currentName = this.elements.submitButton.getAttribute("name") || "";
		if (currentName.startsWith("track:")) {
			const parts = currentName.split("|");
			const action = parts[0]; // e.g., "track:add"
			const params = {};
			parts.slice(1).forEach(p => {
				const [k, v] = p.split(":");
				if (k) params[k] = v;
			});
			params["variant-sku"] = sku;
			params["purchase-type"] = purchaseType;
			const newName = `${action}|${Object.entries(params)
				.map(([k, v]) => `${k}:${v}`)
				.join("|")}`;
			DOMUtils.updateAttribute(this.elements.submitButton, "name", newName);
		}

		// Update data attributes used by other logic
		DOMUtils.updateAttribute(this.elements.submitButton, "data-sku", sku);
		DOMUtils.updateAttribute(this.elements.submitButton, "data-purchase-type", purchaseType);
	}

	selectFrequencyOption(optionElementOrValue) {
		if (!optionElementOrValue) return;

		let newSellingPlanId = null;
		let selectedOptionElement = null;

		// Handle both element and value input
		if (typeof optionElementOrValue === "string") {
			newSellingPlanId = optionElementOrValue;
			// Find the corresponding element if needed (e.g., for UI update)
			if (this.elements.frequencyOptions) {
				selectedOptionElement = this.elements.frequencyOptions.querySelector(`[data-selling-plan-id="${newSellingPlanId}"]`);
			} else if (this.elements.frequencyDropdown) {
				selectedOptionElement = Array.from(this.elements.frequencyDropdown.options).find(opt => opt.value === newSellingPlanId);
			}
		} else if (optionElementOrValue.nodeType === 1) {
			// It's an element
			selectedOptionElement = optionElementOrValue;
			newSellingPlanId = selectedOptionElement.dataset.sellingPlanId || selectedOptionElement.value;
		}

		if (!newSellingPlanId || newSellingPlanId === this.state.sellingPlanId) return; // No change

		this.setState({
			selectedFrequency: selectedOptionElement, // Store element for potential UI use
			sellingPlanId: newSellingPlanId
		});

		// Update the hidden input if it exists
		if (this.elements.submitSellingPlanId) {
			this.elements.submitSellingPlanId.value = newSellingPlanId;
		}

		// Update the actual form selling_plan input too
		if (this.elements.sellingPlanInput) {
			this.elements.sellingPlanInput.value = newSellingPlanId;
		}

		// Update associated variant box data (important!)
		if (this.state.selectedBox && this.state.selectedBox.dataset.purchaseType === "subscribe") {
			this.state.selectedBox.dataset.subscriptionSellingPlanId = newSellingPlanId;
		}

		// UI update is handled by updateFrequencyUI via setState
	}

	populateFrequencySelector(selectedVariantBox) {
		if (!selectedVariantBox || selectedVariantBox.dataset.purchaseType !== "subscribe" || !this.elements.frequencyContainer) {
			if (this.elements.frequencyContainer) this.elements.frequencyContainer.classList.add("hidden");
			return;
		}

		const variantId = selectedVariantBox.dataset.originalVariant || selectedVariantBox.dataset.variant;
		const allowedPlansAttr = selectedVariantBox.dataset.allowedSellingPlans;
		const allowedPlanIds = allowedPlansAttr ? allowedPlansAttr.split(",").map(id => id.trim()) : null;
		const uiType = this.elements.frequencyContainer.dataset.uiType || "tabs";
		const optionsContainer = uiType === "dropdown" ? this.elements.frequencyDropdown : this.elements.frequencyOptions;

		if (!optionsContainer) {
			console.error(`Frequency options container not found for UI type: ${uiType}`);
			this.elements.frequencyContainer.classList.add("hidden");
			return;
		}

		// Always clear previous options to prevent duplicates
		optionsContainer.innerHTML = "";

		const variantData = this.findVariantInProductData(variantId);

		if (!variantData?.selling_plan_allocations?.length) {
			console.warn(`No selling plan allocations found for variant ${variantId}. Hiding frequency selector.`);
			this.handleFallbackFrequencyOptions(selectedVariantBox, optionsContainer, this.elements.frequencyContainer); // Use fallback if applicable
			return;
		}

		let plans = variantData.selling_plan_allocations;

		// Filter by allowed IDs if provided
		if (allowedPlanIds) {
			plans = plans.filter(alloc => allowedPlanIds.includes(alloc.selling_plan.id.toString()));
			if (plans.length === 0) {
				console.warn(`No selling plans matched the allowed list for variant ${variantId}:`, allowedPlansAttr);
				this.handleFallbackFrequencyOptions(selectedVariantBox, optionsContainer, this.elements.frequencyContainer); // Use fallback
				return;
			}
		}

		// Sort plans by frequency
		plans.sort((a, b) => {
			const freqA = extractFrequency(a.selling_plan.name);
			const freqB = extractFrequency(b.selling_plan.name);
			// Convert to a comparable unit (days)
			const daysA = freqA.unit === "month" ? freqA.value * 30 : freqA.unit === "week" ? freqA.value * 7 : freqA.value;
			const daysB = freqB.unit === "month" ? freqB.value * 30 : freqB.unit === "week" ? freqB.value * 7 : freqB.value;
			return daysA - daysB;
		});

		// Find recommended plan (matches bottle quantity, in months, OR 30 days if quantity is 1)
		const bottleQuantity = parseInt(selectedVariantBox.dataset.bottleQuantity || "1", 10);
		let recommendedPlanId = null;
		plans.forEach(alloc => {
			const { value, unit } = extractFrequency(alloc.selling_plan.name);
			// Recommended if: unit is month AND value matches quantity
			// OR if: quantity is 1 AND unit is day AND value is 30
			// OR if: unit is week AND value is 4
			if ((unit === "month" && value === bottleQuantity) || (bottleQuantity === 1 && unit === "day" && value === 30) || (unit === "week" && value === 4)) {
				recommendedPlanId = alloc.selling_plan.id.toString();
			}
		});

		// IMPORTANT CHANGE: Prioritize the recommended plan ID for the initial load
		// If no sellingPlanId is set yet, or if we're in initial load, use the recommended one
		if (this.state.isInitialLoad || !this.state.sellingPlanId) {
			// Determine the plan ID to pre-select - PRIORITIZE RECOMMENDED PLAN
			let planIdToSelect = recommendedPlanId || this.state.sellingPlanId || selectedVariantBox.dataset.subscriptionSellingPlanId || plans[0]?.selling_plan.id.toString();

			// Update the state and form inputs directly with the recommended plan
			this.state.sellingPlanId = planIdToSelect;

			// Update the form fields
			if (this.elements.submitSellingPlanId) {
				this.elements.submitSellingPlanId.value = planIdToSelect;
			}
			if (this.elements.sellingPlanInput) {
				this.elements.sellingPlanInput.value = planIdToSelect;
			}

			// Update the variant box data
			selectedVariantBox.dataset.subscriptionSellingPlanId = planIdToSelect;
		} else {
			// For non-initial loads, respect the current selection
			let planIdToSelect = this.state.sellingPlanId || selectedVariantBox.dataset.subscriptionSellingPlanId || recommendedPlanId || plans[0]?.selling_plan.id.toString();
		}

		console.log(`populateFrequencySelector: bottleQuantity=${bottleQuantity}, recommendedPlanId=${recommendedPlanId}, planIdToSelect=${this.state.sellingPlanId}`);

		plans.forEach(allocation => {
			const plan = allocation.selling_plan;
			const { value, unit } = extractFrequency(plan.name);
			const isSelected = plan.id.toString() === this.state.sellingPlanId;
			const isRecommended = plan.id.toString() === recommendedPlanId;

			if (uiType === "dropdown") {
				let optionText = `Every ${value} ${unit}${value > 1 ? "s" : ""}`;
				if (isRecommended) {
					optionText += " (Recommended use)";
				}
				const option = DOMUtils.createElement("option", {
					value: plan.id,
					textContent: optionText,
					selected: isSelected,
					className: isRecommended ? "text-primary" : "",
					"data-frequency-value": value,
					"data-frequency-unit": unit
				});
				optionsContainer.appendChild(option);
			} else {
				// Tabs UI
				const freqBox = DOMUtils.createElement("div", {
					className:
						"frequency-box rounded border-2 border-primary-lighter cursor-pointer py-2 px-3 min-w-[90px] max-w-[168px] text-center w-full transition-all duration-300 ease-in-out aria-selected:bg-primary aria-selected:text-white aria-[selected=false]:bg-white aria-[selected=false]:text-primary hover:bg-gray-100",
					"data-selling-plan-id": plan.id,
					"data-frequency-value": value,
					"data-frequency-unit": unit,
					"aria-selected": isSelected ? "true" : "false",
					role: "tab",
					tabindex: "0", // Make focusable for keyboard navigation
					innerHTML: `<span class="font-semibold text-[14px] block">Every ${value}</span><span class="text-[12px] block">${unit}${value > 1 ? "s" : ""}</span>`
				});
				optionsContainer.appendChild(freqBox);
			}
		});

		// For dropdown, explicitly set the selected value
		if (uiType === "dropdown" && this.elements.frequencyDropdown) {
			// Set the value directly
			this.elements.frequencyDropdown.value = this.state.sellingPlanId;
		}

		this.updateFrequencyDescription(); // Update text based on selection
		this.elements.frequencyContainer.classList.remove("hidden"); // Ensure visible
	}

	handleFallbackFrequencyOptions(el, frequencyOptions, frequencyContainer) {
		// This provides a basic display if full product data isn't available
		// but we have a selling plan ID on the element itself.
		if (!frequencyOptions || !frequencyContainer) return;

		const currentSellingPlanId = el.dataset.subscriptionSellingPlanId;
		const bottleQuantity = parseInt(el.dataset.bottleQuantity || "1", 10); // Use for default text

		if (el.dataset.purchaseType === "subscribe" && currentSellingPlanId) {
			frequencyOptions.innerHTML = ""; // Clear any previous
			const uiType = frequencyContainer.dataset.uiType || "tabs";
			const isDropdown = uiType === "dropdown";

			let frequencyValue = bottleQuantity;
			let frequencyUnit = "month";

			if (el.dataset.frequencyValue && el.dataset.frequencyUnit) {
				frequencyValue = parseInt(el.dataset.frequencyValue, 10);
				frequencyUnit = el.dataset.frequencyUnit;
			}

			const fallbackText = `Every ${frequencyValue} ${frequencyUnit}${frequencyValue > 1 ? "s" : ""}`;

			if (isDropdown) {
				const option = DOMUtils.createElement("option", {
					value: currentSellingPlanId,
					textContent: fallbackText,
					selected: true,
					"data-selling-plan-id": currentSellingPlanId,
					"data-frequency-value": frequencyValue.toString(),
					"data-frequency-unit": frequencyUnit
				});
				frequencyOptions.appendChild(option);
			} else {
				const fallbackBox = DOMUtils.createElement("div", {
					className:
						"frequency-box rounded border-2 border-primary-lighter cursor-pointer py-2 px-3 min-w-[90px] max-w-[168px] text-center w-full transition-all duration-300 ease-in-out aria-selected:bg-primary aria-selected:text-white aria-[selected=false]:bg-white aria-[selected=false]:text-primary hover:bg-gray-100",
					"data-selling-plan-id": currentSellingPlanId,
					"data-frequency-value": frequencyValue.toString(),
					"data-frequency-unit": frequencyUnit,
					"aria-selected": "true", // Always selected in fallback
					role: "tab",
					tabindex: "0", // Make focusable for keyboard navigation
					innerHTML: `<span class="font-semibold text-[14px] block">Every ${frequencyValue}</span><span class="text-[12px] block">${frequencyUnit}${frequencyValue > 1 ? "s" : ""}</span>`
				});
				frequencyOptions.appendChild(fallbackBox);
			}

			frequencyContainer.classList.remove("hidden");
			setTimeout(() => this.updateFrequencyDescription(), 50); // Update description based on this fallback
		} else {
			// Hide if not subscription or no plan ID known
			frequencyContainer.classList.add("hidden");
			frequencyOptions.innerHTML = "";
		}
	}

	updateFrequencyDescription() {
		if (!this.elements.frequencyDescription || !this.state.selectedBox) return;

		const uiType = this.elements.frequencyContainer?.dataset.uiType || "tabs";

		// Hide description element if using dropdown UI
		if (uiType === "dropdown") {
			this.elements.frequencyDescription.innerHTML = ""; // Clear text
			this.elements.frequencyDescription.style.display = "none"; // Hide
			return; // Exit early
		}

		// --- Existing logic for Tabs UI ---
		const selectedBox = this.state.selectedBox;
		const bottleQuantity = parseInt(selectedBox.dataset.bottleQuantity || "1", 10);
		let selectedValue, selectedUnit;

		if (this.state.sellingPlanId) {
			let selectedOption;
			// Only check Tabs here since dropdown case is handled above
			if (uiType === "tabs" && this.elements.frequencyOptions) {
				selectedOption = this.elements.frequencyOptions.querySelector(`[data-selling-plan-id="${this.state.sellingPlanId}"]`);
			}

			if (selectedOption?.dataset.frequencyValue && selectedOption?.dataset.frequencyUnit) {
				selectedValue = parseInt(selectedOption.dataset.frequencyValue, 10);
				selectedUnit = selectedOption.dataset.frequencyUnit;
			} else {
				const variantData = this.findVariantInProductData(this.state.variantId);
				const allocation = variantData?.selling_plan_allocations?.find(a => a.selling_plan.id.toString() === this.state.sellingPlanId);
				if (allocation) {
					const freq = extractFrequency(allocation.selling_plan.name);
					selectedValue = freq.value;
					selectedUnit = freq.unit;
				}
			}
		}

		let description = "";
		if (selectedValue && selectedUnit && !(selectedUnit === "month" && selectedValue === bottleQuantity)) {
			description = `Recommended - ${bottleQuantity} month${bottleQuantity > 1 ? "s" : ""}`;
		}

		// Only animate if content has changed
		if (this.elements.frequencyDescription.innerHTML !== description) {
			// Start fade out
			this.elements.frequencyDescription.setAttribute("data-changing", "true");

			// After fade out completes, update content and start fade in
			setTimeout(() => {
				this.elements.frequencyDescription.innerHTML = description;

				// Small delay before fade in to ensure DOM has updated
				setTimeout(() => {
					this.elements.frequencyDescription.setAttribute("data-changing", "false");
				}, 20);
			}, 200);
		}
	}

	findVariantInProductData(variantId) {
		if (!window.productData || !variantId) return null;
		const numVariantId = parseInt(variantId, 10);

		// Find which product this variant belongs to (if multiple buy boxes on page)
		// Use the productId stored in state for this instance
		const product = window.productData[this.state.productId];

		if (product?.variants) {
			// Try direct ID match first
			let variant = product.variants.find(v => parseInt(v.id, 10) === numVariantId);
			if (variant) return variant;

			// Fallback: Check if the provided ID was an original_variant ID
			const selectedBox = this.state.selectedBox; // Use current selected box
			if (selectedBox && selectedBox.dataset.originalVariant) {
				const originalVariantId = parseInt(selectedBox.dataset.originalVariant, 10);
				if (originalVariantId === numVariantId) {
					// The ID passed *was* the original, we need the *actual* variant ID from the box
					const actualVariantId = parseInt(selectedBox.dataset.variant, 10);
					variant = product.variants.find(v => parseInt(v.id, 10) === actualVariantId);
					if (variant) return variant;
				} else {
					// The ID passed was the actual, try finding by original ID just in case
					variant = product.variants.find(v => parseInt(v.id, 10) === originalVariantId);
					if (variant) return variant;
				}
			}
		}

		// If still not found, maybe productData wasn't fully populated
		console.warn(`Variant ${variantId} not found in product data for product ${this.state.productId}`);
		return null;
	}

	moveCtaTextIfNeeded() {
		if (window.innerWidth < 768 && this.elements.ctaText && this.elements.productActions) {
			// Check if it's already moved
			if (this.elements.ctaText.parentElement !== this.elements.productActions) {
				this.elements.productActions.insertAdjacentElement("afterbegin", this.elements.ctaText);
			}
		}
		// Optional: Add logic to move it back on resize if needed
	}

	// Optional: Add a static method to retrieve instances
	static getInstance(sid) {
		return BuyBoxNewInstances.get(sid);
	}

	// Optional: Add a static method to retrieve all instances
	static getAllInstances() {
		return Array.from(BuyBoxNewInstances.values());
	}
}

// Initialization logic
document.addEventListener("DOMContentLoaded", () => {
	// Find all buy box containers on the page
	const buyBoxContainers = document.querySelectorAll("[data-buy-box-new-root]"); // Add this attribute to your root container in Liquid

	buyBoxContainers.forEach((container, index) => {
		// Extract config from data attributes
		const config = {
			SID: container.dataset.sid,
			buyType: container.dataset.buyType,
			priceFormat: container.dataset.priceFormat || "per_bottle",
			isSlideVariant: container.dataset.isSlideVariant === "true",
			isOneTimeGift: container.dataset.isOneTimeGift === "true",
			isOneTimePurchaseLink: container.dataset.isOneTimePurchaseLink === "true",
			currencySymbol: container.dataset.currencySymbol || "$",
			product: window.productData?.[container.dataset.productId] // Pass initial product data if available
		};

		if (!config.SID) {
			return;
		}
		if (!config.product && container.dataset.productId) {
			console.warn(`BuyBoxNew (${config.SID}): Product data for ID ${container.dataset.productId} not found in window.productData during initialization.`);
		}

		// Initialize a BuyBoxNew instance for each container
		new BuyBoxNew(container, config);
	});
});
