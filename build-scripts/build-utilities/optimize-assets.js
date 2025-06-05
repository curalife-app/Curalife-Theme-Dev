#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

/**
 * Asset optimization script for quiz components
 * Minifies JSON, optimizes CSS class names, and validates file integrity
 */

const BUILD_DIR = "Curalife-Theme-Build";
const ASSETS_DIR = path.join(BUILD_DIR, "assets");

async function optimizeJson(filePath) {
	try {
		const content = await fs.readFile(filePath, "utf8");
		const parsed = JSON.parse(content);

		// Minify JSON by removing unnecessary whitespace
		const minified = JSON.stringify(parsed);

		// Save with .min.json extension
		const minPath = filePath.replace(".json", ".min.json");
		await fs.writeFile(minPath, minified);

		console.log(`✓ Optimized JSON: ${path.basename(filePath)} -> ${path.basename(minPath)}`);
		console.log(`  Size reduction: ${content.length} -> ${minified.length} bytes (${Math.round((1 - minified.length / content.length) * 100)}% smaller)`);

		return minified;
	} catch (error) {
		console.error(`✗ Failed to optimize JSON ${filePath}:`, error.message);
		return null;
	}
}

async function validateQuizStructure(jsonContent) {
	try {
		const quiz = JSON.parse(jsonContent);

		const validations = [
			{ check: () => quiz.id, message: "Quiz must have an ID" },
			{ check: () => quiz.title, message: "Quiz must have a title" },
			{ check: () => Array.isArray(quiz.steps), message: "Quiz must have steps array" },
			{ check: () => quiz.steps.length > 0, message: "Quiz must have at least one step" },
			{ check: () => quiz.steps.every(step => step.id && (step.questions || step.info)), message: "All steps must have ID and questions or info" }
		];

		const failures = validations.filter(v => !v.check()).map(v => v.message);

		if (failures.length > 0) {
			console.error("✗ Quiz validation failed:");
			failures.forEach(failure => console.error(`  - ${failure}`));
			return false;
		}

		console.log(`✓ Quiz structure validated: ${quiz.steps.length} steps, ${quiz.steps.reduce((acc, step) => acc + (step.questions?.length || 0), 0)} total questions`);
		return true;
	} catch (error) {
		console.error("✗ Quiz structure validation failed:", error.message);
		return false;
	}
}

async function optimizeCss(filePath) {
	try {
		const content = await fs.readFile(filePath, "utf8");

		// Basic CSS minification
		const minified = content
			// Remove comments
			.replace(/\/\*[\s\S]*?\*\//g, "")
			// Remove extra whitespace
			.replace(/\s+/g, " ")
			// Remove space around certain characters
			.replace(/\s*([{}:;,>+~])\s*/g, "$1")
			// Remove trailing semicolons before closing braces
			.replace(/;}/g, "}")
			.trim();

		// Save minified version
		const minPath = filePath.replace(".css", ".min.css");
		await fs.writeFile(minPath, minified);

		console.log(`✓ Optimized CSS: ${path.basename(filePath)} -> ${path.basename(minPath)}`);
		console.log(`  Size reduction: ${content.length} -> ${minified.length} bytes (${Math.round((1 - minified.length / content.length) * 100)}% smaller)`);

		return minified;
	} catch (error) {
		console.error(`✗ Failed to optimize CSS ${filePath}:`, error.message);
		return null;
	}
}

async function generateManifest() {
	try {
		const manifest = {
			generated: new Date().toISOString(),
			version: "1.0.0",
			files: {},
			integrity: {}
		};

		// Scan assets directory
		const files = await fs.readdir(ASSETS_DIR);

		for (const file of files) {
			const filePath = path.join(ASSETS_DIR, file);
			const stats = await fs.stat(filePath);

			if (stats.isFile()) {
				const content = await fs.readFile(filePath);
				const hash = crypto.createHash("sha256").update(content).digest("hex");

				manifest.files[file] = {
					size: stats.size,
					modified: stats.mtime.toISOString()
				};

				manifest.integrity[file] = `sha256-${hash}`;
			}
		}

		await fs.writeFile(path.join(BUILD_DIR, "asset-manifest.json"), JSON.stringify(manifest, null, 2));
		console.log(`✓ Generated asset manifest with ${Object.keys(manifest.files).length} files`);
	} catch (error) {
		console.error("✗ Failed to generate manifest:", error.message);
	}
}

async function main() {
	console.log("🔧 Starting asset optimization...\n");

	try {
		// Ensure build directory exists
		await fs.access(BUILD_DIR);

		// Optimize JSON files
		const jsonFiles = ["dietitian-quiz.json"];
		for (const jsonFile of jsonFiles) {
			const filePath = path.join(ASSETS_DIR, jsonFile);
			try {
				await fs.access(filePath);
				const optimized = await optimizeJson(filePath);
				if (optimized && jsonFile.includes("quiz")) {
					await validateQuizStructure(optimized);
				}
			} catch (error) {
				console.warn(`⚠ JSON file not found: ${jsonFile}`);
			}
		}

		console.log("");

		// Optimize CSS files
		const cssFiles = ["quiz.css"];
		for (const cssFile of cssFiles) {
			const filePath = path.join(ASSETS_DIR, cssFile);
			try {
				await fs.access(filePath);
				await optimizeCss(filePath);
			} catch (error) {
				console.warn(`⚠ CSS file not found: ${cssFile}`);
			}
		}

		console.log("");

		// Generate manifest
		await generateManifest();

		console.log("\n✅ Asset optimization complete!");
	} catch (error) {
		if (error.code === "ENOENT") {
			console.error(`✗ Build directory not found: ${BUILD_DIR}`);
			console.error("  Please run the build process first.");
		} else {
			console.error("✗ Optimization failed:", error.message);
		}
		process.exit(1);
	}
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
	main().catch(console.error);
}

export { optimizeJson, optimizeCss, validateQuizStructure, generateManifest };
