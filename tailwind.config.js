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
		},
		extend: {
			keyframes: {
				"fade-in": {
					"0%": { opacity: "0", transform: "translateY(10px)" },
					"100%": { opacity: "1", transform: "translateY(0)" }
				}
			},
			animation: {
				"fade-in": "fade-in 0.3s ease-out forwards"
			},
			transitionProperty: {
				width: "width"
			}
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
