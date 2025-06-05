#!/usr/bin/env node

/**
 * Standard Watch Script - Uses Unified Watch Core
 */

import { WatchCore } from "./watch-core.js";

const watcher = new WatchCore({
	name: "Standard",
	icon: "👁️",
	theme: "watch",
	enableShopify: false,
	enableStagewise: false
});

watcher.initialize().catch(error => {
	console.error("Watch failed:", error.message);
	process.exit(1);
});
