/**
 * Performance Monitoring Initialization
 *
 * This file initializes the performance monitoring system
 * in the appropriate environments (development or production).
 */

import { initPerformanceMonitoring } from "./performance/index.js";

/**
 * Initialize performance monitoring based on the current environment
 */
export function initializePerformanceMonitoring() {
	// Initialize monitoring in all environments
	initPerformanceMonitoring();

	// Log initialization in development
	if (process.env.NODE_ENV === "development") {
		console.log("[Performance] Monitoring initialized in development mode");
		console.log("[Performance] Press Alt+Shift+P to open the dashboard");
	}
}

// Initialize automatically when this module is imported
// This can be removed if you prefer explicit initialization
document.addEventListener("DOMContentLoaded", () => {
	// Initialize after the page has loaded
	initializePerformanceMonitoring();
});
