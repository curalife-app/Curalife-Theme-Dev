module.exports = {
	root: true,
	env: {
		browser: true,
		es6: true
	},
	extends: "eslint:recommended",
	parserOptions: {
		ecmaVersion: 2020
	},
	plugins: ["html"],
	settings: {
		"html/html-extensions": [".html", ".liquid"],
		"html/report-bad-indent": "error"
	},
	rules: {
		"no-unused-vars": "warn",
		"no-undef": "warn"
	}
};
