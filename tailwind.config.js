/** @type {import('tailwindcss').Config} */
export default {
	// Content array no longer needed in v4 as it automatically detects files

	// Only keeping minimal JavaScript configuration for backward compatibility
	theme: {
		// Empty base theme since we're defining everything in CSS
		extend: {
			// Extensions that need to stay in JS for compatibility
		}
	},

	// Core configuration options
	corePlugins: {
		container: false // Disabling built-in container in favor of @container queries
	},

	// Modern options
	future: {
		hoverOnlyWhenSupported: true
	},

	experimental: {
		optimizeUniversalDefaults: true
	}
};
