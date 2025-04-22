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
	`.replace(/\\s+/g, " ");

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
			// Optionally update config or just return existing instance
			const existingInstance = BuyBoxNewInstances.get(config.SID);
			// You might want to update the config of the existing instance if needed
			// existingInstance.config = { ...existingInstance.config, ...config };
			return existingInstance;
		}

		this.container = container;
		this.config = {
			// Default config
			priceFormat: "per_bottle",
			currencySymbol: "$",
			isSlideVariant: false,
			isOneTimeGift: false,
			isOneTimePurchaseLink: false,
			defaultSelectionIndex: 0,
			giftsAmount: 0,
			buyType: "add_to_cart", // Default buy type
			SID: null,
			productId: null,
			...config // Merge passed config
		};

		if (!this.config.SID) {
			console.error("BuyBoxNew requires a SID in config.");
			return;
		}
		if (BuyBoxNewInstances.has(this.config.SID)) {
			console.warn(`BuyBoxNew instance with SID ${this.config.SID} already exists.`);
			return BuyBoxNewInstances.get(this.config.SID);
		}

		this.state = {};
		this.elements = {};
		this.productData = null;
		this.initialized = false;

		this.bindElements();
		this.storeInitialProductData();
		this.initState();
		this.attachEventListeners();
		this.moveCtaTextIfNeeded();

		this.initialized = true;

		// Store the instance in the map
		BuyBoxNewInstances.set(this.config.SID, this);
	}

	bindElements() {
		this.elements.root = this.container;
		this.elements.variantBoxes = this.container.querySelectorAll(".variant-box");
		this.elements.priceDisplay = this.container.querySelector(".price-display");
		this.elements.price = this.elements.priceDisplay?.querySelector(".price");
		this.elements.cap = this.elements.priceDisplay?.querySelector(".cap");
		this.elements.perText = this.elements.priceDisplay?.querySelector(".per-text");
		this.elements.totalLine = this.container.querySelector(".total-line");
		this.elements.totalPrice = this.elements.totalLine?.querySelector(".total-price");
		this.elements.totalPriceCap = this.elements.totalLine?.querySelector(".total-price-cap");
		this.elements.discountBadge = this.container.querySelector(".discount-badge");
		this.elements.futurePriceNotice = this.container.querySelector(".future-price-notice");
		this.elements.submitButton = this.container.querySelector(".variant-submit");
		this.elements.oneTimePurchaseLink = this.container.querySelector(".one-time-add-to-cart");
		this.elements.checkoutButtonContainer = this.container.querySelector(".checkout-button");
		this.elements.form = this.container.querySelector("form");
		this.elements.downpayForm = this.container.querySelector(".downpay-form"); // Added for Downpay
		this.elements.downpayVariantInput = this.elements.downpayForm?.querySelector(".downpay-variant-id-input"); // Added for Downpay
		this.elements.downpayPlanInput = this.elements.downpayForm?.querySelector(".downpay-selling-plan-input"); // Added for Downpay
		this.elements.giftSelectors = this.container.querySelectorAll(".gift-selector");
	}

	storeInitialProductData() {
		const productId = this.config.productId;
		if (window.productData && window.productData[productId] && window.productData[productId].initialized) {
			this.productData = window.productData[productId];
		} else {
			console.warn(`Product data for ${productId} not found or not initialized.`);
			this.productData = { variants: [] }; // Fallback
		}
	}

	setState(updates) {
		const previousState = { ...this.state };
		const changes = {};
		for (const key in updates) {
			if (this.state[key] !== updates[key]) {
				changes[key] = { from: this.state[key], to: updates[key] };
				this.state[key] = updates[key];
			}
		}
		if (Object.keys(changes).length > 0) {
			// console.log(`[BuyBox ${this.config.SID}] State changed:`, changes);
			this.updateUI(changes, previousState);
		}
	}

	updateUI(changes, previousState) {
		if (changes.selectedVariantId) {
			const selectedBoxElement = this.container.querySelector(`.variant-box[data-original-variant="${this.state.selectedVariantId}"]`);
			if (selectedBoxElement) {
				this.updateSelectedBoxUI(selectedBoxElement);
				this.updatePriceDisplay(selectedBoxElement);
				this.updateVariantImage(selectedBoxElement);
				this.updateBuyButtonTracking(selectedBoxElement);

				// --- Downpay Form Update ---
				if (this.elements.downpayForm && this.elements.downpayVariantInput && this.elements.downpayPlanInput) {
					const downpayPlanId = selectedBoxElement.dataset.downpayPlanId || "";
					const variantId = selectedBoxElement.dataset.originalVariant || ""; // Use originalVariant for the ID
					// console.log(`[BuyBox ${this.config.SID}] Updating Downpay form: Variant=${variantId}, Plan=${downpayPlanId}`);
					DOMUtils.updateProperty(this.elements.downpayVariantInput, "value", variantId);
					DOMUtils.updateProperty(this.elements.downpayPlanInput, "value", downpayPlanId);
				}
				// --- End Downpay Form Update ---

				if (this.config.isSlideVariant) {
					const slider = this.container.closest(".card"); // Adjust selector if needed
					this.performSlideUpdate(slider, this.state.selectedVariantId);
				}
			}
		}

		if (changes.isLoading) {
			this.updateLoadingState(this.state.isLoading);
		}

		if (changes.selectedGiftId) {
			// Update gift selector UI if needed
		}
	}

	updateSelectedBoxUI(boxElement) {
		if (!boxElement) return;
		this.elements.variantBoxes.forEach(box => {
			DOMUtils.updateAttribute(box, "aria-selected", box === boxElement ? "true" : "false");
			// Update discount badge style if needed - handled by CSS [aria-selected=true]
		});
		const isSubscription = boxElement.dataset.purchaseType === "subscribe";
		const sellingPlanId = isSubscription ? boxElement.dataset.subscriptionSellingPlanId : null;

		this.setState({
			selectedVariantId: boxElement.dataset.originalVariant,
			selectedSku: boxElement.dataset.sku,
			isSubscription: isSubscription,
			selectedSellingPlanId: sellingPlanId
		});
	}

	updateLoadingState(isLoading) {
		DOMUtils.updateAttribute(this.elements.root, "data-processing", isLoading ? "true" : "false");
		if (this.elements.submitButton) {
			DOMUtils.updateProperty(this.elements.submitButton, "disabled", isLoading);
			DOMUtils.updateAttribute(this.elements.submitButton, "aria-busy", isLoading ? "true" : "false");
			const buttonContent = this.elements.submitButton.querySelector(".button__content");
			const buttonLoader = this.elements.submitButton.querySelector(".loading-overlay__spinner");
			if (buttonContent) DOMUtils.updateStyle(buttonContent, "display", isLoading ? "none" : "inline-block");
			if (buttonLoader) DOMUtils.toggleClass(buttonLoader, "hidden", !isLoading);
		}
		if (this.elements.oneTimePurchaseLink) {
			DOMUtils.updateAttribute(this.elements.oneTimePurchaseLink, "aria-busy", isLoading ? "true" : "false");
		}
	}

	initState() {
		const initialState = {
			isLoading: false,
			selectedVariantId: null,
			selectedSellingPlanId: null, // For standard subscriptions
			selectedDownpayPlanId: null, // For Downpay
			isSubscription: false, // Tracks if the *selected variant* is intended for subscription
			// selectedFrequencyPlanId: null, // Removed as Downpay handles its own logic
			currentPrice: 0,
			currentCapPrice: 0,
			currentSavePercents: 0,
			currentTotalPrice: 0,
			currentTotalCapPrice: 0,
			futurePriceNotice: "",
			selectedGiftId: null
		};

		// Determine initial selected variant
		const variantBoxes = this.elements.variantBoxes;
		let initialBox = null;
		if (variantBoxes.length > 0) {
			const defaultIndex = Math.max(0, Math.min(this.config.defaultSelectionIndex, variantBoxes.length - 1));
			initialBox = variantBoxes[defaultIndex];
			initialBox.setAttribute("aria-selected", "true"); // Visually mark initial selection
			initialBox.setAttribute("tabindex", "0");
			variantBoxes.forEach((box, index) => {
				if (index !== defaultIndex) {
					box.setAttribute("aria-selected", "false");
					box.setAttribute("tabindex", "-1");
				}
			});

			initialState.selectedVariantId = initialBox.dataset.originalVariant;
			initialState.selectedSellingPlanId = initialBox.dataset.subscriptionSellingPlanId || null; // Keep for non-Downpay
			initialState.selectedDownpayPlanId = initialBox.dataset.downpayPlanId || null; // Store initial Downpay ID
			initialState.isSubscription = initialBox.dataset.purchaseType === "subscribe";
		}

		this.state = initialState;
		// Initial UI update based on derived state
		if (initialBox) {
			this.updatePriceDisplay(initialBox);
			this.updateBuyButtonTracking(initialBox);
			this.updateVariantImage(initialBox);

			// --- Set Initial Downpay hidden form fields ---
			const downpayForm = this.container.querySelector("form.downpay-form");
			if (downpayForm) {
				const variantInput = downpayForm.querySelector(".downpay-variant-id-input");
				const planInput = downpayForm.querySelector(".downpay-selling-plan-input");
				const initialVariantId = initialState.selectedVariantId;
				const initialDownpayPlanId = initialState.selectedDownpayPlanId;

				if (variantInput && initialVariantId) {
					variantInput.value = initialVariantId;
					// console.log(`[BuyBox ${this.config.SID} Init] Set downpay variant ID input to: ${initialVariantId}`);
				}
				if (planInput) {
					// Check if planInput exists before setting value
					planInput.value = initialDownpayPlanId || "";
					// console.log(`[BuyBox ${this.config.SID} Init] Set downpay selling plan input to: ${planInput.value}`);
				}
			}
			// --- End Set Initial Downpay hidden form fields ---
		}
		// console.log(`[BuyBox ${this.config.SID}] Initial state:`, this.state);
	}

	attachEventListeners() {
		// Variant Box Selection
		this.elements.variantBoxes.forEach(box => {
			box.addEventListener("click", e => this.handleVariantSelection(e));
			box.addEventListener("keydown", e => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					this.handleVariantSelection(e);
				}
			});
		});

		// Gift Selection
		this.elements.giftSelectors.forEach(selector => {
			selector.addEventListener("change", e => {
				if (e.target.type === "radio" && e.target.checked) {
					this.setState({ selectedGiftId: e.target.value });
				}
			});
		});

		// Capture form submit to intercept regardless of other handlers
		if (this.elements.form) {
			this.elements.form.addEventListener(
				"submit",
				event => {
					console.log(`[BuyBox ${this.config.SID}] FORM SUBMIT captured.`);
					event.preventDefault();
					this.handleFormSubmission(event);
				},
				true
			);
		}
		if (this.elements.downpayForm && this.elements.downpayForm !== this.elements.form) {
			this.elements.downpayForm.addEventListener(
				"submit",
				event => {
					console.log(`[BuyBox ${this.config.SID}] DOWNPAY FORM SUBMIT captured.`);
					event.preventDefault();
					this.handleFormSubmission(event);
				},
				true
			);
		}

		// One-Time Purchase Link
		if (this.elements.oneTimePurchaseLink) {
			this.elements.oneTimePurchaseLink.addEventListener("click", e => this.handleOneTimePurchase(e));
		}
	}

	handleVariantSelection(event) {
		const selectedBox = event.currentTarget;
		const variantId = selectedBox.dataset.originalVariant;
		const downpayPlanId = selectedBox.dataset.downpayPlanId || null;
		const subscriptionPlanId = selectedBox.dataset.subscriptionSellingPlanId || null;

		// Prevent re-selecting the same variant unnecessarily
		if (variantId === this.state.selectedVariantId) return;

		// Update state
		this.setState({
			selectedVariantId: variantId,
			selectedDownpayPlanId: downpayPlanId,
			selectedSellingPlanId: subscriptionPlanId, // Keep standard subscription plan ID too
			isSubscription: selectedBox.dataset.purchaseType === "subscribe"
		});

		// Update UI (handles aria-selected, price, image, etc.)
		this.updateSelectedBoxUI(selectedBox); // This calls updatePriceDisplay etc.

		// --- Update Downpay hidden form fields ---
		const downpayForm = this.container.querySelector("form.downpay-form");
		if (downpayForm) {
			const variantInput = downpayForm.querySelector(".downpay-variant-id-input");
			const planInput = downpayForm.querySelector(".downpay-selling-plan-input");

			if (variantInput) {
				variantInput.value = variantId;
				// console.log(`[BuyBox ${this.config.SID}] Updated downpay variant ID input to: ${variantId}`);
			} else {
				// console.warn(`[BuyBox ${this.config.SID}] Downpay variant ID input not found.`);
			}

			if (planInput) {
				// IMPORTANT: Only set the selling plan if a Downpay plan exists for this variant
				planInput.value = downpayPlanId || "";
				// console.log(`[BuyBox ${this.config.SID}] Updated downpay selling plan input to: ${planInput.value}`);
			} else {
				// console.warn(`[BuyBox ${this.config.SID}] Downpay selling plan input not found.`);
			}
		} else {
			// console.log(`[BuyBox ${this.config.SID}] Downpay form not found, skipping hidden input update.`);
		}
		// --- End Update Downpay hidden form fields ---
	}

	async handleFormSubmission(event) {
		// Event type might be 'click' now
		console.log(`[BuyBox ${this.config.SID}] handleFormSubmission entered via ${event.type} event.`); // Updated log

		// No need for event.preventDefault() here if we did it in the click listener

		if (this.state.isLoading) return;

		this.setState({ isLoading: true });

		try {
			console.log(`[BuyBox ${this.config.SID}] handleFormSubmission: buyType =`, this.config.buyType);

			const items = this.prepareItemsForCart();
			if (!items || items.length === 0) {
				throw new Error("No valid items selected."); // More specific error
			}

			// --- Modify Buy Now Logic ---
			// Trigger Buy Now flow if configured, regardless of which form was submitted
			if (this.config.buyType === "buy_now") {
				await this.handleBuyNowFlow(items);
			} else {
				// Standard Add-to-Cart flow
				const addedItems = await this.addValidItemsToCart(items);
				if (addedItems && addedItems.length > 0) {
					showNotification("Item added to cart!", "success");
					document.dispatchEvent(new CustomEvent("cart:items-added", { detail: { items: addedItems } }));
				} else {
					throw new Error("Failed to add items to cart.");
				}
			}
		} catch (error) {
			// Ensure error.message is used if available, otherwise use parsed message
			const errorMessage = error.message || parseErrorMessage(error, "cart-add");
			showNotification(errorMessage, "error");
			console.error(`[BuyBox ${this.config.SID}] Form submission error:`, error);
		} finally {
			this.setState({ isLoading: false });
		}
	}

	async handleOneTimePurchase(event) {
		event.preventDefault();
		if (this.state.isLoading) return;

		const link = event.currentTarget;
		const variantId = link.dataset.variantId;
		const quantity = parseInt(link.dataset.bottleQuantity || "1", 10);

		if (!variantId) {
			showNotification("Could not identify product variant.", "error");
			return;
		}

		this.setState({ isLoading: true });
		link.setAttribute("aria-busy", "true"); // Show loading on link

		try {
			const items = [{ id: variantId, quantity: quantity }];
			const addedItems = await this.addValidItemsToCart(items);

			if (addedItems && addedItems.length > 0) {
				showNotification("Item added to cart!", "success");
				document.dispatchEvent(new CustomEvent("cart:items-added", { detail: { items: addedItems } }));
				// Optionally redirect to cart or open drawer
				// window.location.href = '/cart';
			}
		} catch (error) {
			const errorMessage = parseErrorMessage(error, "cart-add");
			showNotification(errorMessage, "error");
		} finally {
			this.setState({ isLoading: false });
			link.setAttribute("aria-busy", "false");
		}
	}

	prepareItemsForCart() {
		const selectedVariantId = this.state.selectedVariantId;
		if (!selectedVariantId) return [];

		const selectedBox = this.container.querySelector(`.variant-box[data-original-variant="${selectedVariantId}"]`);
		if (!selectedBox) return [];

		const quantity = 1;

		// --- Determine Selling Plan ID ---
		// Prioritize Downpay plan ID if it exists in the state for the selected variant
		const sellingPlanId = this.state.selectedDownpayPlanId || (this.state.isSubscription ? this.state.selectedSellingPlanId : null);
		// --- End Determine Selling Plan ID ---

		const items = [
			{
				id: selectedVariantId,
				quantity: quantity,
				// Use the determined sellingPlanId (could be Downpay, subscription, or null)
				selling_plan: sellingPlanId || ""
			}
		];

		// Add selected gift if applicable
		const giftId = this.getSelectedGiftId(this.state.isSubscription); // Gift logic might need review depending on Downpay interaction
		if (giftId && this.config.giftsAmount > 0) {
			items.push({
				id: giftId,
				quantity: 1,
				selling_plan: "",
				properties: { _gift_source_variant_id: selectedVariantId }
			});
		}

		// Apply discount code if present
		const discountCode = selectedBox.dataset.dc ? atob(selectedBox.dataset.dc) : null;
		if (discountCode) {
			items.forEach(item => {
				item.properties = { ...(item.properties || {}), _discount_code: discountCode };
			});
		}
		// console.log(`[BuyBox ${this.config.SID}] Prepared items:`, items);
		return items;
	}

	getSelectedGiftId(isSubscription) {
		if (this.config.giftsAmount === 0) return null;

		let selectedGiftId = null;
		this.elements.giftSelectors.forEach(selector => {
			const giftType = selector.getAttribute("data-gift-type"); // 'subscription' or 'one-time'
			if ((giftType === "subscription" && isSubscription) || (giftType === "one-time" && !isSubscription)) {
				const checkedRadio = selector.querySelector('input[type="radio"]:checked');
				if (checkedRadio) {
					selectedGiftId = checkedRadio.value;
				}
			}
		});
		return selectedGiftId;
	}

	async handleBuyNowFlow(items) {
		// Temporarily disable cart drawer opening to avoid flicker before redirect
		try {
			const cartDrawerEl = document.querySelector("cart-drawer");
			if (cartDrawerEl && !cartDrawerEl.__openDisabledForBuyNow) {
				cartDrawerEl.__originalOpen = cartDrawerEl.open;
				cartDrawerEl.open = function () {};
				cartDrawerEl.__openDisabledForBuyNow = true;
				// Also hide it just in case
				cartDrawerEl.style.display = "none";
			}
		} catch (err) {
			console.warn("Could not override cart drawer open:", err);
		}

		// 1. Clear the cart
		try {
			await clearCart();
		} catch (error) {
			throw new Error("Could not clear the cart before Buy Now.");
		}

		// 2. Add the single item (and potentially gift)
		const addedItems = await this.addValidItemsToCart(items);

		// 3. Redirect to checkout
		if (addedItems && addedItems.length > 0) {
			window.location.href = "/checkout";
		} else {
			// Handle case where adding failed after clearing
			throw new Error("Failed to add item to cart for Buy Now.");
		}
	}

	async addValidItemsToCart(items) {
		if (!items || items.length === 0) {
			console.warn("addValidItemsToCart called with no items.");
			return [];
		}

		const formData = { items: [] };
		items.forEach(item => {
			const itemToAdd = {
				id: item.id,
				quantity: item.quantity
			};
			if (item.selling_plan) {
				itemToAdd.selling_plan = item.selling_plan;
			}
			if (item.properties) {
				itemToAdd.properties = item.properties;
			}
			formData.items.push(itemToAdd);
		});

		// console.log(`[BuyBox ${this.config.SID}] Adding to cart:`, formData);

		try {
			const res = await fetch("/cart/add.js", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(formData)
			});

			const responseData = await res.json();

			if (!res.ok) {
				console.error("Cart Add Error Response:", responseData);
				throw Object.assign(new Error(responseData.description || responseData.message || "Failed to add items to cart"), { response: responseData });
			}

			CartCache.invalidate(); // Invalidate cache after successful add
			// console.log(`[BuyBox ${this.config.SID}] Cart add response:`, responseData);
			// The response from /cart/add.js might be the line item(s) added or the whole cart
			// Adjust based on actual Shopify API response if needed
			return responseData.items || [responseData]; // Assuming response has an items array or is a single item
		} catch (error) {
			console.error("Error in addValidItemsToCart:", error);
			throw error; // Re-throw the enriched error
		}
	}

	updatePriceDisplay(el) {
		if (!this.elements.priceDisplay || !el) return;

		const isSubscription = el.dataset.purchaseType === "subscribe";
		const priceFormat = this.config.priceFormat;
		const currencySymbol = this.config.currencySymbol;
		const bottleQuantity = parseInt(el.dataset.bottleQuantity || "1", 10);

		let itemPrice, totalPrice, capPrice, savePercents, saveMoney, isDiscounted;

		// Retrieve prices based on purchase type (subscription or one-time)
		if (isSubscription /* && this.state.selectedFrequencyPlanId removed */) {
			// Find the specific selling plan allocation for the selected frequency
			const variantData = this.findVariantInProductData(el.dataset.originalVariant);
			// Find the *first* non-Downpay allocation if multiple exist (or use selectedSellingPlanId if set)
			const allocation = variantData?.selling_plan_allocations?.find(
				alloc => alloc.selling_plan.app_id !== "downpay" && (this.state.selectedSellingPlanId ? alloc.selling_plan.id.toString() === this.state.selectedSellingPlanId.toString() : true)
			);

			if (allocation) {
				totalPrice = allocation.price;
				itemPrice = totalPrice / bottleQuantity;
				capPrice = allocation.compare_at_price || parseFloat(el.dataset.originalItemCap) * 100 * bottleQuantity;
				savePercents = capPrice > totalPrice ? Math.round(((capPrice - totalPrice) / capPrice) * 100) : 0;
				// Recalculate savePercents rounding based on Liquid logic
				const mod5Remainder = savePercents % 5;
				if (mod5Remainder < 3) {
					savePercents = savePercents - mod5Remainder;
				} else {
					savePercents = savePercents + 5 - mod5Remainder;
				}

				isDiscounted = capPrice > totalPrice;
				saveMoney = capPrice - totalPrice;
			} else {
				// Fallback if allocation not found (shouldn't happen often)
				totalPrice = parseFloat(el.dataset.subscriptionPrice) * 100;
				itemPrice = parseFloat(el.dataset.subscriptionItemPrice) * 100;
				capPrice = parseFloat(el.dataset.originalItemCap) * 100;
				savePercents = parseInt(el.dataset.subscriptionDiscount || "0", 10);
				isDiscounted = savePercents > 0;
				saveMoney = capPrice * bottleQuantity - totalPrice;
			}
		} else {
			// One-time purchase prices
			itemPrice = parseFloat(el.dataset.itemPrice) * 100;
			totalPrice = itemPrice * bottleQuantity;
			capPrice = parseFloat(el.dataset.originalItemCap) * 100; // Price per bottle cap
			savePercents = parseInt(el.dataset.buyOnceDiscount || "0", 10);
			isDiscounted = savePercents > 0; // Or check if var.price < var.compare_at_price
			saveMoney = capPrice * bottleQuantity - totalPrice; // Save on total
		}

		const formatMoney = amount => {
			if (isNaN(amount)) return "";
			// Basic formatting, consider using Shopify.formatMoney if available
			return currencySymbol + (amount / 100).toFixed(2).replace(".00", "");
		};

		// --- Update DOM Elements ---
		DOMUtils.updateAttribute(this.elements.priceDisplay, "data-updating", "true");

		// Update main price display
		if (this.elements.price) {
			const priceValue = priceFormat === "total" ? formatMoney(totalPrice) : formatMoney(itemPrice);
			DOMUtils.updateProperty(this.elements.price, "textContent", priceValue);
		}
		if (this.elements.perText) {
			DOMUtils.updateStyle(this.elements.perText, "display", priceFormat === "total" ? "none" : "inline");
		}
		if (this.elements.cap) {
			const capValue = formatMoney(capPrice);
			DOMUtils.updateProperty(this.elements.cap, "textContent", capValue);
			DOMUtils.toggleClass(this.elements.cap, "hidden", !isDiscounted);
		}

		// Update total line display
		if (this.elements.totalLine) {
			DOMUtils.toggleClass(this.elements.totalLine, "hidden", priceFormat === "total" || bottleQuantity === 1);
			if (this.elements.totalLine.classList.contains("hidden") === false) {
				// The textContent includes "Total ", so update carefully
				const totalText = `Total ${formatMoney(totalPrice)}`;
				const capTotalText = formatMoney(capPrice * bottleQuantity);

				// Find existing text nodes to update if possible, otherwise set innerHTML
				let textNode = Array.from(this.elements.totalLine.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent.includes("Total"));
				if (textNode) {
					DOMUtils.updateProperty(textNode, "textContent", totalText + " "); // Add space before cap span
				} else {
					// Fallback if text node structure changes
					this.elements.totalLine.childNodes[0].textContent = totalText + " ";
				}

				if (this.elements.totalPriceCap) {
					DOMUtils.updateProperty(this.elements.totalPriceCap, "textContent", capTotalText);
					DOMUtils.toggleClass(this.elements.totalPriceCap, "hidden", !isDiscounted);
				}
			}
		}

		// Update discount badge (SAVE amount)
		if (this.elements.discountBadge) {
			const shouldShowBadge = priceFormat === "total" && isDiscounted && saveMoney > 0 && bottleQuantity > 1;
			DOMUtils.toggleClass(this.elements.discountBadge, "hidden", !shouldShowBadge);
			DOMUtils.updateAttribute(this.elements.discountBadge, "data-visible", shouldShowBadge ? "true" : "false");
			if (shouldShowBadge) {
				DOMUtils.updateProperty(this.elements.discountBadge, "textContent", `SAVE ${formatMoney(saveMoney)}`);
			}
		}

		// Update future price notice (e.g., first month discount)
		if (this.elements.futurePriceNotice) {
			let noticeText = "";
			const firstMonthDiscount = parseInt(el.dataset.firstMonthDiscount || "0", 10);
			if (isSubscription && firstMonthDiscount > 0) {
				const futureItemPrice = itemPrice; // Price after first month
				noticeText = `After first month, price is ${formatMoney(futureItemPrice)}/bottle`;
			}
			DOMUtils.updateProperty(this.elements.futurePriceNotice, "textContent", noticeText);
		}

		// Clear updating flag after a short delay to allow fade-in animation
		setTimeout(() => {
			DOMUtils.updateAttribute(this.elements.priceDisplay, "data-updating", "false");
		}, 50); // Adjust timing as needed
	}

	performSlideUpdate(slider, variantId) {
		if (!slider || !variantId) return;
		// Placeholder: Implement logic to update associated slider/image
		// console.log(`[BuyBox ${this.config.SID}] Update slide for variant: ${variantId}`);
		// Example: slider.slideToVariant(variantId);
	}

	updateVariantImage(el) {
		if (!el) return;
		const variantId = el.dataset.originalVariant;
		const imageContainer = document.querySelector(`.product-image-container[data-product-id="${this.config.productId}"]`); // Adjust selector
		if (!imageContainer) return;

		const newImageElement = imageContainer.querySelector(`[data-variant-id="${variantId}"]`);
		if (newImageElement) {
			// Hide all images, show the selected one
			imageContainer.querySelectorAll("[data-variant-id]").forEach(img => img.classList.add("hidden"));
			newImageElement.classList.remove("hidden");
			// You might need more complex logic for sliders (e.g., swiper.slideTo)
		}
	}

	updateBuyButtonTracking(el) {
		if (!this.elements.submitButton || !el) return;
		const baseName = this.elements.submitButton.dataset.buttonName?.split("|")[0] || "track:button-submit";
		const sku = el.dataset.sku || "unknown";
		const purchaseType = el.dataset.purchaseType || "unknown";
		const buyboxType = this.config.buyboxType || "unknown";
		const buyboxName = this.config.buyboxName || "unknown";

		const newTrackingName = `${baseName}|buybox-type:${buyboxType}|buybox-name:${buyboxName}|variant-sku:${sku}|purchase-type:${purchaseType}`;
		DOMUtils.updateAttribute(this.elements.submitButton, "name", newTrackingName);
	}

	findVariantInProductData(variantId) {
		if (!this.productData || !this.productData.variants || !variantId) {
			return null;
		}
		// Ensure comparison is done with strings if IDs might be numbers or strings
		const stringVariantId = variantId.toString();
		return this.productData.variants.find(v => v.id.toString() === stringVariantId);
	}

	// Static method to get an instance by SID
	static getInstance(sid) {
		return BuyBoxNewInstances.get(sid);
	}

	// Static method to get all instances
	static getAllInstances() {
		return BuyBoxNewInstances;
	}

	moveCtaTextIfNeeded() {
		// Check if this logic is still needed or handled by Liquid now
		if (window.innerWidth < 768) {
			const ctaSection = this.container.closest(`#cta-section-${this.config.SID}`);
			const ctaText = ctaSection?.querySelector(".cta-text");
			const productActions = this.container; // .product-actions element

			if (ctaText && productActions && !productActions.contains(ctaText)) {
				// Move ctaText to the beginning of productActions
				productActions.insertAdjacentElement("afterbegin", ctaText);
			}
		}
	}
}

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
	const buyBoxContainers = document.querySelectorAll("[data-buy-box-new-root='true']");
	buyBoxContainers.forEach(container => {
		const config = {
			SID: container.dataset.sid,
			buyType: container.dataset.buyType,
			priceFormat: container.dataset.priceFormat,
			isSlideVariant: container.dataset.isSlideVariant === "true",
			isOneTimeGift: container.dataset.isOneTimeGift === "true",
			isOneTimePurchaseLink: container.dataset.isOneTimePurchaseLink === "true",
			currencySymbol: container.dataset.currencySymbol,
			productId: container.dataset.productId,
			defaultVariantIndex: parseInt(container.dataset.defaultVariantIndex || "0", 10),
			giftsAmount: parseInt(container.dataset.giftsAmount || "0", 10),
			sellingPlanUI: container.querySelector("[data-frequency-container]")?.dataset.uiType || "tabs", // Get UI type from frequency container
			buyboxType: container.closest("[data-buybox-type]")?.dataset.buyboxType || "unknown", // Get from parent section if available
			buyboxName: container.closest("[data-buybox-name]")?.dataset.buyboxName || "unknown" // Get from parent section if available
		};

		// Only initialize if not already done
		if (!BuyBoxNewInstances.has(config.SID)) {
			new BuyBoxNew(container, config);
		} else {
			// console.log(`[BuyBox ${config.SID}] Instance already exists. Skipping initialization.`);
		}
	});
});

// Optional: Add resize listener for moveCtaTextIfNeeded if needed
// window.addEventListener('resize', () => {
//     BuyBoxNew.getAllInstances().forEach(instance => instance.moveCtaTextIfNeeded());
// });

// Global delegated click listener to capture variant-submit clicks even if button replaced
if (!window.__buyBoxGlobalClickListenerAdded) {
	window.__buyBoxGlobalClickListenerAdded = true;
	document.addEventListener(
		"click",
		event => {
			const btn = event.target.closest("button.variant-submit");
			if (!btn) return;
			const root = btn.closest('[data-buy-box-new-root="true"]');
			if (!root) return;
			const sid = root.dataset.sid;
			const instance = BuyBoxNew.getInstance(sid);
			if (!instance) return;
			console.log(`[BuyBox ${sid}] Global delegate CLICK captured on variant-submit.`);
			event.preventDefault();
			instance.handleFormSubmission(event);
		},
		true
	);
}
