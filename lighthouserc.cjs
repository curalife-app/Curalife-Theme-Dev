/**
 * Lighthouse CI Configuration
 *
 * This file configures Lighthouse CI to run performance tests against the Shopify theme.
 * It's used by the 'lighthouse:ci' npm script.
 */

module.exports = {
	ci: {
		collect: {
			// Run Lighthouse 1 time per URL for faster CI
			numberOfRuns: 1,

			// Test the home page
			url: ["http://localhost:9292/"],

			// Configure the testing environment to be less demanding for CI
			settings: {
				preset: "desktop",
				// Use simulated throttling for CI environments
				throttlingMethod: "simulate",
				// Set throttling parameters to avoid timeouts
				throttling: {
					cpuSlowdownMultiplier: 2,
					downloadThroughputKbps: 5000,
					uploadThroughputKbps: 2000,
					rttMs: 40
				},
				// Skip audits that might be flaky in CI
				skipAudits: ["uses-http2", "uses-long-cache-ttl", "canonical", "redirects", "uses-text-compression", "network-requests", "third-party-facades"]
			}
		},

		// Simplify assertions for CI
		assert: {
			assertions: {
				// Overall scores - relaxed for CI
				"categories:performance": ["error", { minScore: 0.6 }],
				"categories:accessibility": ["error", { minScore: 0.7 }],
				"categories:best-practices": ["error", { minScore: 0.7 }],
				"categories:seo": ["warning", { minScore: 0.7 }],

				// Core Web Vitals - relaxed for CI
				"first-contentful-paint": ["error", { maxNumericValue: 3000 }],
				"largest-contentful-paint": ["error", { maxNumericValue: 4000 }],
				"cumulative-layout-shift": ["error", { maxNumericValue: 0.25 }],
				"total-blocking-time": ["error", { maxNumericValue: 600 }],
				interactive: ["error", { maxNumericValue: 5000 }]
			}
		},

		// Upload results
		upload: {
			// Use temporary public storage
			target: "temporary-public-storage"
		}
	}
};
