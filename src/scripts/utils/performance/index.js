/**
 * Performance Monitoring Initialization
 *
 * This module initializes all performance monitoring tools.
 * It's the main entry point for the performance monitoring system.
 */

import { initWebVitals } from "./web-vitals.js";
import { initPerformanceDashboard } from "./dashboard.js";

// Initialize all performance monitoring
export function initPerformanceMonitoring() {
	// Initialize Core Web Vitals tracking
	initWebVitals();

	// Initialize the performance dashboard (development only)
	initPerformanceDashboard();
}

// Export all sub-modules for direct access
export * from "./web-vitals.js";
export * from "./dashboard.js";

// Lighthouse CI configuration utilities
export const lighthouseConfig = {
	// Default Lighthouse CI configuration
	getConfig() {
		return {
			ci: {
				collect: {
					numberOfRuns: 3,
					url: ["http://localhost:9292/", "http://localhost:9292/collections/all", "http://localhost:9292/products/sample-product"],
					settings: {
						preset: "desktop",
						// Use simulated throttling for consistent results in CI
						throttlingMethod: "simulate",
						// The following settings provide a balanced testing environment
						throttling: {
							cpuSlowdownMultiplier: 4,
							downloadThroughputKbps: 1600,
							uploadThroughputKbps: 750,
							rttMs: 150
						}
					}
				},
				assert: {
					// Assertions for Core Web Vitals
					assertions: {
						"categories:performance": ["error", { minScore: 0.8 }],
						"categories:accessibility": ["error", { minScore: 0.9 }],
						"first-contentful-paint": ["error", { maxNumericValue: 2000 }],
						"largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
						"cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
						"total-blocking-time": ["error", { maxNumericValue: 300 }],
						interactive: ["error", { maxNumericValue: 3500 }]
					}
				},
				upload: {
					// Upload to temporary storage
					target: "temporary-public-storage"
					// Optional: configure for upload to your own dashboard
					// server: 'http://your-lighthouse-server.com/api',
					// token: process.env.LIGHTHOUSE_API_TOKEN
				}
			}
		};
	},

	// Generate Lighthouse CI configuration file
	generateConfigFile() {
		return `module.exports = ${JSON.stringify(this.getConfig(), null, 2)};`;
	}
};

// Export utility to integrate with package.json
export function getLighthouseScripts() {
	return {
		"lighthouse:ci": "lhci autorun",
		"lighthouse:desktop": "lighthouse http://localhost:9292 --view --preset=desktop",
		"lighthouse:mobile": "lighthouse http://localhost:9292 --view --preset=mobile"
	};
}
