/**
 * Unified linting script for Curalife Theme
 *
 * Usage:
 *   node linting/lint.js [options] [files]
 *
 * Options:
 *   --fix        Fix issues where possible
 *   --help       Show this help message
 *
 * Examples:
 *   node linting/lint.js                         Lint all files
 *   node linting/lint.js src/liquid/file.liquid  Lint a specific file
 *   node linting/lint.js src/js/script.js        Lint a specific file
 *   node linting/lint.js --fix                   Fix issues where possible
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { spawn } from "child_process";
import { glob } from "glob";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Parse command line arguments
const args = process.argv.slice(2);
let options = {
	fix: false,
	help: false,
	files: []
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
	const arg = args[i];
	if (arg === "--fix") {
		options.fix = true;
	} else if (arg === "--help") {
		options.help = true;
	} else {
		// Assume it's a file path
		options.files.push(arg);
	}
}

// Display help
if (options.help) {
	console.log(fs.readFileSync(__filename, "utf8").match(/\/\*\*[\s\S]*?\*\//)[0]);
	process.exit(0);
}

// Helper function to run a command
function runCommand(command, args) {
	return new Promise((resolve, reject) => {
		console.log(`Running: ${command} ${args.join(" ")}`);
		const child = spawn(command, args, { stdio: "inherit" });

		child.on("close", code => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`Command failed with exit code ${code}`));
			}
		});

		child.on("error", error => {
			reject(error);
		});
	});
}

// Find files by pattern
async function findFiles(pattern) {
	return glob(pattern, { cwd: rootDir });
}

// Main function
async function main() {
	try {
		const filesToLint = options.files.length > 0 ? options.files : [];

		// If no specific files provided, find all JS and Liquid files
		if (filesToLint.length === 0) {
			const jsFiles = await findFiles("src/js/**/*.js");
			const liquidFiles = await findFiles("src/liquid/**/*.liquid");
			filesToLint.push(...jsFiles, ...liquidFiles);
		}

		// Separate JS and Liquid files
		const jsFiles = filesToLint.filter(file => file.endsWith(".js"));
		const liquidFiles = filesToLint.filter(file => file.endsWith(".liquid"));

		// Lint JavaScript files with ESLint
		if (jsFiles.length > 0) {
			console.log("\n📝 Linting JavaScript files...");
			const eslintConfig = path.join(__dirname, ".eslintrc.js");
			const eslintArgs = ["--config", eslintConfig];

			if (options.fix) {
				eslintArgs.push("--fix");
			}

			eslintArgs.push(...jsFiles);
			await runCommand("npx", ["eslint", ...eslintArgs]);
		}

		// Analyze Liquid files with analyze-liquid-js
		if (liquidFiles.length > 0) {
			console.log("\n📝 Analyzing JavaScript in Liquid files...");
			const analyzeScript = path.join(__dirname, "analyze-liquid-js.js");

			for (const file of liquidFiles) {
				await runCommand("node", [analyzeScript, file]);
			}
		}

		console.log("\n✅ Linting completed successfully");
	} catch (error) {
		console.error("\n❌ Linting failed:", error.message);
		process.exit(1);
	}
}

main();
