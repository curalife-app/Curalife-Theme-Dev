#!/usr/bin/env node

/**
 * Shopify Command Linter
 *
 * Checks that all shopify theme commands include the --path argument
 * to prevent commands from running in the wrong directory.
 */

import fs from "fs";
import path from "path";
import { glob } from "glob";
import chalk from "chalk";

const THEME_DIR = "Curalife-Theme-Build";

function checkFile(filePath) {
	const content = fs.readFileSync(filePath, "utf8");
	const lines = content.split("\n");
	const issues = [];

	lines.forEach((line, index) => {
		// Look for shopify theme commands
		const shopifyThemeMatch = line.match(/shopify\s+theme\s+(\w+)/);
		if (shopifyThemeMatch) {
			const command = shopifyThemeMatch[1];

			// Skip commands that don't need path handling, already have --path, or use cd
			if (command === "info" || line.includes("--path") || line.includes(`cd ${THEME_DIR}`)) {
				return;
			}

			// Commands that support --path
			const supportsPath = ["dev", "push", "pull", "delete", "rename"];
			// Commands that need cd (don't support --path)
			const needsCd = ["list", "open"];

			if (supportsPath.includes(command)) {
				issues.push({
					line: index + 1,
					text: line.trim(),
					command: command,
					suggestion: line.replace(/shopify\s+theme\s+\w+/, `$& --path ${THEME_DIR}`)
				});
			} else if (needsCd.includes(command)) {
				issues.push({
					line: index + 1,
					text: line.trim(),
					command: command,
					suggestion: line.replace(/shopify\s+theme/, `cd ${THEME_DIR} && shopify theme`)
				});
			}
		}
	});

	return issues;
}

function main() {
	console.log(chalk.blue("🔍 Checking Shopify CLI commands for --path argument..."));

	const filesToCheck = ["package.json", "build-scripts/**/*.js", "scripts/**/*.js", "**/*.md"];

	let totalIssues = 0;

	filesToCheck.forEach(pattern => {
		const files = glob.sync(pattern, {
			ignore: ["node_modules/**", "Curalife-Theme-Build/**"]
		});

		files.forEach(file => {
			const issues = checkFile(file);
			if (issues.length > 0) {
				console.log(chalk.red(`\n❌ Issues found in ${file}:`));
				issues.forEach(issue => {
					console.log(chalk.yellow(`  Line ${issue.line}: ${issue.text}`));
					console.log(chalk.green(`  Suggestion: ${issue.suggestion}`));
				});
				totalIssues += issues.length;
			}
		});
	});

	if (totalIssues === 0) {
		console.log(chalk.green("✅ All Shopify CLI commands are properly configured!"));
		process.exit(0);
	} else {
		console.log(chalk.red(`\n❌ Found ${totalIssues} issue(s). Please add --path ${THEME_DIR} to the commands above.`));
		process.exit(1);
	}
}

main();
