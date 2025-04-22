/**
 * Lighthouse CI Configuration
 *
 * This file configures Lighthouse CI to run performance tests against the Shopify theme.
 * It's used by the GitHub Actions workflow and local 'lighthouse:ci' npm script.
 */

module.exports = {
	ci: {
		collect: {
			// Configuration is now handled directly in GitHub Actions
			// This is a fallback for local usage
			numberOfRuns: 1,
			url: ["https://curalife.com/"],
			settings: {
				preset: "desktop",
				throttlingMethod: "simulate",
				throttling: {
					cpuSlowdownMultiplier: 2,
					downloadThroughputKbps: 5000,
					uploadThroughputKbps: 2000,
					rttMs: 40
				},
				skipAudits: ["uses-http2", "uses-long-cache-ttl", "canonical", "redirects", "uses-text-compression", "third-party-facades"],
				// Added for timeouts and consistency
				maxWaitForLoad: 60000,
				onlyCategories: ["performance", "accessibility", "best-practices", "seo"]
			}
		},

		assert: {
			assertions: {
				// Overall scores with different levels for desktop/mobile
				"categories:performance": ["error", { minScore: 0.65 }],
				"categories:accessibility": ["error", { minScore: 0.8 }],
				"categories:best-practices": ["error", { minScore: 0.85 }],
				"categories:seo": ["error", { minScore: 0.85 }],

				// Core Web Vitals thresholds
				"first-contentful-paint": ["error", { maxNumericValue: 2500 }],
				"largest-contentful-paint": ["error", { maxNumericValue: 3000 }],
				"cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
				"total-blocking-time": ["error", { maxNumericValue: 500 }],
				interactive: ["error", { maxNumericValue: 4000 }],
				"max-potential-fid": ["error", { maxNumericValue: 300 }],

				// Resource optimizations (adjusted to be more realistic)
				"render-blocking-resources": ["warn", { maxLength: 5 }],
				"unminified-javascript": "error",
				"unminified-css": "error",
				"unused-javascript": ["warn", { maxLength: 1 }],
				"offscreen-images": "warn",
				"uses-responsive-images": "warn",
				"uses-optimized-images": "warn",
				"uses-rel-preconnect": "warn"
			}
		},

		upload: {
			// Use temporary public storage by default
			// For more permanent storage, configure an LHCI server
			target: "temporary-public-storage"
		},

		// Resource budget constraints
		budgets: [
			{
				path: "/",
				resourceSizes: [
					{ resourceType: "document", budget: 50 },
					{ resourceType: "script", budget: 300 },
					{ resourceType: "image", budget: 300 },
					{ resourceType: "stylesheet", budget: 100 },
					{ resourceType: "font", budget: 100 },
					{ resourceType: "third-party", budget: 200 },
					{ resourceType: "total", budget: 1000 }
				],
				resourceCounts: [
					{ resourceType: "third-party", budget: 15 },
					{ resourceType: "script", budget: 20 },
					{ resourceType: "stylesheet", budget: 5 },
					{ resourceType: "image", budget: 30 },
					{ resourceType: "font", budget: 6 },
					{ resourceType: "total", budget: 80 }
				],
				timings: [
					{ metric: "interactive", budget: 4000 },
					{ metric: "first-contentful-paint", budget: 2000 },
					{ metric: "largest-contentful-paint", budget: 2500 }
				]
			}
		]
	}
};
