import chalk from "chalk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dracula color scheme
export const draculaColors = {
	background: "#282a36",
	foreground: "#f8f8f2",
	cyan: "#8be9fd",
	green: "#50fa7b",
	orange: "#ffb86c",
	pink: "#ff79c6",
	purple: "#bd93f9",
	red: "#ff5555",
	yellow: "#f1fa8c",
	comment: "#6272a4"
};

// Directory paths
export const SRC_DIR = path.join(__dirname, "..", "src");
export const BUILD_DIR = path.join(__dirname, "..", "Curalife-Theme-Build");

// Directory mappings for file copying
export const dirMappings = {
	"liquid/layout": "layout",
	"liquid/sections": "sections",
	"liquid/snippets": "snippets",
	"liquid/blocks": "blocks",
	"liquid/templates": "templates",
	config: "config",
	locales: "locales",
	assets: "assets",
	images: "assets",
	fonts: "assets",
	js: "assets",
	scripts: "assets"
};

// Shared logging configuration
export const log = (message, level = "info", skipNewline = false) => {
	const levels = {
		info: { color: chalk.hex(draculaColors.cyan), icon: "●" },
		success: { color: chalk.hex(draculaColors.green), icon: "✓" },
		warning: { color: chalk.hex(draculaColors.orange), icon: "!" },
		error: { color: chalk.hex(draculaColors.red), icon: "✗" },
		vite: { color: chalk.hex(draculaColors.purple), icon: "⚡" },
		tailwind: { color: chalk.hex(draculaColors.cyan), icon: "◉" },
		build: { color: chalk.hex(draculaColors.purple), icon: "◆" },
		step: { color: chalk.hex(draculaColors.green), icon: "→" },
		watch: { color: chalk.hex(draculaColors.purple), icon: "◎" },
		file: { color: chalk.hex(draculaColors.yellow), icon: "◦" }
	};

	const { color, icon } = levels[level] || levels.info;
	const output = `${color(icon)} ${color(message)}`;

	if (skipNewline) {
		process.stdout.write(output);
	} else {
		console.log(output);
	}
};

// Shared progress system
export class ProgressTracker {
	constructor(totalSteps, stepNames, theme = "build") {
		this.totalSteps = totalSteps;
		this.stepNames = stepNames;
		this.theme = theme;
		this.currentProgress = 0;
		this.currentStep = 0;
		this.isCompleted = false;

		// Define step weights (how much each step contributes to total progress)
		this.stepWeights = {
			0: 40, // File copying (40% of total)
			1: 30, // Tailwind build (30% of total)
			2: 30 // Vite build (30% of total)
		};
	}

	// Set progress as a simple percentage (0-100)
	setProgress(percentage, customMessage = null) {
		// Only update if progress actually changed to prevent jiggling
		if (Math.abs(percentage - this.currentProgress) < 0.5 && !customMessage) {
			return;
		}
		this.currentProgress = percentage;

		const barLength = 30;
		const filledLength = Math.round((barLength * percentage) / 100);

		// Create gradient effect with different colored blocks
		let bar = "";
		for (let i = 0; i < barLength; i++) {
			if (i < filledLength) {
				if (this.theme === "watch") {
					// Watch theme: Purple to Pink to Cyan to Green
					if (i < barLength * 0.3) {
						bar += chalk.hex("#bd93f9")("█");
					} else if (i < barLength * 0.6) {
						bar += chalk.hex("#ff79c6")("█");
					} else if (i < barLength * 0.8) {
						bar += chalk.hex("#8be9fd")("█");
					} else {
						bar += chalk.hex("#50fa7b")("█");
					}
				} else {
					// Build theme: Purple to Pink gradient
					if (i < barLength * 0.3) {
						bar += chalk.hex("#9d4edd")("█");
					} else if (i < barLength * 0.6) {
						bar += chalk.hex("#c77dff")("█");
					} else if (i < barLength * 0.8) {
						bar += chalk.hex("#ff79c6")("█");
					} else {
						bar += chalk.hex("#8be9fd")("█");
					}
				}
			} else {
				bar += chalk.hex("#44475a")("░");
			}
		}

		// Get display text - use custom message if provided
		const displayText = customMessage || (percentage >= 100 ? "Complete!" : this.theme === "watch" ? "Initializing..." : "Building...");

		// Add sparkle effect for completed sections
		const sparkles = percentage >= 100 ? (this.theme === "watch" ? " 🌟" : " ✨") : "";

		// Fancy percentage with glow effect - ensure consistent width
		const roundedPercentage = Math.round(percentage);
		const percentageDisplay = percentage >= 100 ? chalk.hex("#50fa7b").bold(`${roundedPercentage.toString().padStart(3)}%`) : chalk.hex("#ffb86c").bold(`${roundedPercentage.toString().padStart(3)}%`);

		// Create status text with icon (avoid duplicate icons)
		const pulseChar = percentage >= 100 ? (this.theme === "watch" ? "👀" : "✅") : this.theme === "watch" ? "👁️" : "⚡";

		const statusText = `${chalk.hex("#ff79c6")(pulseChar)} ${chalk.hex("#f8f8f2")(displayText)}${sparkles}`;

		// Create the progress line with bar at the start, then percentage, then status
		const progressLine = `${bar} ${percentageDisplay} - ${statusText}`;

		// More robust line clearing - clear entire line and return to beginning
		process.stdout.write(`\x1b[2K\x1b[G${progressLine}`);

		// Only add a new line when progress is truly complete (100%) and this is the final update
		if (percentage >= 100) {
			// Store that we've completed for future reference
			this.isCompleted = true;
		}
	}

