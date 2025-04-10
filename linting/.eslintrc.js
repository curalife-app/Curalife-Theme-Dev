export default {
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
		SID: "readonly"
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
				"@shopify/liquid/no-javascript-in-liquid": "off"
			}
		}
	]
};
