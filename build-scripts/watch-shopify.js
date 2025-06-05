#!/usr/bin/env node

/**
 * Shopify Watch Script - Uses Unified Watch Core
 */

import { WatchCore } from "./watch-core.js";

const watcher = new WatchCore({
	name: "Shopify",
	icon: "🛍️",
	theme: "watch",
	enableShopify: true,
	enableStagewise: true,
	customSteps: ["Shopify setup"],
	debounceDelay: 150,
	tailwindDebounce: 500
});

watcher.initialize().catch(error => {
	console.error("Shopify watch failed:", error.message);
	process.exit(1);
});
