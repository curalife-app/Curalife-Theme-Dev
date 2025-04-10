import fs from "fs";
import path from "path";

const filePath = process.argv[2];

if (!filePath) {
	console.error("Please provide a file path");
	process.exit(1);
}

const content = fs.readFileSync(filePath, "utf8");

// Extract JavaScript from <script> tags
const scriptRegex = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g;
let match;
let scriptIndex = 0;

console.log("=== Extracted JavaScript from Liquid file ===\n");

while ((match = scriptRegex.exec(content)) !== null) {
	const scriptContent = match[1].trim();

	if (scriptContent) {
		console.log(`--- Script block #${++scriptIndex} ---`);
		console.log(scriptContent);
		console.log("\n");

		// Save to a temporary file for analysis
		const tempFilePath = `temp-script-${scriptIndex}.js`;
		fs.writeFileSync(tempFilePath, scriptContent, "utf8");
		console.log(`Saved to ${tempFilePath}`);
	}
}

// Extract JavaScript from onclick and other inline attributes
const inlineJsRegex = /\s(on\w+)="([^"]*?)"/g;
let inlineMatch;
let inlineIndex = 0;

console.log("\n=== Extracted inline JavaScript ===\n");

while ((inlineMatch = inlineJsRegex.exec(content)) !== null) {
	const eventType = inlineMatch[1];
	const jsContent = inlineMatch[2].trim();

	console.log(`--- ${eventType} #${++inlineIndex} ---`);
	console.log(jsContent);
	console.log("\n");
}
