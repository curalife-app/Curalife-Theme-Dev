/**
 * Modular Notification System
 * Extracted from quiz component for reusability across different components
 */

export class NotificationManager {
	constructor(options = {}) {
		this.options = {
			containerSelector: ".notification-container",
			position: "top-right",
			autoCollapse: true,
			maxNotifications: 50,
			defaultDuration: 5000,
			enableFiltering: true,
			enableCopy: true,
			...options
		};

		// CSS class configuration - generic names, customizable for any component
		this.cssClasses = {
			container: "notification-container",
			notification: "notification",
			success: "notification-success",
			error: "notification-error",
			info: "notification-info",
			warning: "notification-warning",
			header: "notification-header",
			content: "notification-content",
			controls: "notification-controls",
			icon: "notification-icon",
			title: "notification-title",
			toggle: "notification-toggle",
			details: "notification-details",
			detailsContent: "notification-details-content",
			close: "notification-close",
			shimmer: "notification-shimmer",
			// Override with custom classes if provided
			...(options.customClasses || {})
		};

		this.notifications = [];
		this.currentFilter = "all";
		this.autoCollapseEnabled = this.options.autoCollapse;

		// Track timeouts and event listeners for cleanup
		this.timeouts = new Set();
		this.eventListeners = new WeakMap();
		this.isDestroyed = false;

		this.init();
	}

	init() {
		if (this.isDestroyed) return;

		try {
			this.createContainer();
			if (this.options.enableFiltering || this.options.enableCopy) {
				this.addControlButtons();
			}
		} catch (error) {
			console.error("Failed to initialize NotificationManager:", error);
		}
	}

	createContainer() {
		// Wait for DOM to be ready
		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", () => this.createContainer());
			return;
		}

