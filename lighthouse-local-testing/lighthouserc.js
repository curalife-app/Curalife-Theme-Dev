module.exports = {
	ci: {
		collect: {
			url: ["https://curalife.com/"],
			numberOfRuns: 1,
			settings: {
				chromeFlags: "--no-sandbox --disable-dev-shm-usage --disable-gpu --headless --disable-features=IsolateOrigins",
				onlyCategories: ["performance", "accessibility", "best-practices", "seo", "pwa"],
				output: ["html", "json"],
				disableStorageReset: false,
				maxWaitForLoad: 60000
			}
		},
		upload: {
			target: "filesystem",
			outputDir: "./lighthouse-results"
		}
	}
};
