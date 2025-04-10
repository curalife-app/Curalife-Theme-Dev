/**
 * Custom script to lint JavaScript in Liquid files
 */

import { ESLint } from "eslint";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { glob } from "glob";
import fs from "fs";
import path from "path";
import chalk from "chalk";

// Get the current file path and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");

// Get any command line arguments
const args = process.argv.slice(2);
const specificFile = args.length > 0 ? args[0] : null;

// Paths configuration
const liquidFilesGlob = specificFile || "src/liquid/**/*.liquid";
const ignoredPaths = ["**/node_modules/**", "dist/**", "build/**"];

// Create a temporary directory for extracted JS files
const tmpDir = path.resolve(process.cwd(), "tmp_eslint");
if (!fs.existsSync(tmpDir)) {
	fs.mkdirSync(tmpDir);
}

/**
 * Clean up Liquid tags in JavaScript code
 * This function replaces Liquid tags with safe JavaScript equivalents or comments
 */
function cleanLiquidTags(content) {
	// Handle Liquid comments
	content = content.replace(/{%\s*comment\s*%}[\s\S]*?{%\s*endcomment\s*%}/g, "/* Liquid comment */");

	// Handle Liquid output syntax ({{ variable }})
	content = content.replace(/{{(.*?)}}/g, "/* Liquid var */'placeholder'");

	// Handle Liquid if/else inside JS objects
	content = content.replace(/{%\s*if\s+.*?%}/g, "/* Liquid if */ {");
	content = content.replace(/{%\s*elsif\s+.*?%}/g, "} /* Liquid elsif */ {");
	content = content.replace(/{%\s*else\s*%}/g, "} /* Liquid else */ {");
	content = content.replace(/{%\s*endif\s*%}/g, "} /* Liquid endif */");

	// Handle Liquid for loops in JS objects - convert to valid JS array literals
	content = content.replace(/{%\s*for\s+.*?%}/g, "/* Liquid for */ [{ ");
	content = content.replace(/{%\s*endfor\s*%}/g, " }] /* Liquid endfor */");

	// Handle unless/endunless forloop.last pattern in arrays
	content = content.replace(/{%\s*unless\s+forloop\.last\s*%},\s*{%\s*endunless\s*%}/g, ",");

	// Handle Liquid assignments
	content = content.replace(/{%\s*assign\s+.*?%}/g, "// LIQUID: ASSIGN");

	// Handle Liquid capture
	content = content.replace(/{%\s*capture\s+.*?%}/g, "// LIQUID: CAPTURE");
	content = content.replace(/{%\s*endcapture\s*%}/g, "// LIQUID: ENDCAPTURE");

	// Handle any other Liquid tags
	content = content.replace(/{%.*?%}/g, "/* LIQUID TAG */");

	// Handle specific array access patterns that might cause syntax errors
	content = content.replace(/\[\s*\/\*\s*Liquid var\s*\*\/\s*""\s*\]/g, '["placeholder"]');
	content = content.replace(/\[\s*\/\*\s*Liquid var\s*\*\/\s*\]/g, '["placeholder"]');

	// Convert dashes in HTML identifiers that might cause JS parsing issues
	content = content.replace(/getElementById\(['"]([^'"]*-[^'"]*)['"]\)/g, (match, id) => {
		return `getElementById('${id.replace(/-/g, "_")}')`;
	});

	return content;
}

function extractJavaScriptFromLiquid(liquidFilePath) {
	const content = fs.readFileSync(liquidFilePath, "utf8");
	const scriptTags = [];
	const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;

	let match;
	while ((match = scriptRegex.exec(content)) !== null) {
		// Check if the script tag has a src attribute - if so, skip it
		const scriptTag = match[0];
		if (scriptTag.match(/src\s*=\s*["'][^"']*["']/)) {
			continue;
		}

		let jsContent = match[1];
		// Clean all Liquid syntax
		jsContent = cleanLiquidTags(jsContent);

		scriptTags.push({
			content: jsContent,
			startLine: getLineNumber(content, match.index)
		});
	}

	return scriptTags;
}

