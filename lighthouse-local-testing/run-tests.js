require("dotenv").config();
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const util = require("util");
const execPromise = util.promisify(exec);

// Create results directory if it doesn't exist
const desktopResultsDir = path.join(__dirname, "lighthouse-results", "desktop");
const mobileResultsDir = path.join(__dirname, "lighthouse-results", "mobile");

if (!fs.existsSync(desktopResultsDir)) {
	fs.mkdirSync(desktopResultsDir, { recursive: true });
}
if (!fs.existsSync(mobileResultsDir)) {
	fs.mkdirSync(mobileResultsDir, { recursive: true });
}

const testUrls = [
	{ name: "homepage", url: "https://curalife.com/" },
	{ name: "product", url: "https://curalife.com/products/curalin" }
];

async function runLighthouseTest(url, formFactor, resultsDir) {
	const preset = formFactor === "desktop" ? "desktop" : "mobile";
	const cpuSlowdown = formFactor === "desktop" ? 2 : 4;
	const screenEmulation =
		formFactor === "desktop"
			? ""
			: "--collect.settings.screenEmulation.mobile=true --collect.settings.screenEmulation.width=360 --collect.settings.screenEmulation.height=640 --collect.settings.screenEmulation.deviceScaleFactor=2.625";

	const userAgent =
		formFactor === "desktop"
			? "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
			: "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

	const command = `npx lhci autorun \
    --collect.url=${url} \
    --collect.numberOfRuns=1 \
    --collect.settings.preset=${preset} \
    --collect.settings.chromeFlags="--no-sandbox --disable-dev-shm-usage --disable-gpu --headless --disable-features=IsolateOrigins" \
    --collect.settings.formFactor=${formFactor} \
    --collect.settings.throttling.cpuSlowdownMultiplier=${cpuSlowdown} \
    ${screenEmulation} \
    --collect.settings.emulatedUserAgent="${userAgent}" \
    --collect.settings.onlyCategories="performance,accessibility,best-practices,seo,pwa" \
    --collect.settings.output="html,json" \
    --collect.settings.disableStorageReset=false \
    --collect.settings.maxWaitForLoad=120000 \
    --upload.target=filesystem \
    --upload.outputDir=${resultsDir}`;

	console.log(`Running ${formFactor} Lighthouse test for ${url}...`);
	try {
		const { stdout, stderr } = await execPromise(command);
		console.log(stdout);
		if (stderr) console.error(stderr);
		console.log(`${formFactor} test completed for ${url}`);
		return true;
	} catch (error) {
		console.error(`Error running ${formFactor} test:`, error.message);
		return false;
	}
}

async function processResults(pageName, desktopDir, mobileDir) {
	console.log(`Processing results for ${pageName}...`);

	// Find the latest desktop and mobile JSON results
	const desktopJsons = fs.readdirSync(desktopDir).filter(file => file.endsWith(".json"));
	const mobileJsons = fs.readdirSync(mobileDir).filter(file => file.endsWith(".json"));

	if (desktopJsons.length === 0 || mobileJsons.length === 0) {
		console.log("Missing test results. Cannot process.");
		return;
	}

	const desktopJson = path.join(desktopDir, desktopJsons[0]);
	const mobileJson = path.join(mobileDir, mobileJsons[0]);

	// Read and parse JSON files
	const desktopData = JSON.parse(fs.readFileSync(desktopJson, "utf8"));
	const mobileData = JSON.parse(fs.readFileSync(mobileJson, "utf8"));

	// Extract scores
	const scores = {
		desktop: {
			performance: Math.round(desktopData.categories.performance.score * 100),
			accessibility: Math.round(desktopData.categories.accessibility.score * 100),
			bestPractices: Math.round(desktopData.categories["best-practices"].score * 100),
			seo: Math.round(desktopData.categories.seo.score * 100),
			pwa: Math.round((desktopData.categories.pwa?.score || 0) * 100)
		},
		mobile: {
			performance: Math.round(mobileData.categories.performance.score * 100),
			accessibility: Math.round(mobileData.categories.accessibility.score * 100),
			bestPractices: Math.round(mobileData.categories["best-practices"].score * 100),
			seo: Math.round(mobileData.categories.seo.score * 100),
			pwa: Math.round((mobileData.categories.pwa?.score || 0) * 100)
		}
	};

	// Print scores in a table
	console.log(`\n----- ${pageName.toUpperCase()} RESULTS -----`);
	console.log("Category       | Desktop | Mobile");
	console.log("---------------|---------|-------");
	console.log(`Performance    | ${scores.desktop.performance.toString().padStart(7)}% | ${scores.mobile.performance.toString().padStart(5)}%`);
	console.log(`Accessibility  | ${scores.desktop.accessibility.toString().padStart(7)}% | ${scores.mobile.accessibility.toString().padStart(5)}%`);
	console.log(`Best Practices | ${scores.desktop.bestPractices.toString().padStart(7)}% | ${scores.mobile.bestPractices.toString().padStart(5)}%`);
	console.log(`SEO            | ${scores.desktop.seo.toString().padStart(7)}% | ${scores.mobile.seo.toString().padStart(5)}%`);
	console.log(`PWA            | ${scores.desktop.pwa.toString().padStart(7)}% | ${scores.mobile.pwa.toString().padStart(5)}%`);
	console.log("-----------------------------\n");

	return scores;
}

async function runAllTests() {
	for (const test of testUrls) {
		const currentDesktopDir = path.join(desktopResultsDir, test.name);
		const currentMobileDir = path.join(mobileResultsDir, test.name);

		fs.mkdirSync(currentDesktopDir, { recursive: true });
		fs.mkdirSync(currentMobileDir, { recursive: true });

		console.log(`\n=== Starting tests for ${test.name}: ${test.url} ===\n`);

		// Run desktop test
		await runLighthouseTest(test.url, "desktop", currentDesktopDir);

		// Run mobile test
		await runLighthouseTest(test.url, "mobile", currentMobileDir);

		// Process the results
		await processResults(test.name, currentDesktopDir, currentMobileDir);
	}

	console.log("\n=== All tests completed ===");
	console.log(`Results saved to: ${path.resolve("lighthouse-results")}`);
}

// Run the tests
runAllTests().catch(error => {
	console.error("Error running tests:", error);
	process.exit(1);
});
