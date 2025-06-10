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
			icon: "notification-icon",
			title: "notification-title",
			toggle: "notification-toggle",
			details: "notification-details",
			detailsContent: "notification-details-content",
			close: "notification-close",
			shimmer: "notification-shimmer",
			simple: "notification-simple",
			simpleIcon: "notification-simple-icon",
			simpleText: "notification-simple-text",
			// Override with custom classes if provided
			...(options.customClasses || {})
		};

		this.notifications = [];
		this.currentFilter = "all";
		this.autoCollapseEnabled = this.options.autoCollapse;

		this.init();
	}

	init() {
		this.createContainer();
		if (this.options.enableFiltering || this.options.enableCopy) {
			this.addControlButtons();
		}
	}

	createContainer() {
		let container = document.querySelector(this.options.containerSelector);
		if (!container) {
			container = document.createElement("div");
			container.className = this.cssClasses.container;
			document.body.appendChild(container);
		}
		this.container = container;
	}

	show(text, type = "info", priority = null, duration = null) {
		const notification = this.createNotification(text, type, priority, duration);
		this.addNotification(notification);
		return notification;
	}

	createNotification(text, type = "info", priority = null, duration = null) {
		const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		const actualPriority = priority || this.determinePriority(type, text);
		const notificationDuration = duration || this.options.defaultDuration;

		const notification = document.createElement("div");
		notification.className = `${this.cssClasses.notification} ${this.cssClasses[type] || this.cssClasses.info}`;
		notification.id = id;
		notification.dataset.type = type;
		notification.dataset.priority = actualPriority;
		notification.dataset.timestamp = new Date().toISOString();

		// Apply priority styling
		this.applyPriorityStyles(notification, actualPriority, this.getPriorityConfig(actualPriority));

		// Determine if notification should be expandable (quiz-compatible logic)
		const isTestMode = text.includes("TEST MODE");
		const hasDetails = text.includes("<br>") || text.includes("\n") || text.length > 100;
		const isExpandable = isTestMode || hasDetails;

		if (isExpandable) {
			this.createExpandableNotification(notification, text, type);
		} else {
			this.createSimpleNotification(notification, text, type);
		}

		// Auto-remove after duration
		if (notificationDuration > 0) {
			setTimeout(() => {
				this.removeNotification(notification);
			}, notificationDuration);
		}

		return notification;
	}

	createExpandableNotification(notification, text, type) {
		// Handle quiz-specific formatting (supports both <br> and \n)
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

		// Clean title for test mode (remove emojis and TEST MODE text like the original)
		if (title.includes("TEST MODE")) {
			title = title
				.replace(/🧪/g, "")
				.replace(/✓/g, "")
				.replace(/❌/g, "")
				.replace(/⚠️/g, "")
				.replace(/ℹ️/g, "")
				.replace(/📡/g, "")
				.replace(/🔄/g, "")
				.replace(/TEST MODE\s*[-:]?\s*/gi, "")
				.trim();
		}

		notification.innerHTML = `
			<div class="${this.cssClasses.header}">
				<div class="${this.cssClasses.content}">
					<div class="${this.cssClasses.icon}">${this.getTypeIcon(type)}</div>
					<div class="${this.cssClasses.title}">${title}</div>
				</div>
				<div class="${this.cssClasses.toggle}">
					<svg width="12" height="8" viewBox="0 0 12 8" fill="none">
						<path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</div>
			</div>
			<div class="${this.cssClasses.details}">
				<div class="${this.cssClasses.detailsContent}">${detailsText}</div>
			</div>
			<div class="${this.cssClasses.close}">×</div>
			<div class="${this.cssClasses.shimmer}"></div>
		`;

		this.attachExpandableListeners(notification);
	}

	createSimpleNotification(notification, text, type) {
		notification.innerHTML = `
			<div class="${this.cssClasses.simple}">
				<div class="${this.cssClasses.simpleIcon}">${this.getTypeIcon(type)}</div>
				<div class="${this.cssClasses.simpleText}">${text}</div>
			</div>
			<div class="${this.cssClasses.close}">×</div>
			<div class="${this.cssClasses.shimmer}"></div>
		`;

		this.attachSimpleListeners(notification);
	}

	attachExpandableListeners(notification) {
		const header = notification.querySelector(`.${this.cssClasses.header}`);
		const toggle = notification.querySelector(`.${this.cssClasses.toggle}`);
		const closeBtn = notification.querySelector(`.${this.cssClasses.close}`);

		header.addEventListener("click", () => this.toggleNotification(notification));
		closeBtn.addEventListener("click", e => {
			e.stopPropagation();
			this.removeNotification(notification);
		});
	}

	attachSimpleListeners(notification) {
		const closeBtn = notification.querySelector(`.${this.cssClasses.close}`);
		closeBtn.addEventListener("click", () => this.removeNotification(notification));
	}

	toggleNotification(notification) {
		const details = notification.querySelector(`.${this.cssClasses.details}`);
		const toggle = notification.querySelector(`.${this.cssClasses.toggle}`);

		if (details.classList.contains("expanded")) {
			this.collapseNotification(notification);
		} else {
			this.expandNotification(notification);
		}
	}

	expandNotification(notification) {
		const details = notification.querySelector(`.${this.cssClasses.details}`);
		const toggle = notification.querySelector(`.${this.cssClasses.toggle}`);

		if (details) {
			// First add the expanded class to apply styling
			details.classList.add("expanded");

			// Use requestAnimationFrame to ensure the DOM has updated before calculating height
			requestAnimationFrame(() => {
				const contentHeight = details.scrollHeight;
				details.style.maxHeight = contentHeight + "px";
			});
		}
		if (toggle) {
			toggle.classList.add("expanded");
		}

		if (this.autoCollapseEnabled) {
			setTimeout(() => {
				this.collapseNotification(notification);
			}, 8000);
		}
	}

	collapseNotification(notification) {
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
		this.notifications.push(notification);
		this.container.appendChild(notification);

		// Trigger animation
		requestAnimationFrame(() => {
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
		if (!notification || !notification.parentNode) return;

		notification.classList.add("animate-out");

		setTimeout(() => {
			if (notification.parentNode) {
				notification.parentNode.removeChild(notification);
			}
			if (updateArray) {
				const index = this.notifications.indexOf(notification);
				if (index > -1) {
					this.notifications.splice(index, 1);
				}
			}
		}, 300);
	}

	addControlButtons() {
		this.removeExistingButtons();

		if (this.options.enableCopy) {
			this.addCopyButton();
		}
		if (this.options.enableFiltering) {
			this.addFilterButton();
		}
	}

	removeExistingButtons() {
		const existingButtons = document.querySelectorAll(".notification-copy-button, .notification-filter-button");
		existingButtons.forEach(btn => btn.remove());
	}

	addCopyButton() {
		const copyButton = document.createElement("div");
		copyButton.className = "notification-copy-button";
		copyButton.innerHTML = `
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
				<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2 2v1"></path>
			</svg>
		`;
		copyButton.title = "Copy notifications";

		copyButton.addEventListener("click", () => this.showCopyOptionsMenu(copyButton));
		document.body.appendChild(copyButton);
	}

	addFilterButton() {
		const filterButton = document.createElement("div");
		filterButton.className = "notification-filter-button";
		filterButton.innerHTML = "🔍";
		filterButton.title = "Filter notifications";

		filterButton.addEventListener("click", () => this.showFilterOptionsMenu(filterButton));
		document.body.appendChild(filterButton);
	}

	showCopyOptionsMenu(copyButton) {
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

		document.body.appendChild(menu);

		menu.addEventListener("click", e => {
			const item = e.target.closest(".notification-copy-options-menu-item");
			if (item) {
				const format = item.dataset.format;
				const filter = item.dataset.filter;
				this.exportNotifications(format, filter, copyButton);
				menu.remove();
			}
		});

		// Close menu when clicking outside
		setTimeout(() => {
			document.addEventListener("click", function closeMenu(e) {
				if (!menu.contains(e.target) && !copyButton.contains(e.target)) {
					menu.remove();
					document.removeEventListener("click", closeMenu);
				}
			});
		}, 100);
	}

	showFilterOptionsMenu(filterButton) {
		this.removeExistingMenus();

		const menu = document.createElement("div");
		menu.className = "notification-filter-options-menu";
		menu.innerHTML = `
			<div class="notification-filter-options-menu-item ${this.currentFilter === "all" ? "active" : ""}" data-filter="all">All Types</div>
			<div class="notification-filter-options-menu-item ${this.currentFilter === "error" ? "active" : ""}" data-filter="error">Errors</div>
			<div class="notification-filter-options-menu-item ${this.currentFilter === "success" ? "active" : ""}" data-filter="success">Success</div>
			<div class="notification-filter-options-menu-item ${this.currentFilter === "info" ? "active" : ""}" data-filter="info">Info</div>
		`;

		document.body.appendChild(menu);

		menu.addEventListener("click", e => {
			const item = e.target.closest(".notification-filter-options-menu-item");
			if (item) {
				const filter = item.dataset.filter;
				this.currentFilter = filter;
				this.applyNotificationFilter(filter);
				this.updateFilterButtonAppearance(filterButton, this.getFilterEmoji(filter));
				menu.remove();
			}
		});

		// Close menu when clicking outside
		setTimeout(() => {
			document.addEventListener("click", function closeMenu(e) {
				if (!menu.contains(e.target) && !filterButton.contains(e.target)) {
					menu.remove();
					document.removeEventListener("click", closeMenu);
				}
			});
		}, 100);
	}

	removeExistingMenus() {
		const existingMenus = document.querySelectorAll(".notification-copy-options-menu, .notification-filter-options-menu");
		existingMenus.forEach(menu => menu.remove());
	}

	applyNotificationFilter(filter) {
		this.notifications.forEach(notification => {
			const type = notification.dataset.type;
			const shouldShow = filter === "all" || type === filter;

			notification.classList.toggle("filter-hidden", !shouldShow);
			notification.classList.toggle("filter-visible", shouldShow);
		});
	}

	updateFilterButtonAppearance(filterButton, emoji) {
		filterButton.innerHTML = emoji;
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
	}

	getFilteredNotifications(filter) {
		return this.notifications.filter(notification => {
			const type = notification.dataset.type;
			return filter === "all" || type === filter;
		});
	}

	formatAsText(notifications, filter) {
		const header = `=== NOTIFICATIONS EXPORT (${filter.toUpperCase()}) ===\n` + `Exported: ${new Date().toLocaleString()}\n` + `Total: ${notifications.length} notifications\n\n`;

		const content = notifications
			.map((notification, index) => {
				const type = notification.dataset.type.toUpperCase();
				const timestamp = new Date(notification.dataset.timestamp).toLocaleString();
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
				type: notification.dataset.type,
				priority: notification.dataset.priority,
				timestamp: notification.dataset.timestamp,
				text: this.extractNotificationText(notification)
			}))
		};

		return JSON.stringify(data, null, 2);
	}

	formatAsCSV(notifications, filter) {
		const header = "Index,Type,Priority,Timestamp,Text\n";
		const rows = notifications
			.map((notification, index) => {
				const type = notification.dataset.type;
				const priority = notification.dataset.priority || "";
				const timestamp = notification.dataset.timestamp;
				const text = this.extractNotificationText(notification).replace(/"/g, '""');

				return `${index + 1},"${type}","${priority}","${timestamp}","${text}"`;
			})
			.join("\n");

		return header + rows;
	}

	extractNotificationText(notification) {
		const titleElement = notification.querySelector(`.${this.cssClasses.title}, .${this.cssClasses.simpleText}`);
		const detailsElement = notification.querySelector(`.${this.cssClasses.detailsContent}`);

		let text = titleElement ? titleElement.textContent.trim() : "";
		if (detailsElement && detailsElement.textContent.trim()) {
			text += "\n" + detailsElement.textContent.trim();
		}

		return text;
	}

	async copyToClipboard(text, button, formatInfo) {
		try {
			if (navigator.clipboard && window.isSecureContext) {
				await navigator.clipboard.writeText(text);
				this.showCopyFeedback(button, true, formatInfo);
			} else {
				this.fallbackCopyToClipboard(text, button, formatInfo);
			}
		} catch (error) {
			this.fallbackCopyToClipboard(text, button, formatInfo);
		}
	}

	fallbackCopyToClipboard(text, button, formatInfo) {
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
			this.showCopyFeedback(button, false, formatInfo);
		} finally {
			document.body.removeChild(textArea);
		}
	}

	showCopyFeedback(button, success, formatInfo = {}) {
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

		setTimeout(() => {
			button.className = originalClass;
			button.innerHTML = originalContent;
		}, 2000);
	}

	determinePriority(type, text) {
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
		this.notifications.forEach(notification => this.removeNotification(notification, false));
		this.notifications = [];
	}

	expandAll() {
		this.notifications.forEach(notification => {
			if (notification.querySelector(`.${this.cssClasses.details}`)) {
				this.expandNotification(notification);
			}
		});
	}

	collapseAll() {
		this.notifications.forEach(notification => {
			if (notification.querySelector(`.${this.cssClasses.details}`)) {
				this.collapseNotification(notification);
			}
		});
	}

	setAutoCollapse(enabled) {
		this.autoCollapseEnabled = enabled;
	}

	getNotifications() {
		return this.notifications;
	}

	getNotificationsByType(type) {
		return this.notifications.filter(n => n.dataset.type === type);
	}

	destroy() {
		this.clear();
		this.removeExistingButtons();
		this.removeExistingMenus();
		if (this.container && this.container.parentNode) {
			this.container.parentNode.removeChild(this.container);
		}
	}
}

// Static utility methods
export const NotificationUtils = {
	createManager(options) {
		return new NotificationManager(options);
	},

	showQuickNotification(text, type = "info", duration = 3000) {
		const tempManager = new NotificationManager({
			enableFiltering: false,
			enableCopy: false,
			autoCollapse: false
		});
		return tempManager.show(text, type, null, duration);
	}
};

export default NotificationManager;
