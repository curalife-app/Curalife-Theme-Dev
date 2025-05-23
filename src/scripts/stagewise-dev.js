/**
 * Stagewise Development Toolbar
 *
 * This script initializes the stagewise toolbar for AI-powered editing capabilities
 * Only runs in development mode to avoid inclusion in production builds
 */

// Enhanced development environment detection
const isDevelopment = () => {
	// Check for common development indicators
	const hostname = window.location.hostname;
	const isDev =
		hostname === "localhost" || hostname.includes("127.0.0.1") || hostname.includes(".ngrok.") || hostname.includes("shopify.dev") || hostname.includes(".local") || window.location.port !== "";

	// Also check for Shopify development indicators
	const isShopifyDev = window.Shopify && window.Shopify.designMode;

	return isDev && !isShopifyDev; // Don't load in Shopify theme editor
};

// Only initialize in development mode
if (isDevelopment()) {
	// Dynamic import to ensure this is not bundled in production
	import("@stagewise/toolbar")
		.then(({ initToolbar }) => {
			// Basic stagewise configuration
			const stagewiseConfig = {
				plugins: [],
				// Add development-specific configuration
				debug: true,
				position: "top-right"
			};

			// Initialize the toolbar
			initToolbar(stagewiseConfig);

			console.log("🎭 Stagewise toolbar initialized for development");
		})
		.catch(error => {
			// Silently fail if stagewise is not available (e.g., in production)
			if (isDevelopment()) {
				console.warn("Failed to initialize stagewise toolbar:", error);
			}
		});
} else {
	console.log("🎭 Stagewise toolbar skipped (not in development mode)");
}
