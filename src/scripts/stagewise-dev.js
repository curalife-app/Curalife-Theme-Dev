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

	// Only exclude the actual Shopify theme editor/customizer (designMode)
	const isShopifyThemeEditor = window.Shopify && window.Shopify.designMode;

	console.log("🔍 Environment detection:", {
		hostname,
		port: window.location.port,
		isDev,
		isShopifyThemeEditor,
		shouldLoad: isDev && !isShopifyThemeEditor
	});

	// Show on development sites, but not in the theme editor
	return isDev && !isShopifyThemeEditor;
};

// Only initialize in development mode
if (isDevelopment()) {
	console.log("🎭 Loading stagewise toolbar...");

	// Load the stagewise CSS
	const link = document.createElement("link");
	link.rel = "stylesheet";
	link.href = '{{ "stagewise-toolbar.css" | asset_url }}';
	document.head.appendChild(link);

	// Load the stagewise JavaScript
	const script = document.createElement("script");
	script.src = '{{ "stagewise-toolbar.js" | asset_url }}';
	script.onload = () => {
		try {
			// Check if stagewise is available globally
			if (window.Stagewise && window.Stagewise.initToolbar) {
				// Basic stagewise configuration
				const stagewiseConfig = {
					plugins: [],
					// Add development-specific configuration
					debug: true,
					position: "top-right"
				};

				// Initialize the toolbar
				window.Stagewise.initToolbar(stagewiseConfig);
				console.log("🎭 Stagewise toolbar initialized for development");
			} else {
				console.warn("🎭 Stagewise toolbar not found in global scope");
			}
		} catch (error) {
			console.warn("Failed to initialize stagewise toolbar:", error);
		}
	};
	script.onerror = () => {
		console.warn("Failed to load stagewise toolbar script");
	};
	document.head.appendChild(script);
} else {
	console.log("🎭 Stagewise toolbar skipped (not in development mode)");
}
