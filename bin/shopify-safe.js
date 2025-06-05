#!/usr/bin/env node

/**
 * Shopify CLI Safety Wrapper
 *
 * This wrapper ensures that all shopify theme commands automatically
 * target the Curalife-Theme-Build directory by injecting --path if missing.
 */

import { spawn } from "child_process";
import chalk from "chalk";

const THEME_DIR = "Curalife-Theme-Build";

function main() {
	const args = process.argv.slice(2);

	// Check if this is a theme command and needs path handling
	if (args.includes("theme") && !args.includes("--path")) {
		const themeIndex = args.indexOf("theme");
		const command = args[themeIndex + 1];

		// Commands that support --path
		const supportsPath = ["dev", "push", "pull", "delete", "rename"];
		// Commands that need different working directory
		const needsCwd = ["list", "open"];

		if (supportsPath.includes(command)) {
			console.log(chalk.yellow(`⚠️  Auto-injecting --path ${THEME_DIR} for safety`));
			// Insert --path argument after the command
			const insertIndex = themeIndex + 2;
			args.splice(insertIndex, 0, "--path", THEME_DIR);
		} else if (needsCwd.includes(command)) {
			console.log(chalk.yellow(`⚠️  Auto-switching to ${THEME_DIR} directory for safety`));
			// Change working directory for these commands
			process.chdir(THEME_DIR);
		}
	}

	// Spawn the real Shopify CLI
	const isWindows = process.platform === "win32";
	let command, finalArgs;

	if (isWindows) {
		command = "cmd";
		finalArgs = ["/c", "shopify", ...args];
	} else {
		command = "shopify";
		finalArgs = args;
	}

	const shopifyProcess = spawn(command, finalArgs, {
		stdio: "inherit",
		env: process.env
	});

	shopifyProcess.on("close", code => {
		process.exit(code);
	});

	shopifyProcess.on("error", error => {
		if (error.code === "ENOENT") {
			console.error(chalk.red("❌ Shopify CLI not found. Please install it first:"));
			console.error(chalk.cyan("npm install -g @shopify/cli @shopify/theme"));
		} else {
			console.error(chalk.red(`Failed to start Shopify CLI: ${error.message}`));
		}
		process.exit(1);
	});
}

main();
