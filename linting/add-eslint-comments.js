import fs from "fs";
import path from "path";

const filePath = process.argv[2];

if (!filePath) {
	console.error("Please provide a file path");
	process.exit(1);
}

// Read the file content
const content = fs.readFileSync(filePath, "utf8");

// Find <script> tags and add ESLint disable comments
const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/g;
let modifiedContent = content;
let match;
let offset = 0;

while ((match = scriptRegex.exec(content)) !== null) {
	// Skip script tags with src attributes
	if (match[0].match(/src\s*=\s*["'][^"']*["']/)) {
		continue;
	}

	const fullMatch = match[0];
	const scriptContent = match[1];
	const matchIndex = match.index + offset;

	// Check if the script contains Liquid tags
	const hasLiquidTags = /{{.*?}}|{%.*?%}/.test(scriptContent);

	if (hasLiquidTags) {
		// Create a replacement with ESLint disable comments
		const replacement = `<script>
/* eslint-disable */
${scriptContent}
/* eslint-enable */
</script>`;

		// Replace the original script tag with the new one
		modifiedContent = modifiedContent.substring(0, matchIndex) + replacement + modifiedContent.substring(matchIndex + fullMatch.length);

		// Adjust the offset for subsequent matches
		offset += replacement.length - fullMatch.length;
	}
}

// Write the modified content back to the file
fs.writeFileSync(filePath, modifiedContent, "utf8");

console.log(`Added ESLint disable comments to ${filePath}`);
