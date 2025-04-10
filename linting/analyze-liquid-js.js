/**
 * Analyze JavaScript in Liquid files with better error reporting
 */

import fs from "fs";
import path from "path";
import chalk from "chalk";

// Function to extract JavaScript from a Liquid file
function extractJavaScript(filePath) {
	const content = fs.readFileSync(filePath, "utf8");
	const scriptBlocks = [];

	// Extract <script> tag content
	const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/g;
	let match;

	while ((match = scriptRegex.exec(content)) !== null) {
		// Skip script tags with src attributes
		if (match[0].match(/src\s*=\s*["'][^"']*["']/)) {
			continue;
		}

		const startLine = content.substring(0, match.index).split("\n").length;
		const scriptContent = match[1];

		scriptBlocks.push({
			content: scriptContent,
			startLine,
			endLine: startLine + scriptContent.split("\n").length - 1
		});
	}

	return scriptBlocks;
}

// Analyze JavaScript for issues, focusing on Liquid specific problems
function analyzeJavaScript(scriptBlock) {
	const issues = [];
	const { content, startLine } = scriptBlock;
	const lines = content.split("\n");

	// 1. Check for Liquid variables in JavaScript
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const lineNumber = startLine + i;

		// Check for Liquid output tags
		const liquidVars = [...line.matchAll(/{{(.*?)}}/g)];
		for (const match of liquidVars) {
			issues.push({
				line: lineNumber,
				column: line.indexOf(match[0]) + 1,
				message: `Liquid variable '${match[1].trim()}' found in JavaScript`,
				severity: "warning",
				suggestion: `Consider defining at the top of the script: const ${match[1].trim().replace(/\W+/g, "_")} = ${match[0]};`
			});
		}

		// Check for Liquid control flow
		const liquidControls = [...line.matchAll(/{%\s*(.*?)\s*%}/g)];
		for (const match of liquidControls) {
			const controlType = match[1].trim().split(" ")[0];
			issues.push({
				line: lineNumber,
				column: line.indexOf(match[0]) + 1,
				message: `Liquid control flow '${controlType}' found in JavaScript`,
				severity: controlType === "if" || controlType === "for" || controlType === "unless" ? "warning" : "info",
				suggestion:
					controlType === "if" || controlType === "unless"
						? `Consider initializing a variable at the top with this condition`
						: controlType === "for"
							? `Consider pre-building the array with Liquid before JavaScript`
							: null
			});
		}
	}

	// 2. Look for direct DOM manipulation with Liquid IDs
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const lineNumber = startLine + i;

		const domSelections = [
			...line.matchAll(/document\.(?:getElementById|querySelector)\(['"](#?\w+(?:-\w+)*-{{.*?}}(?:-\w+)*)['"]\)/g),
			...line.matchAll(/[\$][\(]['"](#?\w+(?:-\w+)*-{{.*?}}(?:-\w+)*)['"]\)/g), // jQuery patterns
			...line.matchAll(/\.(?:getElementById|querySelector)\(['"](#?\w+(?:-\w+)*-{{.*?}}(?:-\w+)*)['"]\)/g)
		];

		for (const match of domSelections) {
			issues.push({
				line: lineNumber,
				column: line.indexOf(match[0]) + 1,
				message: `DOM selection with Liquid template in selector: '${match[1]}'`,
				severity: "warning",
				suggestion: `Define the selector at the top: const selector = ${match[1].includes("{{") ? "`" + match[1].replace(/{{/g, "${") + "`" : `'${match[1]}'`};`
			});
		}
	}

	// 3. Check for potential undefined variables
	const commonVariables = new Set([
		"document",
		"window",
		"console",
		"localStorage",
		"sessionStorage",
		"setTimeout",
		"setInterval",
		"clearTimeout",
		"clearInterval",
		"fetch",
		"JSON",
		"requestAnimationFrame",
		"cancelAnimationFrame",
		"Promise",
		"DOMContentLoaded",
		"addEventListener",
		"removeEventListener"
	]);

	// Extract all function names defined in the script
	const functionDefs = content.match(/function\s+(\w+)/g)?.map(f => f.replace("function ", "")) || [];
	const arrowFunctionDefs = content.match(/const\s+(\w+)\s*=\s*(?:\([^)]*\)|[^=]*)\s*=>/g)?.map(f => f.match(/const\s+(\w+)/)[1]) || [];
	const methodDefs = content.match(/(\w+)\s*\([^)]*\)\s*{/g)?.map(f => f.match(/(\w+)/)[1]) || [];

	const definedFunctions = new Set([...functionDefs, ...arrowFunctionDefs, ...methodDefs]);

	// Extract variable declarations
	const varDeclarations = [];
	const varRegexes = [/const\s+(\w+)\s*=/g, /let\s+(\w+)\s*=/g, /var\s+(\w+)\s*=/g];

	for (const regex of varRegexes) {
		let match;
		while ((match = regex.exec(content)) !== null) {
			varDeclarations.push(match[1]);
		}
	}

	// Track variable usage
	const variableUsage = new Map();

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const lineNumber = startLine + i;

		// Match variables in potential usage contexts
		const identifiers = line.match(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g) || [];

		for (const identifier of identifiers) {
			// Skip common global variables and keywords
			if (
				commonVariables.has(identifier) ||
				/^(if|else|for|while|do|switch|case|break|continue|return|true|false|null|undefined|this|class|new|try|catch|finally|throw|typeof|instanceof|in|of|function|default|const|let|var)$/.test(
					identifier
				)
			) {
				continue;
			}

			if (!variableUsage.has(identifier)) {
				variableUsage.set(identifier, []);
			}

			variableUsage.get(identifier).push(lineNumber);
		}
	}

	// Defined variables
	const definedVariables = new Set(varDeclarations);

	// Check for undefined variables
	for (const [variable, lines] of variableUsage.entries()) {
		if (!definedVariables.has(variable) && !definedFunctions.has(variable)) {
			issues.push({
				line: lines[0],
				message: `Potentially undefined variable '${variable}' (used on lines: ${lines.join(", ")})`,
				severity: "warning",
				suggestion: `Define '${variable}' at the top of your script, possibly with a value from a Liquid variable`
			});
		}
	}

	return issues;
}

// Format and display analysis results
function displayResults(filePath, scriptBlocks) {
	console.log(chalk.cyan(`\nAnalyzing JavaScript in ${filePath}:`));
	console.log(chalk.gray(`Found ${scriptBlocks.length} script block(s)\n`));

	let totalWarnings = 0;
	let totalInfos = 0;

	for (let i = 0; i < scriptBlocks.length; i++) {
		console.log(chalk.white(`Script block #${i + 1} (lines ${scriptBlocks[i].startLine}-${scriptBlocks[i].endLine}):`));

		const issues = analyzeJavaScript(scriptBlocks[i]);

		// Group issues by line
		const issuesByLine = {};
		for (const issue of issues) {
			if (!issuesByLine[issue.line]) {
				issuesByLine[issue.line] = [];
			}
			issuesByLine[issue.line].push(issue);

			if (issue.severity === "warning") {
				totalWarnings++;
			} else if (issue.severity === "info") {
				totalInfos++;
			}
		}

		// Display issues grouped by line
		const lines = Object.keys(issuesByLine).sort((a, b) => parseInt(a) - parseInt(b));

		if (lines.length === 0) {
			console.log(chalk.green("  No issues found!\n"));
			continue;
		}

		for (const line of lines) {
			const lineIssues = issuesByLine[line];

			for (const issue of lineIssues) {
				const icon = issue.severity === "warning" ? chalk.yellow("⚠") : chalk.blue("ℹ");
				console.log(`  ${icon} ${chalk.gray(`Line ${issue.line}:`)} ${issue.message}`);

				if (issue.suggestion) {
					console.log(`    ${chalk.green("Suggestion:")} ${issue.suggestion}`);
				}
			}
		}

		console.log("");
	}

	console.log(chalk.white(`Summary: ${chalk.yellow(totalWarnings)} warnings, ${chalk.blue(totalInfos)} informational items`));
}

// Main function
function main() {
	const filePath = process.argv[2];

	if (!filePath) {
		console.error(chalk.red("Please provide a file path"));
		process.exit(1);
	}

	try {
		const scriptBlocks = extractJavaScript(filePath);
		displayResults(filePath, scriptBlocks);
	} catch (error) {
		console.error(chalk.red(`Error analyzing file: ${error.message}`));
		process.exit(1);
	}
}

main();