	// Method to finalize progress bar with a new line
	complete() {
		if (!this.isCompleted) {
			this.setProgress(100, "Complete!");
		}
		console.log(); // Add the new line only when explicitly completing
	}

	// Legacy method for backward compatibility - converts step-based to percentage
	showProgress(stepIndex, stepProgress = 100, customMessage = null) {
		const stepBaseProgress = Object.keys(this.stepWeights)
			.slice(0, stepIndex)
			.reduce((sum, key) => sum + this.stepWeights[key], 0);
		const stepContribution = (this.stepWeights[stepIndex] || 0) * (stepProgress / 100);
		const totalProgress = stepBaseProgress + stepContribution;

		// Generate step-specific status message if none provided
		let statusMessage = customMessage;
		if (!customMessage) {
			if (stepProgress >= 100) {
				statusMessage = "Complete!";
			} else {
				switch (stepIndex) {
					case 0:
						statusMessage = "Copying files...";
						break;
					case 1:
						statusMessage = "Building styles...";
						break;
					case 2:
						statusMessage = "Building scripts...";
						break;
					default:
						statusMessage = this.theme === "watch" ? "Initializing..." : "Building...";
				}
			}
		}

		this.setProgress(totalProgress, statusMessage);
	}

	// File progress within a step
	showFileProgress(current, total, stepIndex) {
		const fileProgress = (current / total) * 100;
		this.showProgress(stepIndex, fileProgress);
	}
}

// Shared banner creation
export const createBanner = (title, subtitle, isDebugMode = false, theme = "build") => {
	console.clear();

	const borderWidth = 38;
	let topBorder, bottomBorder;

	if (theme === "watch") {
		topBorder = chalk.hex("#bd93f9")("╭") + chalk.hex("#ff79c6")("─".repeat(borderWidth)) + chalk.hex("#8be9fd")("╮");
		bottomBorder = chalk.hex("#bd93f9")("╰") + chalk.hex("#ff79c6")("─".repeat(borderWidth)) + chalk.hex("#8be9fd")("╯");
	} else {
		topBorder = chalk.hex("#9d4edd")("╭") + chalk.hex("#c77dff")("─".repeat(borderWidth)) + chalk.hex("#8be9fd")("╮");
		bottomBorder = chalk.hex("#9d4edd")("╰") + chalk.hex("#c77dff")("─".repeat(borderWidth)) + chalk.hex("#8be9fd")("╯");
	}

	const sideBorder = chalk.hex("#6272a4")("│");

	console.log("");
	console.log(`  ${topBorder}`);
	console.log(`  ${sideBorder} ${chalk.hex("#ff79c6").bold(title)}     ${sideBorder}`);
	console.log(`  ${sideBorder} ${chalk.hex("#f8f8f2")(subtitle)}        ${sideBorder}`);
	if (isDebugMode) {
		console.log(`  ${sideBorder} ${chalk.hex("#ff5555")("● Debug mode enabled")}             ${sideBorder}`);
	}
	console.log(`  ${bottomBorder}`);
	console.log("");
};

