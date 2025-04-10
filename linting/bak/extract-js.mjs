import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get command line arguments
const args = process.argv.slice(2);
const filePath = args[0];

if (!filePath) {
	console.error("Please provide a file path");
	process.exit(1);
}

try {
	// Read the file
	const content = fs.readFileSync(filePath, "utf8");

	// Extract script tags using regex
	const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
	let match;
	let scriptContent = "";
	let index = 1;

	while ((match = scriptRegex.exec(content)) !== null) {
		let jsContent = match[1];

		// Replace Liquid tags with JavaScript comments
		jsContent = jsContent.replace(/{%.*?%}/g, "/* Liquid tag */");
		jsContent = jsContent.replace(/{{.*?}}/g, "/* Liquid output */");

		scriptContent += `// Script block ${index++}\n${jsContent}\n\n`;
	}

	if (!scriptContent) {
		console.log("No script blocks found");
		process.exit(0);
	}

	// Get directory and filename
	const dirname = path.dirname(filePath);
	const basename = path.basename(filePath);

	// Write to temporary file
	const tempFile = path.join(dirname, `_temp_${basename}.js`);
	fs.writeFileSync(tempFile, scriptContent);

	console.log(`JavaScript extracted to ${tempFile}`);
	console.log(`You can now run: npx eslint --config temp-eslint.config.js "${tempFile}"`);
} catch (error) {
	console.error("Error:", error.message);
	process.exit(1);
}
