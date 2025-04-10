#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const args = process.argv.slice(2);
const filePath = args[0];

if (!filePath) {
	console.error("Please provide a path to a Liquid file");
	process.exit(1);
}

console.log(`Extracting and linting JavaScript from ${filePath}`);

try {
	// Read the file
	const content = fs.readFileSync(filePath, "utf8");

	// Extract script tags
	const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
	let match;
	let jsContent = "";
	let blockIndex = 1;

	while ((match = scriptRegex.exec(content)) !== null) {
		// Add header comment for this block
		jsContent += `// ===== SCRIPT BLOCK ${blockIndex++} =====\n\n/* eslint-disable */\n\n`;

		// Get script content and preprocess it
		let blockContent = match[1];

		// Replace Liquid tags with valid JavaScript vars
		blockContent = blockContent.replace(/{%.*?%}/g, "/* Liquid tag */");
		blockContent = blockContent.replace(/{{(.*?)}}/g, "/* Liquid: $1 */");

		// Add the processed content
		jsContent += blockContent + "\n\n/* eslint-enable */\n\n";
	}

	if (!jsContent) {
		console.log("No JavaScript found in the file");
		process.exit(0);
	}

	// Create output file
	const dirname = path.dirname(filePath);
	const basename = path.basename(filePath);
	const tempFile = path.join(dirname, `_lint_${basename}.js`);

	// Write JS to temp file
	fs.writeFileSync(tempFile, jsContent);
	console.log(`Extracted JavaScript to: ${tempFile}`);

	// Run eslint with flat config
	console.log(`Running ESLint...`);
	const eslintCommand = `npx eslint "${tempFile}" --fix`;

	try {
		const output = execSync(eslintCommand, { encoding: "utf8" });
		console.log("ESLint completed successfully!");

		if (output.trim()) {
			console.log("Output:", output);
		}

		console.log(`Hint: To manually lint, run: ${eslintCommand}`);
		console.log("No syntax errors found!");
	} catch (error) {
		console.log("ESLint found issues:");
		console.log(error.stdout || error.message);
		console.log(`Fix the issues and run: ${eslintCommand}`);
	}
} catch (error) {
	console.error("Error:", error.message);
	process.exit(1);
}