// Shared completion box
export const createCompletionBox = (success, duration, filesCopied, errors = 0) => {
	console.log("");

	if (!success || errors > 0) {
		const warningBorder = chalk.hex("#ffb86c")("┌") + chalk.hex("#ff5555")("─".repeat(48)) + chalk.hex("#ffb86c")("┐");
		const warningBottom = chalk.hex("#ffb86c")("└") + chalk.hex("#ff5555")("─".repeat(48)) + chalk.hex("#ffb86c")("┘");
		const warningSide = chalk.hex("#ff5555")("│");

		console.log(`  ${warningBorder}`);
		console.log(`  ${warningSide} ${chalk.hex("#ff5555")("⚠️  Build completed with errors")} ${chalk.hex("#ffb86c")(`${duration.toFixed(1)}s`)} ${warningSide}`);
		console.log(`  ${warningSide} ${chalk.hex("#f8f8f2")(`   → ${filesCopied} files processed`)}              ${warningSide}`);
		console.log(`  ${warningSide} ${chalk.hex("#ff5555")(`   → ${errors} errors encountered`)}           ${warningSide}`);
		console.log(`  ${warningBottom}`);
	} else {
		const successBorder = chalk.hex("#50fa7b")("┌") + chalk.hex("#8be9fd")("─".repeat(48)) + chalk.hex("#50fa7b")("┐");
		const successBottom = chalk.hex("#50fa7b")("└") + chalk.hex("#8be9fd")("─".repeat(48)) + chalk.hex("#50fa7b")("┘");
		const successSide = chalk.hex("#50fa7b")("│");

		console.log(`  ${successBorder}`);
		console.log(`  ${successSide} ${chalk.hex("#50fa7b")("🚀 Build completed successfully!")} ${chalk.hex("#8be9fd")(`${duration.toFixed(1)}s`)} ${successSide}`);
		console.log(`  ${successSide} ${chalk.hex("#f8f8f2")(`   → ${filesCopied} files processed`)}              ${successSide}`);
		console.log(`  ${successSide} ${chalk.hex("#8be9fd")("   → Ready for deployment")}                ${successSide}`);
		console.log(`  ${successBottom}`);
	}

	console.log("");
};

// Enhanced watch success message with performance stats
export const createWatchSuccessBox = (success = true, duration = 0, fileCount = 0, skippedCount = 0, extraInfo = {}) => {
	console.log("");

	if (!success) {
		const warningBorder = chalk.hex("#ffb86c")("┌") + chalk.hex("#ff5555")("─".repeat(48)) + chalk.hex("#ffb86c")("┐");
		const warningBottom = chalk.hex("#ffb86c")("└") + chalk.hex("#ff5555")("─".repeat(48)) + chalk.hex("#ffb86c")("┘");
		const warningSide = chalk.hex("#ff5555")("│");

		console.log(`  ${warningBorder}`);
		console.log(`  ${warningSide} ${chalk.hex("#ff5555")("⚠️  Watch started with errors")} ${chalk.hex("#ffb86c")(`${duration.toFixed(1)}s`)} ${warningSide}`);
		console.log(`  ${warningSide} ${chalk.hex("#f8f8f2")(`   → Monitoring for changes...`)}             ${warningSide}`);
		console.log(`  ${warningBottom}`);
	} else {
		const successBorder = chalk.hex("#50fa7b")("┌") + chalk.hex("#8be9fd")("─".repeat(52)) + chalk.hex("#50fa7b")("┐");
		const successBottom = chalk.hex("#50fa7b")("└") + chalk.hex("#8be9fd")("─".repeat(52)) + chalk.hex("#50fa7b")("┘");
		const successSide = chalk.hex("#50fa7b")("│");

		console.log(`  ${successBorder}`);
		console.log(`  ${successSide} ${chalk.hex("#50fa7b")("👀 Optimized watcher ready!")} ${chalk.hex("#8be9fd")(`${duration.toFixed(1)}s`)}      ${successSide}`);
		console.log(`  ${successSide} ${chalk.hex("#f8f8f2")(`   → ${fileCount} files processed, ${skippedCount} cached`)}        ${successSide}`);

		if (extraInfo.cacheHits) {
			console.log(`  ${successSide} ${chalk.hex("#bd93f9")(`   → ${extraInfo.cacheHits} cache hits, ${extraInfo.optimizations || 0} optimizations`)} ${successSide}`);
		}

		console.log(`  ${successSide} ${chalk.hex("#8be9fd")("   → Watching for changes... (Ctrl+C to stop)")}  ${successSide}`);
		console.log(`  ${successBottom}`);
	}

	console.log("");
};

