import fs from "fs";
import path from "path";

// Patterns to look for in JavaScript
const patterns = [
	{
		name: "Liquid variables in JavaScript",
		regex: /{{.*?}}/g,
		recommendation: "Use proper JavaScript syntax or ensure Liquid variables are properly wrapped"
	},
	{
		name: "Liquid control flow in JavaScript",
		regex: /{%.*?%}/g,
		recommendation: "Consider moving Liquid control flow outside of JavaScript if possible"
	},
	{
		name: "Undefined variables",
		regex: /\b(productId|variantId|submitButton|oneTimeButton|frequencySelector|buyType|productActions|submitSellingPlanId|submitVariantId|purchaseOptionBoxes)\b/g,
		recommendation: "Make sure these variables are defined before use"
	}
];

// Get file path from command-line argument
const filePath = process.argv[2];

if (!filePath) {
	console.error("Please provide a file path");
	process.exit(1);
}

// Read file
const content = fs.readFileSync(filePath, "utf8");

// Extract JavaScript from <script> tags
const scriptRegex = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g;

let match;
let scriptIndex = 0;
let issues = [];

console.log("=== Analyzing JavaScript in Liquid file ===\n");

while ((match = scriptRegex.exec(content)) !== null) {
	const scriptContent = match[1].trim();

	if (scriptContent) {
		console.log(`--- Script block #${++scriptIndex} ---`);

		// Check for issues
		patterns.forEach(pattern => {
			const matches = [...scriptContent.matchAll(pattern.regex)];

			if (matches.length > 0) {
				matches.forEach(m => {
					const lineNumber = scriptContent.substring(0, m.index).split("\n").length;
					const line = scriptContent.split("\n")[lineNumber - 1].trim();

					issues.push({
						type: pattern.name,
						match: m[0],
						line: lineNumber + match.index,
						lineContent: line,
						recommendation: pattern.recommendation
					});

					console.log(`  [${pattern.name}] Line ${lineNumber}: ${m[0]}`);
					console.log(`    → Found in: ${line}`);
					console.log(`    → Recommendation: ${pattern.recommendation}\n`);
				});
			}
		});

		// Look for potential JavaScript errors
		try {
			// Attempt to transform Liquid syntax to make it valid JS for parsing
			const transformedContent = scriptContent
				.replace(/{%.*?%}/g, "/* Liquid control flow */")
				.replace(/{{.*?}}/g, '"LIQUID_VAR"')
				.replace(/\b(SID)\b/g, '"SID"');

			// Check for basic syntax errors
			try {
				new Function(transformedContent);
			} catch (syntaxError) {
				console.log(`  [JavaScript Syntax Error] ${syntaxError.message}`);

				// Try to find the line with the error
				const errorMatch = syntaxError.message.match(/at line (\d+)/);
				if (errorMatch) {
					const errorLine = parseInt(errorMatch[1], 10);
					const lines = scriptContent.split("\n");

					if (lines[errorLine - 1]) {
						console.log(`    → Problem might be in this line: ${lines[errorLine - 1].trim()}`);
						console.log("    → Recommendation: Check for JavaScript syntax errors\n");
					}
				}
			}
		} catch (e) {
			// Ignore transformation errors
		}
	}
}

// Extract inline JavaScript from attributes
const inlineJsRegex = /\s(on\w+)="([^"]*?)"/g;
let inlineMatch;
let inlineIndex = 0;

console.log("\n=== Analyzing inline JavaScript ===\n");

while ((inlineMatch = inlineJsRegex.exec(content)) !== null) {
	const eventType = inlineMatch[1];
	const jsContent = inlineMatch[2].trim();

	console.log(`--- ${eventType} #${++inlineIndex} ---`);

	// Check for Liquid syntax in inline JavaScript
	patterns.forEach(pattern => {
		const matches = [...jsContent.matchAll(pattern.regex)];

		if (matches.length > 0) {
			matches.forEach(m => {
				issues.push({
					type: pattern.name,
					match: m[0],
					lineContent: jsContent,
					recommendation: pattern.recommendation
				});

				console.log(`  [${pattern.name}]: ${m[0]}`);
				console.log(`    → Found in: ${jsContent}`);
				console.log(`    → Recommendation: ${pattern.recommendation}\n`);
			});
		}
	});
}

// Summarize issues
console.log("\n=== Summary ===\n");
console.log(`Found ${issues.length} potential issues:\n`);

const issueTypes = {};
issues.forEach(issue => {
	issueTypes[issue.type] = (issueTypes[issue.type] || 0) + 1;
});

Object.keys(issueTypes).forEach(type => {
	console.log(`- ${type}: ${issueTypes[type]} occurrences`);
});

console.log("\nRecommendations:");
console.log('1. Use JavaScript string concatenation for Liquid variables: `const id = "{{ product.id }}";`');
console.log("2. Move Liquid control flow outside JavaScript when possible");
console.log("3. Define all variables at the top of your script block");
console.log("4. Check for proper scoping of variables");
