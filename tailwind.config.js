/** @type {import('tailwindcss').Config} */
export default {
	// Content array for JIT optimization - added precise paths for better performance
	content: [
		"./src/liquid/**/*.liquid",
		"./src/scripts/**/*.js",
		"./src/styles/**/*.css",
		"./Curalife-Theme-Build/**/*.liquid", // Include build folder for hot reload
		"./src/**/*.{html,js,liquid}"
	],

	// Safelist for dynamic classes that might not be detected
	safelist: [
		// Animation classes that might be added dynamically
		"fade-in",
		"animate-fade-in",
		// Common utility patterns
		{
			pattern: /^(bg|text|border)-(brand|curalin|curaslim|curapress)-(50|100|200|300|400|500|600|700|800|900|950)$/
		},
		{
			pattern: /^(p|m|px|py|mx|my)-(0|1|2|3|4|5|6|8|10|12|16|20|24|32)$/
		},
		// Responsive variants
		{
			pattern: /^(sm|md|lg|xl|mbl|dsk):(.*)/
		}
	],

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