		let container = document.querySelector(this.options.containerSelector);
		if (!container) {
			if (!document.body) {
				throw new Error("Document body not available for creating notification container");
			}
			container = document.createElement("div");
			container.className = this.cssClasses.container;
			document.body.appendChild(container);
		}
		this.container = container;
	}

	show(text, type = "info", priority = null, duration = null) {
		if (this.isDestroyed) {
			console.warn("Cannot show notification: NotificationManager has been destroyed");
			return null;
		}

		try {
			const notification = this.createNotification(text, type, priority, duration);
			this.addNotification(notification);
			return notification;
		} catch (error) {
			console.error("Failed to show notification:", error);
			return null;
		}
	}

	createNotification(text, type = "info", priority = null, duration = null) {
		if (!text || typeof text !== "string") {
			throw new Error("Notification text must be a non-empty string");
		}

		const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		const actualPriority = priority || this.determinePriority(type, text);
		const notificationDuration = duration !== null ? duration : this.options.defaultDuration;

		const notification = document.createElement("div");
		notification.className = `${this.cssClasses.notification} ${this.cssClasses[type] || this.cssClasses.info}`;
		notification.id = id;
		notification.dataset.type = type;
		notification.dataset.priority = actualPriority;
		notification.dataset.timestamp = new Date().toISOString();

		// Apply priority styling
		this.applyPriorityStyles(notification, actualPriority, this.getPriorityConfig(actualPriority));

		// All notifications use the same unified structure
		this.createUnifiedNotification(notification, text, type);

		// Auto-remove after duration (only if duration > 0)
		if (notificationDuration > 0) {
			const timeoutId = setTimeout(() => {
				this.removeNotification(notification);
				this.timeouts.delete(timeoutId);
			}, notificationDuration);
			this.timeouts.add(timeoutId);
		}

		return notification;
	}

	createUnifiedNotification(notification, text, type) {
		// Handle formatting (supports both <br> and \n)
		let title, detailsText;

		if (text.includes("<br>")) {
			const parts = text.split("<br>");
			title = parts[0].trim();
			detailsText = parts.slice(1).join("<br>").trim();
		} else {
			const [firstLine, ...details] = text.split("\n");
			title = firstLine.trim();
			detailsText = details.join("\n").trim();
		}

		// Clean title consistently (remove emojis and TEST MODE text)
		title = this.cleanNotificationTitle(title);

		// Sanitize HTML but preserve <br> tags for legitimate formatting
		const safeTitle = this.sanitizeHtml(title);
		const safeDetailsText = this.sanitizeHtml(detailsText);

		// Always use the expandable structure, even for simple notifications
		notification.innerHTML = `
			<div class="${this.cssClasses.header}">
				<div class="${this.cssClasses.content}">
					<div class="${this.cssClasses.icon}">${this.getTypeIcon(type)}</div>
					<div class="${this.cssClasses.title}">${safeTitle}</div>
				</div>
				<div class="notification-controls">
					${
						detailsText
							? `<div class="${this.cssClasses.toggle}">
						<svg width="12" height="8" viewBox="0 0 12 8" fill="none">
							<path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					</div>`
							: ""
					}
					<div class="${this.cssClasses.close}">×</div>
				</div>
			</div>
			${
				detailsText
					? `<div class="${this.cssClasses.details}">
				<div class="${this.cssClasses.detailsContent}">${safeDetailsText}</div>
			</div>`
					: ""
			}
			<div class="${this.cssClasses.shimmer}"></div>
		`;

		this.attachNotificationListeners(notification);
	}

	attachNotificationListeners(notification) {
		const header = notification.querySelector(`.${this.cssClasses.header}`);
		const closeBtn = notification.querySelector(`.${this.cssClasses.close}`);
		const toggle = notification.querySelector(`.${this.cssClasses.toggle}`);

		if (!header || !closeBtn) {
			console.error("Failed to find required elements in notification");
			return;
		}

		const closeClickHandler = e => {
			e.stopPropagation();
			this.removeNotification(notification);
		};

		const listeners = [{ element: closeBtn, event: "click", handler: closeClickHandler }];

		// Only add toggle functionality if there are details to expand
		if (toggle) {
			const headerClickHandler = () => this.toggleNotification(notification);
			header.addEventListener("click", headerClickHandler);
			listeners.push({ element: header, event: "click", handler: headerClickHandler });
		}

		closeBtn.addEventListener("click", closeClickHandler);

		// Store listeners for cleanup
		this.eventListeners.set(notification, listeners);
	}

	cleanNotificationTitle(title) {
		// Clean title consistently - remove common emojis and TEST MODE text
		return title
			.replace(/🧪/g, "")
			.replace(/✓/g, "")
			.replace(/❌/g, "")
			.replace(/⚠️/g, "")
			.replace(/ℹ️/g, "")
			.replace(/📡/g, "")
			.replace(/🔄/g, "")
			.replace(/🔍/g, "") // Add search emoji
			.replace(/💊/g, "") // Add pill emoji
			.replace(/🏥/g, "") // Add hospital emoji
			.replace(/📋/g, "") // Add clipboard emoji
			.replace(/TEST MODE\s*[-:]?\s*/gi, "")
			.trim();
	}

	sanitizeHtml(text) {
		if (!text || typeof text !== "string") return "";

		// Create a temporary div to escape HTML
		const div = document.createElement("div");
		div.textContent = text;
		let escaped = div.innerHTML;

		// Allow specific safe HTML tags for formatting
		escaped = escaped
			.replace(/&lt;br&gt;/gi, "<br>")
			.replace(/&lt;br\/&gt;/gi, "<br>")
			.replace(/&lt;br \/&gt;/gi, "<br>")
			.replace(/&lt;strong&gt;(.*?)&lt;\/strong&gt;/gi, "<strong>$1</strong>")
			.replace(/&lt;em&gt;(.*?)&lt;\/em&gt;/gi, "<em>$1</em>");

		return escaped;
	}

	escapeHtml(text) {
		// Legacy method - keeping for backward compatibility but redirecting to sanitizeHtml
		return this.sanitizeHtml(text);
	}

	toggleNotification(notification) {
		if (this.isDestroyed) return;

		const details = notification.querySelector(`.${this.cssClasses.details}`);
		if (!details) return;

		if (details.classList.contains("expanded")) {
			this.collapseNotification(notification);
		} else {
			this.expandNotification(notification);
		}
	}

	expandNotification(notification) {
		if (this.isDestroyed) return;

		const details = notification.querySelector(`.${this.cssClasses.details}`);
		const toggle = notification.querySelector(`.${this.cssClasses.toggle}`);

		if (details) {
			// First add the expanded class to apply styling
			details.classList.add("expanded");

			// Use requestAnimationFrame to ensure the DOM has updated before calculating height
			requestAnimationFrame(() => {
				if (this.isDestroyed) return;

				// Calculate total height including margins and padding
				const contentHeight = details.scrollHeight;
				const computedStyle = window.getComputedStyle(details);
				const marginTop = parseInt(computedStyle.marginTop) || 0;
				const paddingTop = parseInt(computedStyle.paddingTop) || 0;
				const paddingBottom = parseInt(computedStyle.paddingBottom) || 0;

				const totalHeight = contentHeight + marginTop + paddingTop + paddingBottom;
				details.style.maxHeight = totalHeight + "px";
			});
		}
		if (toggle) {
			toggle.classList.add("expanded");
		}
	}

	collapseNotification(notification) {
		if (this.isDestroyed) return;

		const details = notification.querySelector(`.${this.cssClasses.details}`);
		const toggle = notification.querySelector(`.${this.cssClasses.toggle}`);

		if (details) {
			details.classList.remove("expanded");
			details.style.maxHeight = "0";
		}
		if (toggle) {
			toggle.classList.remove("expanded");
		}
	}

	addNotification(notification) {
		if (this.isDestroyed || !this.container) return;

		this.notifications.push(notification);
		this.container.appendChild(notification);

		// Trigger animation
		requestAnimationFrame(() => {
			if (this.isDestroyed) return;
			notification.classList.add("animate-in");
		});

		// Manage notification count
		if (this.notifications.length > this.options.maxNotifications) {
			const oldestNotification = this.notifications.shift();
			this.removeNotification(oldestNotification, false);
		}

		// Apply current filter
		this.applyNotificationFilter(this.currentFilter);
	}

	removeNotification(notification, updateArray = true) {
		if (!notification || !notification.parentNode || this.isDestroyed) return;

		// Clean up event listeners
		const listeners = this.eventListeners.get(notification);
		if (listeners) {
			listeners.forEach(({ element, event, handler }) => {
				if (element) {
					element.removeEventListener(event, handler);
				}
			});
			this.eventListeners.delete(notification);
		}

		notification.classList.add("animate-out");

		const timeoutId = setTimeout(() => {
			if (notification.parentNode && !this.isDestroyed) {
				notification.parentNode.removeChild(notification);
			}
			if (updateArray && !this.isDestroyed) {
				const index = this.notifications.indexOf(notification);
				if (index > -1) {
					this.notifications.splice(index, 1);
				}
			}
			this.timeouts.delete(timeoutId);
		}, 300);
		this.timeouts.add(timeoutId);
	}

	addControlButtons() {
		if (this.isDestroyed) return;

		this.removeExistingButtons();

		try {
			if (this.options.enableCopy) {
				this.addCopyButton();
			}
			if (this.options.enableFiltering) {
				this.addFilterButton();
			}
		} catch (error) {
			console.error("Failed to add control buttons:", error);
		}
	}

	removeExistingButtons() {
		const existingButtons = document.querySelectorAll(".notification-copy-button, .notification-filter-button");
		existingButtons.forEach(btn => {
			// Clean up any stored event listeners
			const listeners = this.eventListeners.get(btn);
			if (listeners) {
				listeners.forEach(({ element, event, handler }) => {
					if (element) {
						element.removeEventListener(event, handler);
					}
				});
				this.eventListeners.delete(btn);
			}
			btn.remove();
		});
	}

	addCopyButton() {
		if (!document.body) return;

		const copyButton = document.createElement("div");
		copyButton.className = "notification-copy-button";
		copyButton.innerHTML = `
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
				<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2 2v1"></path>
			</svg>
		`;
		copyButton.title = "Copy notifications";

		const clickHandler = () => this.showCopyOptionsMenu(copyButton);
		copyButton.addEventListener("click", clickHandler);

		// Store listener for cleanup
		this.eventListeners.set(copyButton, [{ element: copyButton, event: "click", handler: clickHandler }]);

		document.body.appendChild(copyButton);
	}

	addFilterButton() {
		if (!document.body) return;

		const filterButton = document.createElement("div");
		filterButton.className = "notification-filter-button";
		filterButton.innerHTML = "🔍";
		filterButton.title = "Filter notifications";

		const clickHandler = () => this.showFilterOptionsMenu(filterButton);
		filterButton.addEventListener("click", clickHandler);

		// Store listener for cleanup
		this.eventListeners.set(filterButton, [{ element: filterButton, event: "click", handler: clickHandler }]);

		document.body.appendChild(filterButton);
	}

	showCopyOptionsMenu(copyButton) {
		if (this.isDestroyed) return;

		this.removeExistingMenus();

		const menu = document.createElement("div");
		menu.className = "notification-copy-options-menu";
		menu.innerHTML = `
			<div class="notification-copy-options-menu-item" data-format="text" data-filter="all">All as Text</div>
			<div class="notification-copy-options-menu-item" data-format="json" data-filter="all">All as JSON</div>
			<div class="notification-copy-options-menu-item" data-format="csv" data-filter="all">All as CSV</div>
			<div class="notification-copy-options-menu-divider"></div>
			<div class="notification-copy-options-menu-item" data-format="text" data-filter="error">Errors Only</div>
			<div class="notification-copy-options-menu-item" data-format="text" data-filter="success">Success Only</div>
			<div class="notification-copy-options-menu-item" data-format="text" data-filter="info">Info Only</div>
		`;

		if (!document.body) return;
		document.body.appendChild(menu);

		const menuClickHandler = e => {
			const item = e.target.closest(".notification-copy-options-menu-item");
			if (item) {
				const format = item.dataset.format;
				const filter = item.dataset.filter;
				this.exportNotifications(format, filter, copyButton);
				menu.remove();
			}
		};

		menu.addEventListener("click", menuClickHandler);

		// Close menu when clicking outside with proper cleanup
		const timeoutId = setTimeout(() => {
			const closeMenuHandler = e => {
				if (!menu.contains(e.target) && !copyButton.contains(e.target)) {
					menu.remove();
					document.removeEventListener("click", closeMenuHandler);
				}
			};
			document.addEventListener("click", closeMenuHandler);
			this.timeouts.delete(timeoutId);
		}, 100);
		this.timeouts.add(timeoutId);
	}

	showFilterOptionsMenu(filterButton) {
		if (this.isDestroyed) return;

		this.removeExistingMenus();

		const menu = document.createElement("div");
		menu.className = "notification-filter-options-menu";
		menu.innerHTML = `
			<div class="notification-filter-options-menu-item ${this.currentFilter === "all" ? "active" : ""}" data-filter="all">All Types</div>
			<div class="notification-filter-options-menu-item ${this.currentFilter === "error" ? "active" : ""}" data-filter="error">Errors</div>
			<div class="notification-filter-options-menu-item ${this.currentFilter === "success" ? "active" : ""}" data-filter="success">Success</div>
			<div class="notification-filter-options-menu-item ${this.currentFilter === "info" ? "active" : ""}" data-filter="info">Info</div>
		`;

		if (!document.body) return;
		document.body.appendChild(menu);

		const menuClickHandler = e => {
			const item = e.target.closest(".notification-filter-options-menu-item");
			if (item) {
				const filter = item.dataset.filter;
				this.currentFilter = filter;
				this.applyNotificationFilter(filter);
				this.updateFilterButtonAppearance(filterButton, this.getFilterEmoji(filter));
				menu.remove();
			}
		};

		menu.addEventListener("click", menuClickHandler);

		// Close menu when clicking outside with proper cleanup
		const timeoutId = setTimeout(() => {
			const closeMenuHandler = e => {
				if (!menu.contains(e.target) && !filterButton.contains(e.target)) {
					menu.remove();
					document.removeEventListener("click", closeMenuHandler);
				}
			};
			document.addEventListener("click", closeMenuHandler);
			this.timeouts.delete(timeoutId);
		}, 100);
		this.timeouts.add(timeoutId);
	}

	removeExistingMenus() {
		const existingMenus = document.querySelectorAll(".notification-copy-options-menu, .notification-filter-options-menu");
		existingMenus.forEach(menu => menu.remove());
	}

	applyNotificationFilter(filter) {
		if (this.isDestroyed) return;

		this.notifications.forEach(notification => {
			if (!notification.dataset) return;

			const type = notification.dataset.type;
			const shouldShow = filter === "all" || type === filter;

			notification.classList.toggle("filter-hidden", !shouldShow);
			notification.classList.toggle("filter-visible", shouldShow);
		});
	}

	updateFilterButtonAppearance(filterButton, emoji) {
		if (filterButton && emoji) {
			filterButton.innerHTML = emoji;
		}
	}

	getFilterEmoji(filter) {
		const emojis = {
			all: "🔍",
			error: "❌",
			success: "✅",
			info: "ℹ️"
		};
		return emojis[filter] || "🔍";
	}

	exportNotifications(format, filter, copyButton) {
		if (this.isDestroyed) return;

		try {
			const filteredNotifications = this.getFilteredNotifications(filter);

			let exportedData;
			switch (format) {
				case "json":
					exportedData = this.formatAsJSON(filteredNotifications, filter);
					break;
				case "csv":
					exportedData = this.formatAsCSV(filteredNotifications, filter);
					break;
				default:
					exportedData = this.formatAsText(filteredNotifications, filter);
			}

			this.copyToClipboard(exportedData, copyButton, { format, filter });
		} catch (error) {
			console.error("Failed to export notifications:", error);
		}
	}

	getFilteredNotifications(filter) {
		return this.notifications.filter(notification => {
			if (!notification.dataset) return false;
			const type = notification.dataset.type;
			return filter === "all" || type === filter;
		});
	}

	formatAsText(notifications, filter) {
		const header = `=== NOTIFICATIONS EXPORT (${filter.toUpperCase()}) ===\n` + `Exported: ${new Date().toLocaleString()}\n` + `Total: ${notifications.length} notifications\n\n`;

		const content = notifications
			.map((notification, index) => {
				const type = (notification.dataset.type || "unknown").toUpperCase();
				const timestamp = notification.dataset.timestamp ? new Date(notification.dataset.timestamp).toLocaleString() : "Unknown";
				const text = this.extractNotificationText(notification);

				return `[${index + 1}] ${type} - ${timestamp}\n${text}\n`;
			})
			.join("\n");

		return header + content;
	}

	formatAsJSON(notifications, filter) {
		const data = {
			export_info: {
				filter: filter,
				exported_at: new Date().toISOString(),
				total_count: notifications.length
			},
			notifications: notifications.map((notification, index) => ({
				index: index + 1,
				type: notification.dataset.type || "unknown",
				priority: notification.dataset.priority || "unknown",
				timestamp: notification.dataset.timestamp || new Date().toISOString(),
				text: this.extractNotificationText(notification)
			}))
		};

		return JSON.stringify(data, null, 2);
	}

	formatAsCSV(notifications, filter) {
		const header = "Index,Type,Priority,Timestamp,Text\n";
		const rows = notifications
			.map((notification, index) => {
				const type = notification.dataset.type || "unknown";
				const priority = notification.dataset.priority || "";
				const timestamp = notification.dataset.timestamp || new Date().toISOString();
				const text = this.extractNotificationText(notification).replace(/"/g, '""');

				return `${index + 1},"${type}","${priority}","${timestamp}","${text}"`;
			})
			.join("\n");

		return header + rows;
	}

	extractNotificationText(notification) {
		if (!notification) return "";

		const titleElement = notification.querySelector(`.${this.cssClasses.title}`);
		const detailsElement = notification.querySelector(`.${this.cssClasses.detailsContent}`);

		let text = titleElement ? titleElement.textContent.trim() : "";
		if (detailsElement && detailsElement.textContent.trim()) {
			text += "\n" + detailsElement.textContent.trim();
		}

		return text;
	}

	async copyToClipboard(text, button, formatInfo) {
		if (this.isDestroyed) return;

		try {
			if (navigator.clipboard && window.isSecureContext) {
				await navigator.clipboard.writeText(text);
				this.showCopyFeedback(button, true, formatInfo);
			} else {
				this.fallbackCopyToClipboard(text, button, formatInfo);
			}
		} catch (error) {
			console.error("Clipboard operation failed:", error);
			this.fallbackCopyToClipboard(text, button, formatInfo);
		}
	}

	fallbackCopyToClipboard(text, button, formatInfo) {
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
			this.showCopyFeedback(button, successful, formatInfo);
		} catch (error) {
			console.error("Fallback copy failed:", error);
			this.showCopyFeedback(button, false, formatInfo);
		} finally {
			if (document.body.contains(textArea)) {
				document.body.removeChild(textArea);
			}
		}
	}

	showCopyFeedback(button, success, formatInfo = {}) {
		if (this.isDestroyed || !button) return;

		const originalClass = button.className;
		const originalContent = button.innerHTML;

		if (success) {
			button.classList.add("success");
			button.innerHTML = `
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="20,6 9,17 4,12"></polyline>
				</svg>
			`;
		} else {
			button.classList.add("error");
			button.innerHTML = `
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="18" y1="6" x2="6" y2="18"></line>
					<line x1="6" y1="6" x2="18" y2="18"></line>
				</svg>
			`;
		}

		const timeoutId = setTimeout(() => {
			if (!this.isDestroyed && button) {
				button.className = originalClass;
				button.innerHTML = originalContent;
			}
			this.timeouts.delete(timeoutId);
		}, 2000);
		this.timeouts.add(timeoutId);
	}

	determinePriority(type, text) {
		if (!text || typeof text !== "string") return "info";

		const lowerText = text.toLowerCase();

		if (type === "error") {
			if (lowerText.includes("critical") || lowerText.includes("fatal")) {
				return "critical";
			}
			return "error";
		}

		if (type === "success") {
			return "success";
		}

		if (lowerText.includes("warning") || lowerText.includes("warn")) {
			return "warning";
		}

		return "info";
	}

	getPriorityConfig(priority) {
		const configs = {
			critical: { color: "#dc2626", shouldPulse: true },
			error: { color: "#dc2626", shouldPulse: false },
			warning: { color: "#f59e0b", shouldPulse: false },
			success: { color: "#059669", shouldPulse: false },
			info: { color: "#2563eb", shouldPulse: false }
		};
		return configs[priority] || configs.info;
	}

	applyPriorityStyles(notification, priority, priorityConfig) {
		if (!notification || this.isDestroyed) return;

		notification.classList.add(`notification-priority-${priority}`);

		if (priorityConfig.shouldPulse) {
			notification.style.animation = "pulse-critical 2s infinite";
		}
	}

	getTypeIcon(type) {
		const icons = {
			success: "✓",
			error: "✗",
			warning: "⚠",
			info: "ℹ"
		};
		return icons[type] || "ℹ";
	}

	// Public API methods
	clear() {
		if (this.isDestroyed) return;

		// Create a copy of the array to avoid modification during iteration
		const notificationsToRemove = [...this.notifications];
		notificationsToRemove.forEach(notification => this.removeNotification(notification, false));
		this.notifications = [];
	}

	expandAll() {
		if (this.isDestroyed) return;

		this.notifications.forEach(notification => {
			if (notification.querySelector(`.${this.cssClasses.details}`)) {
				this.expandNotification(notification);
			}
		});
	}

	collapseAll() {
		if (this.isDestroyed) return;

		this.notifications.forEach(notification => {
			if (notification.querySelector(`.${this.cssClasses.details}`)) {
				this.collapseNotification(notification);
			}
		});
	}

	setAutoCollapse(enabled) {
		this.autoCollapseEnabled = !!enabled;
	}

	getNotifications() {
		return this.isDestroyed ? [] : [...this.notifications];
	}

	getNotificationsByType(type) {
		return this.isDestroyed ? [] : this.notifications.filter(n => n.dataset && n.dataset.type === type);
	}

	destroy() {
		if (this.isDestroyed) return;

		this.isDestroyed = true;

		// Clear all timeouts
		this.timeouts.forEach(timeoutId => clearTimeout(timeoutId));
		this.timeouts.clear();

		// Clean up all event listeners
		this.eventListeners.forEach((listeners, element) => {
			listeners.forEach(({ element: el, event, handler }) => {
				if (el && el.removeEventListener) {
					el.removeEventListener(event, handler);
				}
			});
		});
		this.eventListeners = new WeakMap();

		// Remove all notifications
		this.clear();

		// Remove control buttons
		this.removeExistingButtons();
		this.removeExistingMenus();

		// Remove container
		if (this.container && this.container.parentNode) {
			this.container.parentNode.removeChild(this.container);
		}

		// Clear references
		this.container = null;
		this.notifications = [];
	}
}

// Static utility methods
export const NotificationUtils = {
	createManager(options) {
		return new NotificationManager(options);
	},

	showQuickNotification(text, type = "info", duration = 3000) {
		if (!text || typeof text !== "string") {
			console.error("Quick notification requires valid text");
			return null;
		}

		try {
			const tempManager = new NotificationManager({
				enableFiltering: false,
				enableCopy: false,
				autoCollapse: false
			});
			return tempManager.show(text, type, null, duration);
		} catch (error) {
			console.error("Failed to show quick notification:", error);
			return null;
		}
	}
};

export default NotificationManager;
