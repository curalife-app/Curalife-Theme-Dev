const fs = require("fs");
const path = require("path");

function generateReport() {
	const resultsDir = path.join(__dirname, "lighthouse-results");
	const reportDate = new Date().toISOString().split("T")[0];
	const reportDir = path.join(__dirname, "performance-reports", reportDate);

	// Create the reports directory
	fs.mkdirSync(reportDir, { recursive: true });

	// Create the main index.html file
	const indexPath = path.join(__dirname, "performance-reports", "index.html");

	// Parse test results
	const testResults = {};
	const testUrls = [
		{ name: "homepage", url: "https://curalife.com/" },
		{ name: "product", url: "https://curalife.com/products/curalin" }
	];

	for (const test of testUrls) {
		const desktopPath = path.join(resultsDir, "desktop", test.name);
		const mobilePath = path.join(resultsDir, "mobile", test.name);

		if (!fs.existsSync(desktopPath) || !fs.existsSync(mobilePath)) {
			console.log(`Missing results for ${test.name}, skipping...`);
			continue;
		}

		// Create page directory in report
		const pageReportDir = path.join(reportDir, test.name);
		fs.mkdirSync(pageReportDir, { recursive: true });

		// Find the latest JSON files
		const desktopJsonFiles = fs.readdirSync(desktopPath).filter(file => file.endsWith(".json"));
		const mobileJsonFiles = fs.readdirSync(mobilePath).filter(file => file.endsWith(".json"));

		if (desktopJsonFiles.length === 0 || mobileJsonFiles.length === 0) {
			console.log(`Missing JSON files for ${test.name}, skipping...`);
			continue;
		}

		const desktopJson = path.join(desktopPath, desktopJsonFiles[0]);
		const mobileJson = path.join(mobilePath, mobileJsonFiles[0]);

		// Read and parse data
		const desktopData = JSON.parse(fs.readFileSync(desktopJson, "utf8"));
		const mobileData = JSON.parse(fs.readFileSync(mobileJson, "utf8"));

		// Extract scores and create HTML reports
		const desktopScores = {
			performance: Math.round(desktopData.categories.performance.score * 100),
			accessibility: Math.round(desktopData.categories.accessibility.score * 100),
			bestPractices: Math.round(desktopData.categories["best-practices"].score * 100),
			seo: Math.round(desktopData.categories.seo.score * 100),
			pwa: Math.round((desktopData.categories.pwa?.score || 0) * 100)
		};

		const mobileScores = {
			performance: Math.round(mobileData.categories.performance.score * 100),
			accessibility: Math.round(mobileData.categories.accessibility.score * 100),
			bestPractices: Math.round(mobileData.categories["best-practices"].score * 100),
			seo: Math.round(mobileData.categories.seo.score * 100),
			pwa: Math.round((mobileData.categories.pwa?.score || 0) * 100)
		};

		testResults[test.name] = {
			url: test.url,
			desktop: desktopScores,
			mobile: mobileScores
		};

		// Generate the desktop.html report
		const desktopHtml = generateDeviceReport(test.name, "desktop", desktopScores, test.url);
		fs.writeFileSync(path.join(pageReportDir, "desktop.html"), desktopHtml);

		// Generate the mobile.html report
		const mobileHtml = generateDeviceReport(test.name, "mobile", mobileScores, test.url);
		fs.writeFileSync(path.join(pageReportDir, "mobile.html"), mobileHtml);

		// Find HTML reports and copy them if they exist
		const desktopHtmlFiles = fs.readdirSync(desktopPath).filter(file => file.endsWith(".report.html"));
		const mobileHtmlFiles = fs.readdirSync(mobilePath).filter(file => file.endsWith(".report.html"));

		if (desktopHtmlFiles.length > 0) {
			const desktopReportHtml = fs.readFileSync(path.join(desktopPath, desktopHtmlFiles[0]), "utf8");
			fs.writeFileSync(path.join(pageReportDir, "desktop-full.html"), desktopReportHtml);
		}

		if (mobileHtmlFiles.length > 0) {
			const mobileReportHtml = fs.readFileSync(path.join(mobilePath, mobileHtmlFiles[0]), "utf8");
			fs.writeFileSync(path.join(pageReportDir, "mobile-full.html"), mobileReportHtml);
		}
	}

	// Generate main index.html
	const mainHtml = generateMainDashboard(testResults, reportDate);
	fs.writeFileSync(indexPath, mainHtml);

	console.log(`Report generated at: ${indexPath}`);
	console.log(`Date-specific report at: ${reportDir}`);
}

