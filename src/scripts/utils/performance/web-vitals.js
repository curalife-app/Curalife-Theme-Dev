/**
 * Web Vitals Tracking Module
 *
 * This module handles the collection and reporting of Core Web Vitals metrics.
 * It uses the web-vitals library to measure important performance metrics
 * and reports them to our custom analytics endpoint.
 */

// Function to initialize the Web Vitals tracking
export function initWebVitals() {
	// Import the web-vitals library dynamically to avoid affecting initial page load
	// Only load it after the page is fully loaded
	if (document.readyState === "complete") {
		importAndInitVitals();
	} else {
		window.addEventListener("load", importAndInitVitals);
	}
}

// Import and initialize the web-vitals library
function importAndInitVitals() {
	// Create script element
	const script = document.createElement("script");
	script.src = "https://unpkg.com/web-vitals@3/dist/web-vitals.iife.js";
	script.onload = () => {
		// Once loaded, begin monitoring the Core Web Vitals
		if (window.webVitals) {
			// First Contentful Paint
			window.webVitals.getFCP(sendToAnalytics);

			// Largest Contentful Paint
			window.webVitals.getLCP(sendToAnalytics);

			// First Input Delay
			window.webVitals.getFID(sendToAnalytics);

			// Cumulative Layout Shift
			window.webVitals.getCLS(sendToAnalytics);

			// Time to Interactive (approximation using TTFBa)
			window.webVitals.getTTFB(sendToAnalytics);

			// Interaction to Next Paint
			window.webVitals.getINP(sendToAnalytics);
		}
	};

	// Append to document to start loading
	document.body.appendChild(script);
}

// Report the metrics to our analytics endpoint
function sendToAnalytics(metric) {
	// Get basic page information
	const pageUrl = window.location.href;
	const pagePath = window.location.pathname;
	const pageTemplate = document.documentElement.getAttribute("data-template") || "unknown";

	// Create the data payload
	const data = {
		name: metric.name,
		value: metric.value,
		rating: metric.rating, // 'good', 'needs-improvement', or 'poor'
		delta: metric.delta,
		id: metric.id,
		page: {
			url: pageUrl,
			path: pagePath,
			template: pageTemplate
		},
		timestamp: new Date().toISOString(),
		userAgent: navigator.userAgent,
		// Include shop information if available
		shop: window.Shopify ? window.Shopify.shop : undefined
	};

	// Log to console in development
	if (process.env.NODE_ENV === "development") {
		console.log("[Web Vitals]", metric.name, metric.value, metric.rating);
		// Also store in localStorage for the dashboard
		storeMetricLocally(data);
	}

	// Send to our analytics endpoint
	// This is where you would normally send to your analytics service
	// For now, we'll just store it locally
	storeMetricLocally(data);

	// If you have a real endpoint, uncomment this:
	/*
  try {
    fetch('/api/performance-metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      // Use keepalive to ensure the request completes even if the page unloads
      keepalive: true
    });
  } catch (error) {
    console.error('Failed to send web vitals:', error);
  }
  */
}

// Store the metric in localStorage for the dashboard
function storeMetricLocally(data) {
	try {
		// Get existing metrics or initialize an empty array
		const existingMetrics = JSON.parse(localStorage.getItem("curalife_web_vitals") || "[]");

		// Add the new metric
		existingMetrics.push(data);

		// Limit array size to prevent localStorage from getting too large
		// Keep the most recent 100 entries
		const limitedMetrics = existingMetrics.slice(-100);

		// Store back to localStorage
		localStorage.setItem("curalife_web_vitals", JSON.stringify(limitedMetrics));
	} catch (error) {
		console.error("Failed to store web vitals locally:", error);
	}
}

// Export a function to get the stored metrics
export function getStoredMetrics() {
	try {
		return JSON.parse(localStorage.getItem("curalife_web_vitals") || "[]");
	} catch {
		return [];
	}
}

// Export a function to clear stored metrics
export function clearStoredMetrics() {
	localStorage.removeItem("curalife_web_vitals");
}
