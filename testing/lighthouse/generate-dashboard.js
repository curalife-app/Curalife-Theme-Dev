import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import ejs from "ejs";
import { fileURLToPath } from "url";

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
	// Create output directory
	const outputDir = "performance-reports";
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	// Find all HTML report files
	let reportFiles = [];
	try {
		const findCmd = "find lighthouse-artifacts -type f -name '*.html'";
		const findOutput = execSync(findCmd).toString().trim();
		if (findOutput) {
			reportFiles = findOutput.split("\n").filter(Boolean);
		}
	} catch (error) {
		console.error("Error finding HTML files:", error);
		fs.writeFileSync(path.join(outputDir, "error.txt"), `Error finding HTML files: ${error.message}\n${error.stack}`);
	}

	// Log found files
	console.log(`Found ${reportFiles.length} report files`);

	// Save file list for debugging
	fs.writeFileSync(path.join(outputDir, "report-files.txt"), reportFiles.join("\n") || "No files found");

	// Create a basic dashboard even if no reports are found
	fs.writeFileSync(path.join(outputDir, "file-structure.txt"), execSync("find . -type f | sort").toString());

	// Process the reports
	const reports = reportFiles.map(reportPath => {
		const filename = path.basename(reportPath);

		try {
			// Copy file to output directory
			fs.copyFileSync(reportPath, path.join(outputDir, filename));
		} catch (error) {
			console.error(`Error copying file ${reportPath}:`, error);
		}

		// Determine page and device from filename or path
		let device = "Unknown";
		let page = "Unknown";

		if (reportPath.includes("desktop")) {
			device = "Desktop";
		} else if (reportPath.includes("mobile")) {
			device = "Mobile";
		}

		if (reportPath.includes("homepage")) {
			page = "Homepage";
		} else if (reportPath.includes("product")) {
			page = "Product Page";
		}

		return {
			page,
			device,
			filename,
			originalPath: reportPath
		};
	});

	// Sort reports for better display
	reports.sort((a, b) => {
		if (a.page === b.page) return a.device.localeCompare(b.device);
		return a.page.localeCompare(b.page);
	});

	// EJS template for the dashboard
	const template = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lighthouse Performance Dashboard - Curalife</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; max-width: 1200px; margin: 0 auto; padding: 20px; }
      h1, h2 { color: #333; }
      .report-card { border: 1px solid #eee; padding: 15px; margin-bottom: 15px; border-radius: 5px; }
      .report-card h3 { margin-top: 0; }
      .timestamp { color: #666; font-size: 0.9em; margin-bottom: 30px; }
      .debug-info { background: #f5f5f5; padding: 10px; border-radius: 5px; margin-top: 30px; font-size: 0.9em; }
      .debug-info ul { max-height: 200px; overflow-y: auto; }
    </style>
  </head>
  <body>
    <h1>Lighthouse Performance Dashboard</h1>
    <p class="timestamp">Generated on <%= new Date().toUTCString() %></p>

    <h2>Latest Reports</h2>
    <div id="reports">
      <% if (reports.length === 0) { %>
        <p>No reports available yet. Check the debug information below.</p>
      <% } else { %>
        <% reports.forEach(report => { %>
          <div class="report-card">
            <h3><%= report.page %> (<%= report.device %>)</h3>
            <a class="report-link" href="./<%= report.filename %>" target="_blank">View Full Report</a>
            <p class="original-path">Original path: <%= report.originalPath %></p>
          </div>
        <% }); %>
      <% } %>
    </div>

    <div class="debug-info">
      <h3>Debug Information</h3>
      <p>Files found: <%= reportFiles.length %></p>
      <ul>
        <% reportFiles.forEach(file => { %>
          <li><%= file %></li>
        <% }); %>
      </ul>
    </div>
  </body>
  </html>
  `;

	// Render and save the dashboard
	const html = ejs.render(template, { reports, reportFiles });
	fs.writeFileSync(path.join(outputDir, "index.html"), html);

	// Create a placeholder file to ensure the directory is not empty
	if (reports.length === 0) {
		fs.writeFileSync(path.join(outputDir, "no-reports.html"), "<html><body><h1>No Lighthouse reports found</h1><p>Check the GitHub Actions logs for more information.</p></body></html>");
	}

	// List what was generated
	console.log("Files in performance-reports directory:");
	const generatedFiles = execSync(`find ${outputDir} -type f | sort`).toString();
	console.log(generatedFiles);
} catch (error) {
	console.error("Error generating dashboard:", error);
	// Create a minimal output in case of errors
	const outputDir = "performance-reports";
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}
	fs.writeFileSync(path.join(outputDir, "error.html"), `<html><body><h1>Error generating dashboard</h1><pre>${error.stack}</pre></body></html>`);
}
