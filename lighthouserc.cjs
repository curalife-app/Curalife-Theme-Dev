/**
 * Lighthouse CI Configuration
 *
 * This file configures Lighthouse CI to run performance tests against the Shopify theme.
 * It's used by the 'lighthouse:ci' npm script.
 */

module.exports = {
	ci: {
		collect: {
			// Run Lighthouse 3 times per URL
			numberOfRuns: 3,

			// Test multiple important pages
			url: [
				"http://127.0.0.1:9292/?geo=us" // Home page
			],

			// Configure the testing environment
			settings: {
				preset: "desktop",
				// Use simulated throttling for CI environments
				throttlingMethod: "simulate",
				// Set throttling parameters to simulate reasonable conditions
				throttling: {
					cpuSlowdownMultiplier: 4,
					downloadThroughputKbps: 1600,
					uploadThroughputKbps: 750,
					rttMs: 150
				}
			}
		},

		// Define performance budgets and test assertions
		assert: {
			assertions: {
				// Overall scores
				"categories:performance": ["error", { minScore: 0.8 }],
				"categories:accessibility": ["error", { minScore: 0.9 }],
				"categories:best-practices": ["error", { minScore: 0.9 }],
				"categories:seo": ["warning", { minScore: 0.9 }],

				// Core Web Vitals
				"first-contentful-paint": ["error", { maxNumericValue: 2000 }],
				"largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
				"cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
				"total-blocking-time": ["error", { maxNumericValue: 300 }],
				interactive: ["error", { maxNumericValue: 3500 }],

				// Resource optimization
				"resource-summary:script:size": ["warning", { maxNumericValue: 300000 }],
				"resource-summary:stylesheet:size": ["warning", { maxNumericValue: 100000 }],
				"resource-summary:third-party:count": ["warning", { maxNumericValue: 10 }],

				// Performance best practices
				"uses-responsive-images": "error",
				"offscreen-images": "error",
				"uses-rel-preconnect": "warning",
				"uses-text-compression": "error",
				"uses-optimized-images": "warning",
				"efficient-animated-content": "warning",

				// JavaScript optimization
				"unminified-javascript": "error",
				"unused-javascript": "warning",

				// CSS optimization
				"unminified-css": "error",
				"unused-css-rules": "warning",

				// Third-party impact
				"third-party-summary": "warning",
				"bootup-time": ["warning", { maxNumericValue: 1000 }],
				"mainthread-work-breakdown": ["warning", { maxNumericValue: 4000 }]
			}
		},

		// Upload results for visualization
		upload: {
			// Use temporary public storage for simplicity
			// For a real project, set up a persistent dashboard
			target: "temporary-public-storage"

			// Uncomment and configure for your own server if needed
			// server: 'http://your-lighthouse-server.com/api',
			// token: process.env.LIGHTHOUSE_API_TOKEN
		}
	}
};
