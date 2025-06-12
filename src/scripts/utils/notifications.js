/**
 * Modular Notification System
 * Extracted from quiz component for reusability across different components
 */

const CSS_CLASSES = {
	CONTAINER: "notification-container",
	NOTIFICATION: "notification",
	SUCCESS: "notification-success",
	ERROR: "notification-error",
	INFO: "notification-info",
	WARNING: "notification-warning",
	HEADER: "notification-header",
	CONTENT: "notification-content",
	CONTROLS: "notification-controls",
	ICON: "notification-icon",
	TITLE: "notification-title",
	TOGGLE: "notification-toggle",
	DETAILS: "notification-details",
	DETAILS_CONTENT: "notification-details-content",
	CLOSE: "notification-close",
	SHIMMER: "notification-shimmer",
	ACTIVE: "active",
	EXPANDED: "expanded",
	ANIMATE_IN: "animate-in",
	ANIMATE_OUT: "animate-out",
	SLIDE_UP: "slide-up",
	FILTER_HIDDEN: "filter-hidden",
	FILTER_VISIBLE: "filter-visible",
	PRIORITY_PREFIX: "notification-priority-",
	COPY_BUTTON: "notification-copy-button",
	FILTER_BUTTON: "notification-filter-button",
	COPY_MENU: "notification-copy-options-menu",
	FILTER_MENU: "notification-filter-options-menu",
	MENU_ITEM: "notification-copy-options-menu-item",
	MENU_DIVIDER: "notification-copy-options-menu-divider"
};

const DATA_ATTRIBUTES = {
	TYPE: "type",
	PRIORITY: "priority",
	TIMESTAMP: "timestamp",
	FORMAT: "format",
	FILTER: "filter"
};

const EMOJIS = {
	SUCCESS: "✓",
	ERROR: "✗",
	WARNING: "⚠",
	INFO: "ℹ",
	FILTER_ALL: "🔍",
	FILTER_ERROR: "❌",
	FILTER_SUCCESS: "✅",
	FILTER_INFO: "ℹ️",
	COPY_SUCCESS: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"></polyline></svg>`,
	COPY_ERROR: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
	COPY_DEFAULT: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2 2v1"></path></svg>`
};

const DEFAULT_PRIORITY_CONFIGS = {
	critical: { color: "#dc2626", shouldPulse: true },
	error: { color: "#dc2626", shouldPulse: false },
	warning: { color: "#f59e0b", shouldPulse: false },
	success: { color: "#059669", shouldPulse: false },
	info: { color: "#2563eb", shouldPulse: false }
};

export class NotificationManager {
	constructor(options = {}) {
		this.options = {
			containerSelector: `.${CSS_CLASSES.CONTAINER}`,
			position: "top-right",
			autoCollapse: true,
			maxNotifications: 50,
			defaultDuration: 5000,
			enableFiltering: true,
			enableCopy: true,
			...options
		};

		this.cssClasses = {
			...CSS_CLASSES,
			...(options.customClasses || {})
		};

		this.notifications = [];
		this.currentFilter = "all";
		this.autoCollapseEnabled = Boolean(this.options.autoCollapse);

		this.timeouts = new Set();
		this.eventListeners = new WeakMap();
		this.isDestroyed = false;

		this.notificationQueue = [];
		this.isProcessingQueue = false;
		this.staggerDelay = 300;
		this.batchingDelay = 50;

		this.processingQueueTimeoutId = null;
		this.staggerTimeoutId = null;

		this._init();
	}

	_init() {
		if (this.isDestroyed) return;
		this._createContainer();
		if (this.options.enableFiltering || this.options.enableCopy) {
			this._addControlButtons();
		}
	}

	_createContainer() {
		if (document.readyState === "loading") {
			const handler = () => {
				this._createContainer();
				document.removeEventListener("DOMContentLoaded", handler);
			};
			document.addEventListener("DOMContentLoaded", handler);
			return;
		}

		let container = document.querySelector(this.options.containerSelector);
		if (!container) {
			if (!document.body) {
				console.warn("NotificationManager: document.body not available to append container.");
				return;
			}
			container = document.createElement("div");
			container.className = this.cssClasses.CONTAINER;
			container.setAttribute("role", "status");
			container.setAttribute("aria-live", "polite");
			document.body.appendChild(container);
		}
		this.container = container;
	}

