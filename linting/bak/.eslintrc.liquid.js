export default {
	env: {
		browser: true,
		es2020: true
	},
	extends: ["eslint:recommended"],
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
		"no-unused-vars": "off",
		"no-undef": "off",
		"no-console": "off"
	},
	processor: "@shopify/liquid",
	overrides: [
		{
			files: ["**/*.liquid"],
			processor: "@shopify/liquid"
		}
	]
};