// Ensure a directory exists
export const ensureDirectoryExists = dirPath => {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
		return true;
	}
	return false;
};

// Get the destination path for a file
export const getDestination = sourcePath => {
	// Normalize the path to handle Windows backslashes
	sourcePath = path.normalize(sourcePath);
	const relativePath = path.relative(SRC_DIR, sourcePath);
	const fileName = path.basename(sourcePath);

	// Normalize relative path for cross-platform compatibility
	const normalizedRelativePath = relativePath.replace(/\\/g, "/");

	// Find which source directory this file belongs to
	let destDir = null;

	for (const srcDir of Object.keys(dirMappings)) {
		const normalizedSrcDir = srcDir.replace(/\\/g, "/");
		if (normalizedRelativePath.startsWith(normalizedSrcDir)) {
			destDir = dirMappings[srcDir];
			break;
		}
	}

	// If no mapping found, determine by file extension
	if (!destDir) {
		if (fileName.endsWith(".liquid")) {
			if (normalizedRelativePath.includes("sections")) {
				destDir = "sections";
			} else if (normalizedRelativePath.includes("snippets")) {
				destDir = "snippets";
			} else if (normalizedRelativePath.includes("blocks")) {
				destDir = "blocks";
			} else if (normalizedRelativePath.includes("layout")) {
				destDir = "layout";
			} else {
				destDir = "snippets";
			}
		} else {
			destDir = "assets";
		}
	}

	const destFolder = path.join(BUILD_DIR, destDir);
	const destPath = path.join(destFolder, fileName);

	return { destPath, destFolder, destDir };
};

// Copy a file from source to destination
export const copyFile = async (filePath, isDebugMode = false) => {
	try {
		if (!fs.existsSync(filePath)) {
			if (isDebugMode) {
				log(`Source file missing: ${path.basename(filePath)}`, "warning");
			}
			return false;
		}

		const fileStats = fs.statSync(filePath);
		if (fileStats.isDirectory()) {
			return false;
		}

		const fileName = path.basename(filePath);
		const { destPath, destFolder, destDir } = getDestination(filePath);

		if (!destFolder) {
			if (isDebugMode) {
				log(`No destination for: ${fileName}`, "warning");
			}
			return false;
		}

		await fs.promises.mkdir(destFolder, { recursive: true });
		await fs.promises.copyFile(filePath, destPath);

		if (isDebugMode) {
			log(`${fileName} → ${destDir}`, "file");
		}

		return true;
	} catch (error) {
		if (isDebugMode) {
			log(`Copy failed: ${path.basename(filePath)} - ${error.message}`, "error");
		}
		return false;
	}
};

// Get appropriate npx command for platform (with proper argument escaping)
export const getNpxCommand = () => {
	if (process.platform === "win32") {
		return { command: "cmd", baseArgs: ["/c", "npx"] };
	} else {
		return { command: "npx", baseArgs: [] };
	}
};

// Show fancy file change notification
export const showFileChangeNotification = (fileName, isDebugMode = false) => {
	if (!isDebugMode) {
		const changeIcon = ["🔥", "⚡", "✨", "💥"][Math.floor(Math.random() * 4)];
		process.stdout.write(`\r\x1b[K${chalk.hex("#ff79c6")(changeIcon)} ${chalk.hex("#f8f8f2")("File changed:")} ${chalk.hex("#8be9fd")(fileName)}\n`);
	}
};

// Show style rebuild notification
export const showStyleRebuildNotification = (isDebugMode = false) => {
	if (!isDebugMode) {
		process.stdout.write(`\r\x1b[K${chalk.hex("#bd93f9")("🎨")} ${chalk.hex("#f8f8f2")("Rebuilding styles...")}\n`);
	}
};