	show(text, type = "info", priority = null, duration = null) {
		if (this.isDestroyed) {
			console.warn("NotificationManager: Cannot show notification, manager is destroyed.");
			return null;
		}
		if (typeof text !== "string" || text.trim() === "") {
			console.error("NotificationManager: Notification text must be a non-empty string.");
			return null;
		}

		const notification = this._createNotificationElement(text, type, priority, duration);
		if (notification) {
			this._queueNotification(notification);
		}
		return notification;
	}

	_createNotificationElement(text, type = "info", priority = null, duration = null) {
		const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		const actualPriority = priority || this._determinePriority(type, text);
		const notificationDuration = duration !== null ? duration : this.options.defaultDuration;

		const notification = document.createElement("div");
		notification.className = `${this.cssClasses.NOTIFICATION} ${this.cssClasses[type] || this.cssClasses.INFO}`;
		notification.id = id;
		notification.dataset[DATA_ATTRIBUTES.TYPE] = type;
		notification.dataset[DATA_ATTRIBUTES.PRIORITY] = actualPriority;
		notification.dataset[DATA_ATTRIBUTES.TIMESTAMP] = new Date().toISOString();

		this._applyPriorityStyles(notification, actualPriority, this._getPriorityConfig(actualPriority));
		this._buildNotificationContent(notification, text, type);

		if (notificationDuration > 0) {
			const timeoutId = setTimeout(() => {
				this.removeNotification(notification);
				this.timeouts.delete(timeoutId);
			}, notificationDuration);
			this.timeouts.add(timeoutId);
		}

		return notification;
	}

	_buildNotificationContent(notification, text, type) {
		let title, detailsText;
		const parts = text.includes("<br>") ? text.split("<br>") : text.split("\n");
		title = parts[0].trim();
		detailsText = parts
			.slice(1)
			.join(text.includes("<br>") ? "<br>" : "\n")
			.trim();

		title = this._cleanNotificationTitle(title);
		const safeTitle = this._sanitizeHtml(title);
		const safeDetailsText = this._sanitizeHtml(detailsText);

		notification.innerHTML = `
			<div class="${this.cssClasses.HEADER}">
				<div class="${this.cssClasses.CONTENT}">
					<div class="${this.cssClasses.ICON}">${this._getTypeIcon(type)}</div>
					<div class="${this.cssClasses.TITLE}">${safeTitle}</div>
				</div>
				<div class="${this.cssClasses.CONTROLS}">
					${
						detailsText
							? `<div class="${this.cssClasses.TOGGLE}">
						<svg width="12" height="8" viewBox="0 0 12 8" fill="none">
							<path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					</div>`
							: ""
					}
					<div class="${this.cssClasses.CLOSE}">×</div>
				</div>
			</div>
			${
				detailsText
					? `<div class="${this.cssClasses.DETAILS}">
				<div class="${this.cssClasses.DETAILS_CONTENT}">${safeDetailsText}</div>
			</div>`
					: ""
			}
			<div class="${this.cssClasses.SHIMMER}"></div>
		`;

		this._attachNotificationListeners(notification);
	}

	_attachNotificationListeners(notification) {
		const header = notification.querySelector(`.${this.cssClasses.HEADER}`);
		const closeBtn = notification.querySelector(`.${this.cssClasses.CLOSE}`);
		const toggle = notification.querySelector(`.${this.cssClasses.TOGGLE}`);

		if (!header || !closeBtn) {
			console.warn("NotificationManager: Missing header or close button for notification:", notification.id);
			return;
		}

		const closeClickHandler = e => {
			e.stopPropagation();
			this.removeNotification(notification);
		};
		this._addAndTrackListener(closeBtn, "click", closeClickHandler, notification);

		if (toggle) {
			const headerClickHandler = () => this.toggleNotification(notification);
			this._addAndTrackListener(header, "click", headerClickHandler, notification);
		}
	}

	_addAndTrackListener(element, event, handler, keyElement = element) {
		element.addEventListener(event, handler);
		let listeners = this.eventListeners.get(keyElement) || [];
		listeners.push({ element, event, handler });
		this.eventListeners.set(keyElement, listeners);
	}