function getLineNumber(content, index) {
	const lines = content.substring(0, index).split("\n");
	return lines.length;
}

async function lintJavaScript(jsContent, liquidFilePath, scriptStartLine) {
	// Create a temporary file for the JavaScript content
	const basename = path.basename(liquidFilePath, ".liquid");
	const tmpFile = path.join(tmpDir, `${basename}_${scriptStartLine}.js`);
	fs.writeFileSync(tmpFile, jsContent);

	// Create ESLint instance
	const eslint = new ESLint({
		overrideConfig: {
			env: {
				browser: true,
				es6: true,
				jquery: true
			},
			parserOptions: {
				ecmaVersion: 2020,
				sourceType: "module"
			},
			globals: {
				Shopify: "readonly",
				fetch: "readonly",
				DOMUtils: "readonly",
				BuyBoxState: "readonly",
				CartCache: "readonly",
				SID: "readonly",
				showNotification: "readonly",
				parseErrorMessage: "readonly",
				handleBuyNowFlow: "readonly",
				addValidItemsToCart: "readonly"
			},
			rules: {
				"no-console": "off", // Allow console in our code
				"no-unused-vars": "warn",
				"no-undef": "warn" // Downgrade undefined variables to warnings
			}
		},
		useEslintrc: false
	});

	// Run ESLint
	const results = await eslint.lintFiles([tmpFile]);

	// Adjust line numbers to match the original file
	results.forEach(result => {
		result.messages.forEach(message => {
			message.line += scriptStartLine - 1;
		});
	});

	return results;
}

async function lintLiquidFiles() {
	try {
		// Get Liquid files from command line args or default pattern
		const filePaths = process.argv.length > 2 ? process.argv.slice(2) : glob.sync("src/**/*.liquid");

		const liquidFilesToCheck = filePaths.filter(file => file.endsWith(".liquid"));

		console.log(`Found ${liquidFilesToCheck.length} Liquid file(s) to check for JavaScript.`);

		let totalErrors = 0;
		let totalWarnings = 0;

		for (const liquidFile of liquidFilesToCheck) {
			const scriptTags = extractJavaScriptFromLiquid(liquidFile);

			if (scriptTags.length > 0) {
				console.log(`\nChecking JavaScript in ${chalk.cyan(liquidFile)}`);
				console.log(`Found ${scriptTags.length} script tag(s) with inline JavaScript.`);

				let fileErrors = 0;
				let fileWarnings = 0;

				for (let i = 0; i < scriptTags.length; i++) {
					const { content, startLine } = scriptTags[i];
					const results = await lintJavaScript(content, liquidFile, startLine);

					// Process results
					results.forEach(result => {
						result.messages.forEach(message => {
							const messageType = message.severity === 2 ? chalk.red("error") : chalk.yellow("warning");
							console.log(`  ${message.line}:${message.column}  ${messageType}  ${message.message}`);

							if (message.severity === 2) {
								fileErrors++;
								totalErrors++;
							} else {
								fileWarnings++;
								totalWarnings++;
							}
						});
					});
				}

				console.log(`\nFound ${fileErrors} error(s) and ${fileWarnings} warning(s) in JavaScript within Liquid file`);
			}
		}

		console.log(`\n${chalk.bold("JavaScript Linting Summary:")}`);
		console.log(`Total: ${totalErrors} error(s), ${totalWarnings} warning(s)`);

		// Clean up temporary directory
		fs.rmSync(tmpDir, { recursive: true, force: true });

		// Exit with error code if there are errors
		process.exit(totalErrors > 0 ? 1 : 0);
	} catch (error) {
		console.error(chalk.red("Error during linting:"), error);
		process.exit(1);
	}
}

lintLiquidFiles();
