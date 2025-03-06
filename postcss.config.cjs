module.exports = {
	plugins: {
		"@tailwindcss/postcss": {
			config: "./tailwind.config.js"
		},
		autoprefixer: {},
		...(process.env.NODE_ENV === "production"
			? {
					cssnano: {
						preset: [
							"default",
							{
								discardComments: {
									removeAll: true
								},
								normalizeWhitespace: false
							}
						]
					}
				}
			: {})
	}
};