	_cleanNotificationTitle(title) {
		if (typeof title !== "string") return "";
		// More robust regex for various emojis and "TEST MODE"
		return title
			.replace(/[\u{1F000}-\u{1F6FF}\u{1F900}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F300}-\u{1F5FF}\u{FE0F}]/gu, "")
			.replace(/TEST MODE\s*[-:]?\s*/gi, "")
			.trim();
	}

	_sanitizeHtml(text) {
		if (typeof text !== "string" || text.trim() === "") return "";

		// Define placeholders for allowed tags
		const BR_PLACEHOLDER = "__BR_NPM__";
		const STRONG_START_PLACEHOLDER = "__STRONG_START_NPM__";
		const STRONG_END_PLACEHOLDER = "__STRONG_END_NPM__";
		const EM_START_PLACEHOLDER = "__EM_START_NPM__";
		const EM_END_PLACEHOLDER = "__EM_END_NPM__";

		let processedText = text;

		// 1. Replace allowed tags with placeholders
		processedText = processedText.replace(/<br\s*\/?>/gi, BR_PLACEHOLDER);
		processedText = processedText.replace(/<strong>/gi, STRONG_START_PLACEHOLDER);
		processedText = processedText.replace(/<\/strong>/gi, STRONG_END_PLACEHOLDER);
		processedText = processedText.replace(/<em>/gi, EM_START_PLACEHOLDER);
		processedText = processedText.replace(/<\/em>/gi, EM_END_PLACEHOLDER);

		// 2. Use a DOM element to safely escape all HTML entities (including &lt;br&gt;)
		const div = document.createElement("div");
		div.textContent = processedText; // This escapes all HTML characters
		let escaped = div.innerHTML;

		// 3. Restore allowed tags from their placeholders
		escaped = escaped.replace(new RegExp(BR_PLACEHOLDER, "g"), "<br>");
		escaped = escaped.replace(new RegExp(STRONG_START_PLACEHOLDER, "g"), "<strong>");
		escaped = escaped.replace(new RegExp(STRONG_END_PLACEHOLDER, "g"), "</strong>");
		escaped = escaped.replace(new RegExp(EM_START_PLACEHOLDER, "g"), "<em>");
		escaped = escaped.replace(new RegExp(EM_END_PLACEHOLDER, "g"), "</em>");

		return escaped;
	}

	escapeHtml(text) {
		// Legacy method for backward compatibility
		return this._sanitizeHtml(text);
	}

	toggleNotification(notification) {
		if (this.isDestroyed) return;
		const details = notification.querySelector(`.${this.cssClasses.DETAILS}`);
		if (!details) return;

		if (details.classList.contains(this.cssClasses.EXPANDED)) {
			this.collapseNotification(notification);
		} else {
			this.expandNotification(notification);
		}
	}

	expandNotification(notification) {
		if (this.isDestroyed) return;
		const details = notification.querySelector(`.${this.cssClasses.DETAILS}`);
		const toggle = notification.querySelector(`.${this.cssClasses.TOGGLE}`);

		if (details) {
			details.classList.add(this.cssClasses.EXPANDED);
			requestAnimationFrame(() => {
				if (this.isDestroyed) return;
				details.style.maxHeight = `${details.scrollHeight}px`;
			});
		}
		if (toggle) {
			toggle.classList.add(this.cssClasses.EXPANDED);
		}
	}

	collapseNotification(notification) {
		if (this.isDestroyed) return;
		const details = notification.querySelector(`.${this.cssClasses.DETAILS}`);
		const toggle = notification.querySelector(`.${this.cssClasses.TOGGLE}`);

		if (details) {
			// Set explicit height before transition to 0 for smooth collapse
			details.style.maxHeight = `${details.scrollHeight}px`;
			requestAnimationFrame(() => {
				if (this.isDestroyed) return;
				details.classList.remove(this.cssClasses.EXPANDED);
				details.style.maxHeight = "0";
			});
		}
		if (toggle) {
			toggle.classList.remove(this.cssClasses.EXPANDED);
		}
	}

	_queueNotification(notification) {
		if (this.isDestroyed) return;
		this.notificationQueue.push(notification);

		if (!this.processingQueueTimeoutId) {
			this.processingQueueTimeoutId = setTimeout(() => {
				this._processNotificationQueue();
				this.processingQueueTimeoutId = null;
			}, this.batchingDelay);
			this.timeouts.add(this.processingQueueTimeoutId);
		}
	}

	_processNotificationQueue() {
		if (this.isDestroyed || this.isProcessingQueue) return;
		this.isProcessingQueue = true;
		this._processNextInQueue();
	}

	_processNextInQueue() {
		if (this.isDestroyed) {
			this.isProcessingQueue = false;
			return;
		}

		if (this.notificationQueue.length === 0) {
			this.isProcessingQueue = false;
			if (this.staggerTimeoutId) {
				clearTimeout(this.staggerTimeoutId);
				this.timeouts.delete(this.staggerTimeoutId); // Ensure timeout is cleared from Set
				this.staggerTimeoutId = null;
			}
			return;
		}

		const notification = this.notificationQueue.shift();
		this._addNotificationImmediate(notification);

		this.staggerTimeoutId = setTimeout(() => {
			this._processNextInQueue();
		}, this.staggerDelay);
		this.timeouts.add(this.staggerTimeoutId);
	}

	_addNotificationImmediate(notification) {
		if (this.isDestroyed || !this.container) return;

		this.notifications.push(notification);
		this.container.appendChild(notification);

		notification.style.opacity = "0";
		notification.style.transform = "translateX(120%) scale(0.85)";
		notification.offsetHeight;

		requestAnimationFrame(() => {
			if (this.isDestroyed) return;
			const timeoutId = setTimeout(() => {
				if (!this.isDestroyed && notification.parentNode) {
					notification.style.opacity = "";
					notification.style.transform = "";
					notification.classList.add(this.cssClasses.ANIMATE_IN);
					this._addInteractiveEffects(notification);
				}
				this.timeouts.delete(timeoutId);
			}, 50);
			this.timeouts.add(timeoutId);
		});

		if (this.notifications.length > this.options.maxNotifications) {
			const oldestNotification = this.notifications.shift();
			this.removeNotification(oldestNotification, false);
		}
		this._applyNotificationFilter(this.currentFilter);
	}

	_addInteractiveEffects(newNotification) {
		if (this.isDestroyed) return;
		const existingNotifications = this.notifications.filter(n => n !== newNotification && n.parentNode);
		existingNotifications.forEach((notification, index) => {
			if (this.isDestroyed) return;
			const delay = index * 30;
			const timeoutId = setTimeout(() => {
				if (!this.isDestroyed && notification.parentNode) {
					notification.style.transform = "translateX(-2px) scale(1.01)";
					notification.style.transition = "transform 0.2s ease-out";

					const resetTimeoutId = setTimeout(() => {
						if (!this.isDestroyed && notification.parentNode) {
							notification.style.transform = "";
							notification.style.transition = "";
						}
						this.timeouts.delete(resetTimeoutId);
					}, 200);
					this.timeouts.add(resetTimeoutId);
				}
				this.timeouts.delete(timeoutId);
			}, delay);
			this.timeouts.add(timeoutId);
		});
	}

	removeNotification(notification, updateArray = true) {
		if (!notification || !notification.parentNode || this.isDestroyed) return;

		this._cleanupEventListeners(notification);

		notification.classList.remove(this.cssClasses.ANIMATE_IN, this.cssClasses.SLIDE_UP);
		notification.offsetHeight;

		notification.classList.add(this.cssClasses.ANIMATE_OUT);

		const effectTimeoutId = setTimeout(() => {
			this._addRemovalEffects(notification);
			this.timeouts.delete(effectTimeoutId);
		}, 150);
		this.timeouts.add(effectTimeoutId);

		const timeoutId = setTimeout(() => {
			if (notification.parentNode && !this.isDestroyed) {
				// Check parentNode again before removing
				notification.parentNode.removeChild(notification);
			}
			if (updateArray && !this.isDestroyed) {
				const index = this.notifications.indexOf(notification);
				if (index > -1) {
					this.notifications.splice(index, 1);
				}
			}
			this.timeouts.delete(timeoutId);
		}, 600);
		this.timeouts.add(timeoutId);
	}

	_cleanupEventListeners(keyElement) {
		const listeners = this.eventListeners.get(keyElement);
		if (listeners) {
			listeners.forEach(({ element, event, handler }) => {
				if (element && element.removeEventListener) {
					element.removeEventListener(event, handler);
				}
			});
			this.eventListeners.delete(keyElement);
		}
	}

	_addRemovalEffects(removingNotification) {
		if (this.isDestroyed) return;
		const remainingNotifications = this.notifications.filter(n => n !== removingNotification && n.parentNode);
		remainingNotifications.forEach((notification, index) => {
			if (this.isDestroyed) return;
			const delay = index * 50;
			const timeoutId = setTimeout(() => {
				if (!this.isDestroyed && notification.parentNode) {
					notification.classList.remove(this.cssClasses.SLIDE_UP);
					notification.offsetHeight;

					notification.classList.add(this.cssClasses.SLIDE_UP);

					const cleanupTimeoutId = setTimeout(() => {
						if (!this.isDestroyed && notification.parentNode) {
							notification.classList.remove(this.cssClasses.SLIDE_UP);
						}
						this.timeouts.delete(cleanupTimeoutId);
					}, 500);
					this.timeouts.add(cleanupTimeoutId);
				}
				this.timeouts.delete(timeoutId);
			}, delay);
			this.timeouts.add(timeoutId);
		});
	}

	_addControlButtons() {
		if (this.isDestroyed) return;
		this._removeExistingButtons();

		if (this.options.enableCopy) {
			this._addCopyButton();
		}
		if (this.options.enableFiltering) {
			this._addFilterButton();
		}
	}

	_removeExistingButtons() {
		const existingButtons = document.querySelectorAll(`.${this.cssClasses.COPY_BUTTON}, .${this.cssClasses.FILTER_BUTTON}`);
		existingButtons.forEach(btn => {
			this._cleanupEventListeners(btn);
			btn.remove();
		});
	}

	_addCopyButton() {
		if (!document.body) return;
		const copyButton = document.createElement("div");
		copyButton.className = this.cssClasses.COPY_BUTTON;
		copyButton.innerHTML = EMOJIS.COPY_DEFAULT;
		copyButton.title = "Copy notifications";

		const clickHandler = () => this._showCopyOptionsMenu(copyButton);
		this._addAndTrackListener(copyButton, "click", clickHandler, copyButton);
		document.body.appendChild(copyButton);
	}

	_addFilterButton() {
		if (!document.body) return;
		const filterButton = document.createElement("div");
		filterButton.className = this.cssClasses.FILTER_BUTTON;
		filterButton.innerHTML = EMOJIS.FILTER_ALL;
		filterButton.title = "Filter notifications";

		const clickHandler = () => this._showFilterOptionsMenu(filterButton);
		this._addAndTrackListener(filterButton, "click", clickHandler, filterButton);
		document.body.appendChild(filterButton);
	}

	_showCopyOptionsMenu(copyButton) {
		if (this.isDestroyed) return;
		this._removeExistingMenus();

		const menu = document.createElement("div");
		menu.className = this.cssClasses.COPY_MENU;
		menu.innerHTML = `
			<div class="${this.cssClasses.MENU_ITEM}" data-${DATA_ATTRIBUTES.FORMAT}="text" data-${DATA_ATTRIBUTES.FILTER}="all">All as Text</div>
			<div class="${this.cssClasses.MENU_ITEM}" data-${DATA_ATTRIBUTES.FORMAT}="json" data-${DATA_ATTRIBUTES.FILTER}="all">All as JSON</div>
			<div class="${this.cssClasses.MENU_ITEM}" data-${DATA_ATTRIBUTES.FORMAT}="csv" data-${DATA_ATTRIBUTES.FILTER}="all">All as CSV</div>
			<div class="${this.cssClasses.MENU_DIVIDER}"></div>
			<div class="${this.cssClasses.MENU_ITEM}" data-${DATA_ATTRIBUTES.FORMAT}="text" data-${DATA_ATTRIBUTES.FILTER}="error">Errors Only</div>
			<div class="${this.cssClasses.MENU_ITEM}" data-${DATA_ATTRIBUTES.FORMAT}="text" data-${DATA_ATTRIBUTES.FILTER}="success">Success Only</div>
			<div class="${this.cssClasses.MENU_ITEM}" data-${DATA_ATTRIBUTES.FORMAT}="text" data-${DATA_ATTRIBUTES.FILTER}="info">Info Only</div>
		`;

		if (!document.body) return;
		document.body.appendChild(menu);

		const menuClickHandler = e => {
			const item = e.target.closest(`.${this.cssClasses.MENU_ITEM}`);
			if (item) {
				const format = item.dataset[DATA_ATTRIBUTES.FORMAT];
				const filter = item.dataset[DATA_ATTRIBUTES.FILTER];
				this._exportNotifications(format, filter, copyButton);
				menu.remove();
				this._cleanupEventListeners(document);
			}
		};
		this._addAndTrackListener(menu, "click", menuClickHandler, menu);

		const closeMenuHandler = e => {
			if (!menu.contains(e.target) && !copyButton.contains(e.target)) {
				menu.remove();
				this._cleanupEventListeners(document);
			}
		};
		const timeoutId = setTimeout(() => {
			this._addAndTrackListener(document, "click", closeMenuHandler, document);
			this.timeouts.delete(timeoutId);
		}, 100);
		this.timeouts.add(timeoutId);
	}

	_showFilterOptionsMenu(filterButton) {
		if (this.isDestroyed) return;
		this._removeExistingMenus();

		const menu = document.createElement("div");
		menu.className = this.cssClasses.FILTER_MENU;
		menu.innerHTML = `
			<div class="${this.cssClasses.MENU_ITEM} ${this.currentFilter === "all" ? this.cssClasses.ACTIVE : ""}" data-${DATA_ATTRIBUTES.FILTER}="all">All Types</div>
			<div class="${this.cssClasses.MENU_ITEM} ${this.currentFilter === "error" ? this.cssClasses.ACTIVE : ""}" data-${DATA_ATTRIBUTES.FILTER}="error">Errors</div>
			<div class="${this.cssClasses.MENU_ITEM} ${this.currentFilter === "success" ? this.cssClasses.ACTIVE : ""}" data-${DATA_ATTRIBUTES.FILTER}="success">Success</div>
			<div class="${this.cssClasses.MENU_ITEM} ${this.currentFilter === "info" ? this.cssClasses.ACTIVE : ""}" data-${DATA_ATTRIBUTES.FILTER}="info">Info</div>
		`;

		if (!document.body) return;
		document.body.appendChild(menu);

		const menuClickHandler = e => {
			const item = e.target.closest(`.${this.cssClasses.MENU_ITEM}`);
			if (item) {
				const filter = item.dataset[DATA_ATTRIBUTES.FILTER];
				this.currentFilter = filter;
				this._applyNotificationFilter(filter);
				this._updateFilterButtonAppearance(filterButton, this._getFilterEmoji(filter));
				menu.remove();
				this._cleanupEventListeners(document);
			}
		};
		this._addAndTrackListener(menu, "click", menuClickHandler, menu);

		const closeMenuHandler = e => {
			if (!menu.contains(e.target) && !filterButton.contains(e.target)) {
				menu.remove();
				this._cleanupEventListeners(document);
			}
		};
		const timeoutId = setTimeout(() => {
			this._addAndTrackListener(document, "click", closeMenuHandler, document);
			this.timeouts.delete(timeoutId);
		}, 100);
		this.timeouts.add(timeoutId);
	}

	_removeExistingMenus() {
		const existingMenus = document.querySelectorAll(`.${this.cssClasses.COPY_MENU}, .${this.cssClasses.FILTER_MENU}`);
		existingMenus.forEach(menu => {
			this._cleanupEventListeners(menu);
			menu.remove();
		});
	}

	_applyNotificationFilter(filter) {
		if (this.isDestroyed) return;
		this.notifications.forEach(notification => {
			const type = notification.dataset[DATA_ATTRIBUTES.TYPE];
			const shouldShow = filter === "all" || type === filter;
			notification.classList.toggle(this.cssClasses.FILTER_HIDDEN, !shouldShow);
			notification.classList.toggle(this.cssClasses.FILTER_VISIBLE, shouldShow);
		});
	}

	_updateFilterButtonAppearance(filterButton, emoji) {
		if (filterButton && emoji) {
			filterButton.innerHTML = emoji;
		}
	}

	_getFilterEmoji(filter) {
		switch (filter) {
			case "all":
				return EMOJIS.FILTER_ALL;
			case "error":
				return EMOJIS.FILTER_ERROR;
			case "success":
				return EMOJIS.FILTER_SUCCESS;
			case "info":
				return EMOJIS.FILTER_INFO;
			default:
				return EMOJIS.FILTER_ALL;
		}
	}

	_exportNotifications(format, filter, copyButton) {
		if (this.isDestroyed) return;
		const filteredNotifications = this._getFilteredNotifications(filter);
		let exportedData;
		switch (format) {
			case "json":
				exportedData = this._formatAsJSON(filteredNotifications, filter);
				break;
			case "csv":
				exportedData = this._formatAsCSV(filteredNotifications, filter);
				break;
			default:
				exportedData = this._formatAsText(filteredNotifications, filter);
				break;
		}
		this._copyToClipboard(exportedData, copyButton, { format, filter });
	}

	_getFilteredNotifications(filter) {
		return this.notifications.filter(notification => {
			if (!notification.dataset) return false;
			const type = notification.dataset[DATA_ATTRIBUTES.TYPE];
			return filter === "all" || type === filter;
		});
	}

	_formatAsText(notifications, filter) {
		const header = `=== NOTIFICATIONS EXPORT (${filter.toUpperCase()}) ===\n` + `Exported: ${new Date().toLocaleString()}\n` + `Total: ${notifications.length} notifications\n\n`;
		const content = notifications
			.map((notification, index) => {
				const type = (notification.dataset[DATA_ATTRIBUTES.TYPE] || "unknown").toUpperCase();
				const timestamp = notification.dataset[DATA_ATTRIBUTES.TIMESTAMP] ? new Date(notification.dataset[DATA_ATTRIBUTES.TIMESTAMP]).toLocaleString() : "Unknown";
				const text = this._extractNotificationText(notification);
				return `[${index + 1}] ${type} - ${timestamp}\n${text}\n`;
			})
			.join("\n");
		return header + content;
	}

	_formatAsJSON(notifications, filter) {
		const data = {
			export_info: { filter: filter, exported_at: new Date().toISOString(), total_count: notifications.length },
			notifications: notifications.map((notification, index) => ({
				index: index + 1,
				type: notification.dataset[DATA_ATTRIBUTES.TYPE] || "unknown",
				priority: notification.dataset[DATA_ATTRIBUTES.PRIORITY] || "unknown",
				timestamp: notification.dataset[DATA_ATTRIBUTES.TIMESTAMP] || new Date().toISOString(),
				text: this._extractNotificationText(notification)
			}))
		};
		return JSON.stringify(data, null, 2);
	}

	_formatAsCSV(notifications, filter) {
		const header = "Index,Type,Priority,Timestamp,Text\n";
		const rows = notifications
			.map((notification, index) => {
				const type = notification.dataset[DATA_ATTRIBUTES.TYPE] || "unknown";
				const priority = notification.dataset[DATA_ATTRIBUTES.PRIORITY] || "";
				const timestamp = notification.dataset[DATA_ATTRIBUTES.TIMESTAMP] || new Date().toISOString();
				const text = `"${this._extractNotificationText(notification).replace(/"/g, '""')}"`;
				return `${index + 1},"${type}","${priority}","${timestamp}",${text}`;
			})
			.join("\n");
		return header + rows;
	}

	_extractNotificationText(notification) {
		if (!notification) return "";
		const titleElement = notification.querySelector(`.${this.cssClasses.TITLE}`);
		const detailsElement = notification.querySelector(`.${this.cssClasses.DETAILS_CONTENT}`);
		let text = titleElement ? titleElement.textContent.trim() : "";
		if (detailsElement && detailsElement.textContent.trim()) {
			text += `\n${detailsElement.textContent.trim()}`;
		}
		return text;
	}

	async _copyToClipboard(text, button, formatInfo) {
		if (this.isDestroyed) return;
		try {
			if (navigator.clipboard && window.isSecureContext) {
				await navigator.clipboard.writeText(text);
				this._showCopyFeedback(button, true, formatInfo);
			} else {
				this._fallbackCopyToClipboard(text, button, formatInfo);
			}
		} catch (error) {
			console.error("NotificationManager: Failed to copy to clipboard:", error);
			this._fallbackCopyToClipboard(text, button, formatInfo);
		}
	}

	_fallbackCopyToClipboard(text, button, formatInfo) {
		if (this.isDestroyed || !document.body) return;
		const textArea = document.createElement("textarea");
		textArea.value = text;
		textArea.style.position = "fixed";
		textArea.style.left = "-999999px";
		textArea.style.top = "-999999px";
		document.body.appendChild(textArea);
		textArea.focus();
		textArea.select();

		try {
			const successful = document.execCommand("copy");
			this._showCopyFeedback(button, successful, formatInfo);
		} catch (error) {
			console.error("NotificationManager: Fallback copy failed:", error);
			this._showCopyFeedback(button, false, formatInfo);
		} finally {
			if (document.body.contains(textArea)) {
				document.body.removeChild(textArea);
			}
		}
	}

	_showCopyFeedback(button, success, formatInfo = {}) {
		if (this.isDestroyed || !button) return;
		const originalClass = button.className;
		const originalContent = EMOJIS.COPY_DEFAULT;

		button.classList.add(success ? "success" : "error");
		button.innerHTML = success ? EMOJIS.COPY_SUCCESS : EMOJIS.COPY_ERROR;

		const timeoutId = setTimeout(() => {
			if (!this.isDestroyed && button) {
				button.className = originalClass;
				button.innerHTML = originalContent;
			}
			this.timeouts.delete(timeoutId);
		}, 2000);
		this.timeouts.add(timeoutId);
	}

	_determinePriority(type, text) {
		if (typeof text !== "string" || text.trim() === "") return "info";
		const lowerText = text.toLowerCase();
		if (type === "error") {
			if (lowerText.includes("critical") || lowerText.includes("fatal") || lowerText.includes("failure")) {
				return "critical";
			}
			return "error";
		}
		if (type === "warning" || lowerText.includes("warning") || lowerText.includes("warn")) {
			return "warning";
		}
		if (type === "success") {
			return "success";
		}
		return "info";
	}

	_getPriorityConfig(priority) {
		return DEFAULT_PRIORITY_CONFIGS[priority] || DEFAULT_PRIORITY_CONFIGS.info;
	}

	_applyPriorityStyles(notification, priority, priorityConfig) {
		if (!notification || this.isDestroyed) return;
		notification.classList.add(`${this.cssClasses.PRIORITY_PREFIX}${priority}`);
		notification.style.animation = priorityConfig.shouldPulse ? "pulse-critical 2s infinite" : "";
	}

	_getTypeIcon(type) {
		switch (type) {
			case "success":
				return EMOJIS.SUCCESS;
			case "error":
				return EMOJIS.ERROR;
			case "warning":
				return EMOJIS.WARNING;
			case "info":
				return EMOJIS.INFO;
			default:
				return EMOJIS.INFO;
		}
	}

	clear() {
		if (this.isDestroyed) return;
		// Create a copy to iterate, as removeNotification modifies the original array.
		[...this.notifications].forEach(notification => this.removeNotification(notification, false));
		this.notifications = [];
	}

	expandAll() {
		if (this.isDestroyed) return;
		this.notifications.forEach(notification => {
			if (notification.querySelector(`.${this.cssClasses.DETAILS}`)) {
				this.expandNotification(notification);
			}
		});
	}

	collapseAll() {
		if (this.isDestroyed) return;
		this.notifications.forEach(notification => {
			if (notification.querySelector(`.${this.cssClasses.DETAILS}`)) {
				this.collapseNotification(notification);
			}
		});
	}

	setAutoCollapse(enabled) {
		this.autoCollapseEnabled = Boolean(enabled);
	}

	getNotifications() {
		return this.isDestroyed ? [] : [...this.notifications];
	}

	getNotificationsByType(type) {
		return this.isDestroyed ? [] : this.notifications.filter(n => n.dataset && n.dataset[DATA_ATTRIBUTES.TYPE] === type);
	}

	destroy() {
		if (this.isDestroyed) return;
		this.isDestroyed = true;

		this.timeouts.forEach(timeoutId => clearTimeout(timeoutId));
		this.timeouts.clear();

		// Ensure specific queue timeouts are cleared
		if (this.processingQueueTimeoutId) {
			clearTimeout(this.processingQueueTimeoutId);
			this.timeouts.delete(this.processingQueueTimeoutId);
			this.processingQueueTimeoutId = null;
		}
		if (this.staggerTimeoutId) {
			clearTimeout(this.staggerTimeoutId);
			this.timeouts.delete(this.staggerTimeoutId);
			this.staggerTimeoutId = null;
		}

		this.eventListeners.forEach(listeners => {
			listeners.forEach(({ element: el, event, handler }) => {
				if (el && el.removeEventListener) {
					el.removeEventListener(event, handler);
				}
			});
		});
		this.eventListeners = new WeakMap();

		this.clear();

		this._removeExistingButtons();
		this._removeExistingMenus();

		if (this.container && this.container.parentNode) {
			this.container.parentNode.removeChild(this.container);
		}

		this.container = null;
		this.notifications = [];
		this.notificationQueue = [];
		this.isProcessingQueue = false;
	}
}

export const NotificationUtils = {
	createManager(options) {
		return new NotificationManager(options);
	},

	showQuickNotification(text, type = "info", duration = 3000) {
		if (typeof text !== "string" || text.trim() === "") {
			console.error("NotificationUtils: Quick notification text must be a string.");
			return null;
		}

		const tempManager = new NotificationManager({
			containerSelector: ".quick-notification-container",
			position: "bottom-center",
			autoCollapse: true,
			maxNotifications: 1,
			defaultDuration: duration,
			enableFiltering: false,
			enableCopy: false,
			customClasses: { container: "quick-notification-container" }
		});

		const notification = tempManager.show(text, type, null, duration);

		if (notification && duration > 0) {
			const destroyTimeout = setTimeout(() => {
				if (tempManager.container && !tempManager.notifications.length) {
					tempManager.destroy();
				}
			}, duration + 500);
			tempManager.timeouts.add(destroyTimeout);
		}

		return notification;
	}
};

export default NotificationManager;
