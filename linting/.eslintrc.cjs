module.exports = {
	env: {
		browser: true,
		es2020: true
	},
	extends: ["eslint:recommended", "plugin:@shopify/esnext"],
	plugins: ["@shopify"],
	parserOptions: {
		ecmaVersion: 2020,
		sourceType: "module"
	},
	globals: {
		// Shopify-specific globals
		Shopify: "readonly",
		ShopifyAPI: "readonly",
		CartCache: "readonly",
		BuyBoxState: "readonly",
		DOMUtils: "readonly",
		SID: "readonly",
		// Additional globals often used in Shopify templates
		window: "readonly",
		document: "readonly",
		requestAnimationFrame: "readonly",
		setTimeout: "readonly",
		clearInterval: "readonly",
		setInterval: "readonly",
		console: "readonly",
		fetch: "readonly"
	},
	rules: {
		"no-unused-vars": "warn",
		"no-undef": "warn",
		"no-console": "off"
	},
	overrides: [
		{
			files: ["**/*.liquid"],
			processor: "@shopify/liquid",
			extends: ["plugin:@shopify/liquid"],
			rules: {
				"@shopify/liquid/no-javascript-in-liquid": "off",
				// Disable rules that cause issues with Liquid syntax in JavaScript
				"no-undef": "off",
				// Relaxed parsing for template-specific code
				"no-template-curly-in-string": "off",
				// Disable rules that don't work well with Liquid-injected variables
				"no-unused-vars": "off"
			}
		}
	]
};
