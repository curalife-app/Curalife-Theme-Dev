/** @type {import('tailwindcss').Config} */
export default {
	// Content array no longer needed in v4 as it automatically detects files

	// Only keeping minimal JavaScript configuration for backward compatibility
	theme: {
		screens: {
			sm: { max: "640px" },
			md: { max: "768px" },
			lg: { max: "1024px" },
			xl: { max: "1200px" },
			mbl: { max: "768px" },
			dsk: { min: "768px" }
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