function generateDeviceReport(pageName, device, scores, url) {
	const scoreClass = score => {
		if (score >= 90) return "good";
		if (score >= 50) return "average";
		return "poor";
	};

	return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${device.charAt(0).toUpperCase() + device.slice(1)} Lighthouse Report - ${pageName}</title>
    <style>
      body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
      h1, h2 { color: #2c3e50; }
      .card { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      .score { display: inline-block; padding: 10px; border-radius: 50%; width: 50px; height: 50px; text-align: center; line-height: 50px; font-weight: bold; color: white; margin-right: 15px; font-size: 20px; }
      .good { background-color: #0CCE6B; }
      .average { background-color: #FFA400; }
      .poor { background-color: #FF4E42; }
      .back-link { display: inline-block; margin-top: 20px; padding: 10px 15px; background-color: #4285f4; color: white; text-decoration: none; border-radius: 4px; }
      .score-container { display: flex; align-items: center; margin-bottom: 15px; }
      .score-title { margin: 0; font-size: 18px; }
    </style>
  </head>
  <body>
    <h1>${device.charAt(0).toUpperCase() + device.slice(1)} Lighthouse Report for ${pageName}</h1>
    <p>URL: <a href="${url}" target="_blank">${url}</a></p>
    <p>Generated on ${new Date().toLocaleDateString()} via local testing</p>

    <div class="card">
      <h2>Performance Scores</h2>

      <div class="score-container">
        <div class="score ${scoreClass(scores.performance)}">${scores.performance}</div>
        <h3 class="score-title">Performance</h3>
      </div>

      <div class="score-container">
        <div class="score ${scoreClass(scores.accessibility)}">${scores.accessibility}</div>
        <h3 class="score-title">Accessibility</h3>
      </div>

      <div class="score-container">
        <div class="score ${scoreClass(scores.bestPractices)}">${scores.bestPractices}</div>
        <h3 class="score-title">Best Practices</h3>
      </div>

      <div class="score-container">
        <div class="score ${scoreClass(scores.seo)}">${scores.seo}</div>
        <h3 class="score-title">SEO</h3>
      </div>

      <div class="score-container">
        <div class="score ${scoreClass(scores.pwa)}">${scores.pwa}</div>
        <h3 class="score-title">PWA</h3>
      </div>
    </div>

    <a href="../../../index.html" class="back-link">Back to Dashboard</a>
  </body>
  </html>`;
}

function generateMainDashboard(results, reportDate) {
	const scoreClass = score => {
		if (score >= 90) return "good";
		if (score >= 50) return "average";
		return "poor";
	};

	let pagesHtml = "";

	for (const [page, data] of Object.entries(results)) {
		pagesHtml += `
      <div class="page-card">
        <h2>${page.charAt(0).toUpperCase() + page.slice(1)}</h2>
        <p>URL: <a href="${data.url}" target="_blank">${data.url}</a></p>

        <h3>Desktop Scores</h3>
        <div class="scores-container">
          <div class="score-item">
            <div class="score ${scoreClass(data.desktop.performance)}">${data.desktop.performance}</div>
            <div class="score-label">Performance</div>
          </div>
          <div class="score-item">
            <div class="score ${scoreClass(data.desktop.accessibility)}">${data.desktop.accessibility}</div>
            <div class="score-label">Accessibility</div>
          </div>
          <div class="score-item">
            <div class="score ${scoreClass(data.desktop.bestPractices)}">${data.desktop.bestPractices}</div>
            <div class="score-label">Best Practices</div>
          </div>
          <div class="score-item">
            <div class="score ${scoreClass(data.desktop.seo)}">${data.desktop.seo}</div>
            <div class="score-label">SEO</div>
          </div>
        </div>
        <a href="./${reportDate}/${page}/desktop.html" class="view-link">View Desktop Report</a>

        <h3>Mobile Scores</h3>
        <div class="scores-container">
          <div class="score-item">
            <div class="score ${scoreClass(data.mobile.performance)}">${data.mobile.performance}</div>
            <div class="score-label">Performance</div>
          </div>
          <div class="score-item">
            <div class="score ${scoreClass(data.mobile.accessibility)}">${data.mobile.accessibility}</div>
            <div class="score-label">Accessibility</div>
          </div>
          <div class="score-item">
            <div class="score ${scoreClass(data.mobile.bestPractices)}">${data.mobile.bestPractices}</div>
            <div class="score-label">Best Practices</div>
          </div>
          <div class="score-item">
            <div class="score ${scoreClass(data.mobile.seo)}">${data.mobile.seo}</div>
            <div class="score-label">SEO</div>
          </div>
        </div>
        <a href="./${reportDate}/${page}/mobile.html" class="view-link">View Mobile Report</a>
      </div>
    `;
	}

	return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lighthouse Performance Dashboard</title>
    <style>
      body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
      h1, h2, h3 { color: #2c3e50; }
      .page-card { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      .scores-container { display: flex; flex-wrap: wrap; gap: 15px; margin: 15px 0; }
      .score-item { display: flex; flex-direction: column; align-items: center; }
      .score { display: flex; justify-content: center; align-items: center; border-radius: 50%; width: 60px; height: 60px; font-weight: bold; color: white; font-size: 24px; }
      .score-label { margin-top: 5px; font-size: 14px; }
      .good { background-color: #0CCE6B; }
      .average { background-color: #FFA400; }
      .poor { background-color: #FF4E42; }
      .view-link { display: inline-block; margin: 10px 0 20px; padding: 8px 15px; background-color: #4285f4; color: white; text-decoration: none; border-radius: 4px; }
      .date-info { color: #666; margin-bottom: 20px; }
    </style>
  </head>
  <body>
    <h1>Lighthouse Performance Dashboard</h1>
    <p class="date-info">Last updated: ${new Date().toLocaleString()}</p>

    ${pagesHtml}
  </body>
  </html>`;
}

// Run the report generation
generateReport();
