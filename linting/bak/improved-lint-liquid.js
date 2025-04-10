/**
 * Improved script to lint JavaScript in Liquid files
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
 * Improved function to clean up Liquid tags in JavaScript code
 * This version is more careful with variable replacements
 */
function cleanLiquidTags(content) {
	// Replace all Liquid output syntax ({{ variable }}) first
	// with strings to ensure they don't interfere with control flow
	content = content.replace(/{{(.*?)}}/g, '"LIQUID_VAR"');

	// Handle complex nested Liquid control structures by replacing
	// the entire blocks with placeholder assignments
	// This avoids syntax errors from partially replaced blocks
	let startIndex;
	while ((startIndex = content.indexOf("{%")) !== -1) {
		let endIndex = content.indexOf("%}", startIndex);
		if (endIndex === -1) break;

		let tagContent = content.substring(startIndex, endIndex + 2);
		let replacement;

		// Replace different types of Liquid control tags
		if (tagContent.includes("if ") || tagContent.includes("unless ")) {
			replacement = "/* LIQUID_CONDITION */ {";
		} else if (tagContent.includes("else") || tagContent.includes("elsif")) {
			replacement = "} /* LIQUID_BRANCH */ {";
		} else if (tagContent.includes("endif") || tagContent.includes("endunless")) {
			replacement = "}";
		} else if (tagContent.includes("for ")) {
			replacement = "/* LIQUID_LOOP */ [";
		} else if (tagContent.includes("endfor")) {
			replacement = "]";
		} else {
			replacement = "/* LIQUID_TAG */";
		}

		content = content.substring(0, startIndex) + replacement + content.substring(endIndex + 2);
	}

	// Final pass to remove any remaining Liquid tags
	content = content.replace(/{%.*?%}/g, "/* LIQUID_TAG */");

	// Clean up any potential syntax issues caused by our replacements
	content = content.replace(/\}\s*\{/g, "};{");
	content = content.replace(/\}\s*\}/g, "};");
	content = content.replace(/\[\s*\]/g, "[null]");
	content = content.replace(/,\s*\]/g, "]");

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

	// Create ESLint instance with more permissive rules for Liquid templates
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
				addValidItemsToCart: "readonly",
				// Additional globals that might appear in templates
				window: "readonly",
				document: "readonly",
				localStorage: "readonly",
				sessionStorage: "readonly",
				console: "readonly",
				setTimeout: "readonly",
				clearTimeout: "readonly",
				setInterval: "readonly",
				clearInterval: "readonly",
				requestAnimationFrame: "readonly",
				// Add common project-specific functions
				updateBuyButton: "readonly",
				updatePriceDisplay: "readonly",
				populateFrequencySelector: "readonly",
				updateVariantImage: "readonly",
				updateFrequencyDescription: "readonly"
			},
			rules: {
				"no-console": "off",
				"no-unused-vars": "warn",
				"no-undef": "warn",
				"no-empty": "off", // Allow empty blocks (they might be filled by Liquid)
				"no-constant-condition": "off", // Allow if(true) for Liquid replacements
				"no-unreachable": "off", // Allow code after return when it might be reached via Liquid
				"no-useless-escape": "off" // Allow escapes that might be needed in Liquid context
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
		const filePaths = specificFile ? [specificFile] : glob.sync(liquidFilesGlob, { ignore: ignoredPaths });

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
