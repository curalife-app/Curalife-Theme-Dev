/**
 * Curalife Shopify Theme Development System
 *
 * A high-performance, adaptive hot reload system that combines:
 * - Smart file type detection to determine how to process each file
 * - Direct file copying for templates and static assets (no Vite needed)
 * - Vite processing only for JavaScript and CSS files that need transformation
 * - Comprehensive error handling and recovery mechanisms
 *
 * This hybrid approach minimizes build times by only processing files that need it.
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { build } from "vite"; // Import build from Vite
import chokidar from "chokidar"; // For more granular file watching
import https from "https"; // Added https import for API connectivity testing
import http from "http"; // Added http import for local server

// Get __dirname equivalent in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Define paths
const SRC_DIR = path.join(__dirname, "src");
const BUILD_DIR = path.join(__dirname, "Curalife-Theme-Build");

// Terminal colors for logging
const colors = {
	reset: "\x1b[0m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
	white: "\x1b[37m"
};

// Utility functions
const log = (message, color = colors.blue) => {
	const timestamp = new Date().toLocaleTimeString();
	console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
};

const error = message => {
	const timestamp = new Date().toLocaleTimeString();
	console.error(`${colors.red}[${timestamp}] ERROR: ${message}${colors.reset}`);
	if (metrics) metrics.errors++;
};

// Performance metrics
const metrics = {
	startTime: Date.now(),
	initialBuildTime: 0,
	filesCopied: 0,
	filesDeleted: 0,
	viteRebuildCount: 0,
	errors: 0
};

// Cache for processed files to avoid redundant operations
const processedFiles = new Set();

// File type mapping - which source files go to which destination directories
const fileTypeMappings = [
	// Liquid templates
	{
		pattern: /^src\/liquid\/(.*\.liquid)$/,
		destDir: match => path.join(BUILD_DIR, match[1]),
		needsVite: false
	},
	// JavaScript files (need Vite processing)
	{
		pattern: /^src\/scripts\/(.*)\.js$/,
		destDir: match => path.join(BUILD_DIR, "assets", `${path.basename(match[1])}.js`),
		needsVite: true
	},
	// CSS/SCSS files (need Vite processing)
	{
		pattern: /^src\/(styles|css)\/(.*)\.(?:css|scss)$/,
		destDir: match => path.join(BUILD_DIR, "assets", `${path.basename(match[2])}.css`),
		needsVite: true
	},
	// Images and static assets
	{
		pattern: /^src\/assets\/(.*)$/,
		destDir: match => path.join(BUILD_DIR, "assets", match[1]),
		needsVite: false
	},
	// JSON files
	{
		pattern: /^src\/json\/(.*)\.json$/,
		destDir: match => path.join(BUILD_DIR, match[1]),
		needsVite: false
	},
	// Locales
	{
		pattern: /^src\/locales\/(.*)\.json$/,
		destDir: match => path.join(BUILD_DIR, "locales", match[1]),
		needsVite: false
	},
	// Default catch-all mapping
	{
		pattern: /^src\/(.*)$/,
		destDir: match => path.join(BUILD_DIR, match[1]),
		needsVite: false
	}
];

// Print performance metrics
const printMetrics = () => {
	const duration = ((Date.now() - metrics.startTime) / 1000).toFixed(1);

	log("\n📊 Performance Metrics:", colors.cyan);
	log(`  • Runtime: ${duration}s`, colors.cyan);
	if (metrics.initialBuildTime > 0) {
		log(`  • Initial Build: ${(metrics.initialBuildTime / 1000).toFixed(1)}s`, colors.cyan);
	}
	log(`  • Files Copied: ${metrics.filesCopied}`, colors.cyan);
	log(`  • Files Deleted: ${metrics.filesDeleted}`, colors.cyan);
	log(`  • Vite Rebuilds: ${metrics.viteRebuildCount}`, colors.cyan);
	log(`  • Errors: ${metrics.errors}`, colors.cyan);
};

// Run initial Vite build
const runInitialBuild = async () => {
	log("Running initial Vite build...", colors.green);
	const startTime = Date.now();

	try {
		await build({
			logLevel: "info",
			build: {
				outDir: BUILD_DIR,
				emptyOutDir: true
			}
		});

		metrics.initialBuildTime = Date.now() - startTime;
		log(`Initial build completed in ${(metrics.initialBuildTime / 1000).toFixed(2)}s`, colors.green);
		return true;
	} catch (err) {
		error(`Initial build failed: ${err.message}`);
		console.error(err);
		return false;
	}
};

// Ensure the build directory has all required Shopify theme files
const ensureShopifyThemeStructure = async () => {
	log("Verifying Shopify theme structure...", colors.magenta);

	// Required directories for a Shopify theme
	const requiredDirs = ["assets", "config", "layout", "locales", "sections", "snippets", "templates", "templates/customers"];

	// Required files for a modern Shopify theme
	const requiredFiles = [
		{
			path: "config/settings_schema.json",
			content: JSON.stringify(
				[
					{
						name: "theme_info",
						theme_name: "Curalife Theme",
						theme_version: "1.0.0",
						theme_author: "Curalife",
						theme_documentation_url: "",
						theme_support_url: ""
					}
				],
				null,
				2
			)
		},
		{
			path: "theme.json",
			content: JSON.stringify(
				{
					name: "Curalife Theme",
					version: "1.0.0"
				},
				null,
				2
			)
		},
		{
			path: "config/settings_data.json",
			content: JSON.stringify(
				{
					current: "Default",
					presets: { Default: {} }
				},
				null,
				2
			)
		},
		{
			path: "templates/gift_card.liquid",
			content: `{% layout none %}
<!doctype html>
<html lang="{{ request.locale.iso_code }}">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="theme-color" content="{{ settings.color_background }}">
    <title>{{ 'gift_cards.issued.title' | t }}</title>
    <link rel="stylesheet" href="{{ 'gift-card.css' | asset_url }}">
  </head>
  <body>
    <div class="gift-card">
      <h1>{{ shop.name }}</h1>
      <h2>{{ 'gift_cards.issued.subtext' | t }}</h2>
      <div class="gift-card__amount">{{ gift_card.initial_value | money }}</div>
      <div class="gift-card__number">{{ gift_card.code }}</div>
      <div class="gift-card__balance">{{ gift_card.balance | money }}</div>
      {% if gift_card.expired %}
        <p>{{ 'gift_cards.issued.expired' | t }}</p>
      {% endif %}
      <img src="{{ gift_card | img_url: 'medium' }}" alt="Gift Card">
    </div>
  </body>
</html>`
		}
	];

	// Create required directories
	for (const dir of requiredDirs) {
		const dirPath = path.join(BUILD_DIR, dir);
		if (!fs.existsSync(dirPath)) {
			log(`Creating required directory: ${dir}`, colors.yellow);
			await fs.promises.mkdir(dirPath, { recursive: true });
		}
	}

	// Create required files if they don't exist
	for (const file of requiredFiles) {
		const filePath = path.join(BUILD_DIR, file.path);
		if (!fs.existsSync(filePath)) {
			log(`Creating required file: ${file.path}`, colors.yellow);

			// Create directory if it doesn't exist
			const dirPath = path.dirname(filePath);
			if (!fs.existsSync(dirPath)) {
				await fs.promises.mkdir(dirPath, { recursive: true });
			}

			// Write file content
			await fs.promises.writeFile(filePath, file.content);
		}
	}

	// Ensure we have a basic theme.liquid if none exists
	const themeLayoutPath = path.join(BUILD_DIR, "layout", "theme.liquid");
	if (!fs.existsSync(themeLayoutPath)) {
		log("Creating minimal theme.liquid (required by Shopify)", colors.yellow);

		const basicThemeLayout = `
<!doctype html>
<html>
	<head>
		<meta charset="utf-8">
		<meta http-equiv="X-UA-Compatible" content="IE=edge">
		<meta name="viewport" content="width=device-width,initial-scale=1">
		<title>{{ page_title }}</title>
		{{ content_for_header }}
	</head>
	<body>
		{{ content_for_layout }}
	</body>
</html>
		`.trim();

		await fs.promises.writeFile(themeLayoutPath, basicThemeLayout);
	}

	log("Shopify theme structure verification complete", colors.green);
};

// Copy a file to the build directory
const copyFile = async (srcPath, relativePath) => {
	// Use file mappings to determine destination path
	let destinationPath = null;
	let needsVite = false;

	// Find the appropriate mapping for this file
	for (const mapping of fileTypeMappings) {
		const match = srcPath.match(mapping.pattern);
		if (match) {
			destinationPath = mapping.destDir(match);
			needsVite = mapping.needsVite;
			break;
		}
	}

	// If no mapping found or file needs Vite, skip direct copying
	if (!destinationPath || needsVite) {
		return false;
	}

	try {
		// Create the destination directory if it doesn't exist
		const destDir = path.dirname(destinationPath);
		await fs.promises.mkdir(destDir, { recursive: true });

		// Copy the file
		await fs.promises.copyFile(srcPath, destinationPath);
		metrics.filesCopied++;

		log(`Copied: ${path.relative(SRC_DIR, srcPath)} -> ${path.relative(BUILD_DIR, destinationPath)}`, colors.green);
		return true;
	} catch (err) {
		// Handle EPERM errors gracefully (file locked/in use)
		if (err.code === "EPERM") {
			log(`File locked, will retry: ${path.relative(SRC_DIR, srcPath)}`, colors.yellow);
			// Queue retry after a short delay
			setTimeout(() => copyFile(srcPath, relativePath), 500);
			return false;
		}

		error(`Failed to copy file ${srcPath}: ${err.message}`);
		return false;
	}
};

// Delete a file from the build directory
const deleteFile = async srcPath => {
	// Use file mappings to determine destination path
	let destinationPath = null;

	// Find the appropriate mapping for this file
	for (const mapping of fileTypeMappings) {
		const match = srcPath.match(mapping.pattern);
		if (match) {
			destinationPath = mapping.destDir(match);
			break;
		}
	}

	if (!destinationPath) {
		return false;
	}

	try {
		// Check if the file exists before attempting to delete
		if (fs.existsSync(destinationPath)) {
			await fs.promises.unlink(destinationPath);
			metrics.filesDeleted++;
			log(`Deleted: ${path.relative(BUILD_DIR, destinationPath)}`, colors.yellow);
		}
		return true;
	} catch (err) {
		error(`Failed to delete file ${destinationPath}: ${err.message}`);
		return false;
	}
};

// Set up file watcher for non-Vite files
const setupFileWatcher = () => {
	// Define patterns for files to watch
	const watchPatterns = [
		// Watch all files in src
		path.join(SRC_DIR, "**", "*"),
		// Exclude node_modules and hidden files/folders
		"!node_modules/**",
		"!.*/**"
	];

	log("Setting up file watcher...", colors.magenta);

	// Create a file watcher with chokidar
	const watcher = chokidar.watch(watchPatterns, {
		ignored: [
			// Ignore dot files/folders
			/(^|[\/\\])\../,
			// Ignore node_modules
			/node_modules/,
			// Ignore build output
			new RegExp(BUILD_DIR),
			// Only listen for file changes on JS and CSS if we're using Vite to process them
			/\.js$/,
			/\.css$/,
			/\.scss$/
		],
		persistent: true
	});

	// Debounce function for file operations to prevent multiple rapid changes
	let debounceTimers = {};

	const debouncedCopyFile = filePath => {
		const relativePath = path.relative(SRC_DIR, filePath);

		// Cancel previous timer for this file
		if (debounceTimers[filePath]) {
			clearTimeout(debounceTimers[filePath]);
		}

		// Set a new timer
		debounceTimers[filePath] = setTimeout(async () => {
			await copyFile(filePath, relativePath);
			delete debounceTimers[filePath];
		}, 100);
	};

	const debouncedDeleteFile = filePath => {
		// Cancel previous timer for this file
		if (debounceTimers[filePath]) {
			clearTimeout(debounceTimers[filePath]);
		}

		// Set a new timer
		debounceTimers[filePath] = setTimeout(async () => {
			await deleteFile(filePath);
			delete debounceTimers[filePath];
		}, 100);
	};

	// Set up event handlers
	watcher
		.on("add", path => debouncedCopyFile(path))
		.on("change", path => debouncedCopyFile(path))
		.on("unlink", path => debouncedDeleteFile(path));

	// Log when the watcher is ready
	watcher.on("ready", () => {
		log("File watcher initialized and ready", colors.green);
	});

	return watcher;
};

// Set up Vite watcher for JavaScript and CSS/SCSS files
const setupViteWatcher = () => {
	log("Setting up Vite watcher for JS and CSS files...", colors.magenta);

	// Patterns for files that need Vite processing
	const vitePatterns = [path.join(SRC_DIR, "scripts", "**", "*.js"), path.join(SRC_DIR, "styles", "**", "*.{css,scss}"), path.join(SRC_DIR, "css", "**", "*.{css,scss}")];

	// Create a file watcher with chokidar
	const viteWatcher = chokidar.watch(vitePatterns, {
		ignored: /(^|[\/\\])\../,
		persistent: true
	});

	// Debounce Vite rebuilds to prevent multiple rapid builds
	let rebuildTimer = null;
	let pendingRebuild = false;

	const debouncedRebuild = () => {
		// If a rebuild is already scheduled, just mark that another change happened
		if (rebuildTimer) {
			pendingRebuild = true;
			return;
		}

		// Schedule a rebuild
		rebuildTimer = setTimeout(async () => {
			log("Running Vite rebuild for JS/CSS changes...", colors.green);
			try {
				const startTime = Date.now();

				await build({
					logLevel: "info",
					build: {
						// Don't empty the output directory for incremental builds
						emptyOutDir: false
					}
				});

				metrics.viteRebuildCount++;
				const duration = ((Date.now() - startTime) / 1000).toFixed(2);
				log(`Vite rebuild completed in ${duration}s`, colors.green);

				// If another change happened during this build, schedule another one
				if (pendingRebuild) {
					pendingRebuild = false;
					rebuildTimer = null;
					debouncedRebuild();
				} else {
					rebuildTimer = null;
				}
			} catch (err) {
				error(`Vite rebuild failed: ${err.message}`);
				console.error(err);
				rebuildTimer = null;
				pendingRebuild = false;
			}
		}, 500); // Wait for 500ms of inactivity before rebuilding
	};

	// Set up event handlers
	viteWatcher
		.on("add", path => {
			log(`JS/CSS file added: ${path}`, colors.cyan);
			debouncedRebuild();
		})
		.on("change", path => {
			log(`JS/CSS file changed: ${path}`, colors.cyan);
			debouncedRebuild();
		})
		.on("unlink", path => {
			log(`JS/CSS file deleted: ${path}`, colors.yellow);
			// Always trigger a rebuild for deletions
			debouncedRebuild();
		});

	// Log when the watcher is ready
	viteWatcher.on("ready", () => {
		log("Vite watcher initialized and ready", colors.green);
	});

	return viteWatcher;
};

// Create a shopify.theme.toml file in the build directory
const createShopifyThemeConfig = async () => {
	const configPath = path.join(BUILD_DIR, "shopify.theme.toml");

	log("Creating Shopify theme configuration file...", colors.yellow);

	const configContent = `
# This file contains theme configuration for the Shopify CLI.
# It helps Shopify recognize this directory as a valid theme.
# Learn more: https://shopify.dev/docs/themes/tools/cli

[environments]
development = { theme_directory = "./", ignored_paths = ["node_modules", ".git", ".github", ".vscode"] }
`;

	await fs.promises.writeFile(configPath, configContent.trim());
	log("Shopify theme configuration file created", colors.green);
};

// Check if the user is authenticated with Shopify CLI
const checkShopifyAuth = async () => {
	try {
		log("Checking Shopify CLI authentication status...", colors.magenta);

		// In newer Shopify CLI versions, there's no direct auth status command
		// The best way to check is to try a simple command that requires auth
		const checkCmd = spawn("shopify", ["theme", "list", "--json"], { shell: true });
		let authOutput = "";

		checkCmd.stdout.on("data", data => {
			authOutput += data.toString();
		});

		checkCmd.stderr.on("data", data => {
			authOutput += data.toString();
		});

		await new Promise((resolve, reject) => {
			checkCmd.on("close", code => {
				if (code !== 0 || authOutput.includes("Authentication") || authOutput.includes("authenticate") || authOutput.includes("login")) {
					log("Not authenticated with Shopify CLI", colors.yellow);

					// Show authentication instructions
					log("\nTo use Shopify CLI, you need to authenticate:", colors.yellow);
					log("1. Run 'shopify theme dev --store YOUR-STORE-NAME' manually in your terminal", colors.cyan);
					log("2. Follow the browser prompts to log in to your Shopify Partner account", colors.cyan);
					log("3. After successful login, you can ctrl-c to stop the dev server", colors.cyan);
					log("4. Re-run this script after authentication", colors.cyan);

					reject(new Error("Shopify CLI authentication required"));
				} else {
					log("Shopify CLI authenticated", colors.green);
					resolve();
				}
			});
		});

		return true;
	} catch (err) {
		error(`Authentication check failed: ${err.message}`);
		return false;
	}
};

// Global config for local-only mode
let localOnlyMode = false;

// Run a network connectivity test to Shopify's API
const testShopifyConnectivity = async () => {
	log("Testing connectivity to Shopify API...", colors.magenta);

	return new Promise(resolve => {
		const req = https.get("https://curalife-commerce.myshopify.com/admin/api/2025-01/graphql.json", { timeout: 10000 }, res => {
			log(`Shopify API response: ${res.statusCode}`, colors.green);
			resolve(true);
		});

		req.on("timeout", () => {
			error("Connection to Shopify API timed out");
			req.destroy();
			resolve(false);
		});

		req.on("error", err => {
			error(`Connection to Shopify API failed: ${err.message}`);
			resolve(false);
		});
	});
};

// Start a local server for theme development without Shopify API
const startLocalOnlyServer = async () => {
	log("\n==== STARTING IN LOCAL-ONLY MODE ====", colors.yellow);
	log("This mode allows you to develop without connecting to Shopify API", colors.yellow);
	log("• All file changes will be processed locally", colors.cyan);
	log("• No synchronization with Shopify store will occur", colors.cyan);
	log("• Preview in your browser at: http://localhost:3000", colors.cyan);
	log("====================================\n", colors.yellow);

	// Create a simple HTTP server to serve the theme
	// Using the ES Module imports instead of require
	const BUILD_DIR = path.join(__dirname, "Curalife-Theme-Build");

	// Create a simple index page for navigation if it doesn't exist
	const indexFilePath = path.join(BUILD_DIR, "local-dev-index.html");
	if (!fs.existsSync(indexFilePath)) {
		// Create a simple navigation page for local development
		const indexContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CuraLife Theme Local Development</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        header {
            background-color: #f8f9fa;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 5px;
            border-left: 5px solid #0082e6;
        }
        h1 {
            margin-top: 0;
            color: #0082e6;
        }
        .template-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        .template-card {
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 15px;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .template-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }
        .template-card h3 {
            margin-top: 0;
            color: #0082e6;
        }
        .warning {
            background-color: #fff3cd;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <header>
        <h1>CuraLife Theme - Local Development</h1>
        <p>This is a local development environment for your Shopify theme. Since you're running in local-only mode,
           you won't be able to access Shopify data or use Liquid variables.</p>
    </header>

    <div class="warning">
        <strong>Note:</strong> In local-only mode, Liquid templates are displayed as raw code and Shopify data is not available.
        This mode is primarily for editing static assets, CSS and JavaScript.
    </div>

    <h2>Template Directory</h2>
    <div class="template-list" id="template-list">
        <!-- Template cards will be inserted here by JavaScript -->
    </div>

    <script>
        // Fetch directory listing and create navigation cards
        fetch('/api/directory-listing')
            .then(response => response.json())
            .then(data => {
                const templateList = document.getElementById('template-list');

                // Create sections for different template types
                const sections = {
                    'layouts': {title: 'Layout Templates', files: []},
                    'templates': {title: 'Page Templates', files: []},
                    'sections': {title: 'Section Templates', files: []},
                    'snippets': {title: 'Snippets', files: []},
                    'assets': {title: 'Assets', files: []}
                };

                // Sort files into sections
                data.forEach(file => {
                    const parts = file.split('/');
                    if (parts.length > 1) {
                        const section = parts[0];
                        if (sections[section]) {
                            sections[section].files.push(file);
                        }
                    }
                });

                // Create HTML for each section
                for (const [key, section] of Object.entries(sections)) {
                    if (section.files.length > 0) {
                        const sectionTitle = document.createElement('h2');
                        sectionTitle.textContent = section.title;
                        templateList.appendChild(sectionTitle);

                        const sectionGrid = document.createElement('div');
                        sectionGrid.className = 'template-list';

                        section.files.forEach(file => {
                            const card = document.createElement('div');
                            card.className = 'template-card';

                            const filename = file.split('/').pop();
                            const title = document.createElement('h3');
                            title.textContent = filename;

                            const link = document.createElement('a');
                            link.href = '/' + file;
                            link.textContent = 'View template';

                            card.appendChild(title);
                            card.appendChild(link);
                            sectionGrid.appendChild(card);
                        });

                        templateList.appendChild(sectionGrid);
                    }
                }
            })
            .catch(error => {
                console.error('Error loading template list:', error);
                document.getElementById('template-list').innerHTML = '<p>Error loading template list. Please refresh the page to try again.</p>';
            });
    </script>
</body>
</html>
        `;
		fs.writeFileSync(indexFilePath, indexContent);
	}

	// Create a custom 404 page
	const notFoundFilePath = path.join(BUILD_DIR, "404-dev.html");
	if (!fs.existsSync(notFoundFilePath)) {
		const notFoundContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Not Found - CuraLife Theme Development</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 60px auto;
            padding: 20px;
            text-align: center;
        }
        h1 {
            font-size: 48px;
            margin-bottom: 0;
            color: #0082e6;
        }
        h2 {
            font-weight: normal;
            margin-top: 0;
            margin-bottom: 30px;
            color: #666;
        }
        .card {
            background-color: #f8f9fa;
            border-radius: 5px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        .actions {
            margin-top: 30px;
        }
        .btn {
            display: inline-block;
            background-color: #0082e6;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            text-decoration: none;
            margin: 0 10px;
            transition: background-color 0.2s;
        }
        .btn:hover {
            background-color: #0068b8;
        }
        .btn.secondary {
            background-color: #6c757d;
        }
        .btn.secondary:hover {
            background-color: #5a6268;
        }
        .note {
            margin-top: 30px;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you're looking for doesn't exist in this local development environment.</p>
        <p>Since you're running in local-only mode, many Shopify theme features aren't available.</p>

        <div class="actions">
            <a href="/" class="btn">Go to Home</a>
            <a href="javascript:history.back()" class="btn secondary">Go Back</a>
        </div>
    </div>

    <div class="note">
        <p><strong>Note:</strong> In local-only mode, Liquid templates are displayed as raw code and Shopify data is not available.</p>
        <p>This mode is primarily for editing static assets, CSS and JavaScript.</p>
    </div>
</body>
</html>
        `;
		fs.writeFileSync(notFoundFilePath, notFoundContent);
	}

	// Function to recursively list directory files
	const listDirectory = (dir, baseDir, fileList = []) => {
		const files = fs.readdirSync(dir);
		files.forEach(file => {
			const filePath = path.join(dir, file);
			if (fs.statSync(filePath).isDirectory()) {
				listDirectory(filePath, baseDir, fileList);
			} else {
				fileList.push(path.relative(baseDir, filePath).replace(/\\/g, "/"));
			}
		});
		return fileList;
	};

	const server = http.createServer((req, res) => {
		// API endpoint for directory listing
		if (req.url === "/api/directory-listing") {
			try {
				const fileList = listDirectory(BUILD_DIR, BUILD_DIR);
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify(fileList));
				return;
			} catch (error) {
				res.writeHead(500, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: "Failed to list directory" }));
				return;
			}
		}

		let filePath;
		const extname = path.extname(req.url || "");

		// Default to our custom index page if no file specified
		if (req.url === "/" || req.url === "") {
			filePath = indexFilePath;
		} else {
			// Remove query parameters for file path resolution
			const urlWithoutQuery = req.url.split("?")[0];
			filePath = path.join(BUILD_DIR, urlWithoutQuery);

			// If it ends with / and doesn't have an extension, try to find index.html or similar
			if (urlWithoutQuery.endsWith("/") && !extname) {
				const potentialIndices = [path.join(filePath, "index.html"), path.join(filePath, "index.liquid"), path.join(filePath, "index.json")];

				for (const potentialPath of potentialIndices) {
					if (fs.existsSync(potentialPath)) {
						filePath = potentialPath;
						break;
					}
				}
			}
		}

		// Enhanced content type mapping
		const contentTypeMap = {
			".html": "text/html",
			".liquid": "text/html",
			".css": "text/css",
			".js": "text/javascript",
			".json": "application/json",
			".png": "image/png",
			".jpg": "image/jpg",
			".jpeg": "image/jpeg",
			".gif": "image/gif",
			".svg": "image/svg+xml",
			".woff": "font/woff",
			".woff2": "font/woff2",
			".ttf": "font/ttf",
			".eot": "application/vnd.ms-fontobject",
			".otf": "font/otf",
			".ico": "image/x-icon"
		};

		// Determine content type based on extension
		const fileExtname = path.extname(filePath);
		const contentType = contentTypeMap[fileExtname] || "text/plain";

		fs.readFile(filePath, (err, content) => {
			if (err) {
				if (err.code === "ENOENT") {
					// File not found - serve our custom 404 page
					fs.readFile(notFoundFilePath, (err, content) => {
						if (err) {
							// Even our 404 page is missing - send simple message
							res.writeHead(404);
							res.end(`File not found: ${req.url}`);
						} else {
							res.writeHead(404, { "Content-Type": "text/html" });
							res.end(content, "utf-8");
						}
					});
				} else {
					// Server error
					res.writeHead(500);
					res.end(`Server Error: ${err.code}`);
					error(`Server error when serving ${filePath}: ${err.code}`);
				}
			} else {
				// Special handling for .liquid files to make them viewable
				if (fileExtname === ".liquid") {
					// Add warning banner to liquid files
					const liquidWarning = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Liquid Template Preview</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; }
        .warning-banner { background-color: #ffcc00; color: #333; padding: 10px; text-align: center; }
        .template-content { padding: 20px; }
        pre { background-color: #f5f5f5; padding: 15px; border-radius: 5px; overflow: auto; }
    </style>
</head>
<body>
    <div class="warning-banner">
        <strong>Local Development Mode:</strong> This is a raw Liquid template. Variables and Shopify data are not processed in local-only mode.
    </div>
    <div class="template-content">
        <h1>Template Preview: ${path.basename(filePath)}</h1>
        <p><a href="/">&laquo; Back to template list</a></p>
        <h2>Raw Template Code:</h2>
        <pre>${content.toString().replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
    </div>
</body>
</html>`;
					res.writeHead(200, { "Content-Type": "text/html" });
					res.end(liquidWarning, "utf-8");
				} else {
					// Success - send file normally
					res.writeHead(200, { "Content-Type": contentType });
					res.end(content, "utf-8");
				}
			}
		});
	});

	const PORT = process.env.PORT || 3000;
	server.listen(PORT, () => {
		log(`Local-only server running at http://localhost:${PORT}`, colors.green);
		log(`Use http://localhost:${PORT} to browse theme files`, colors.cyan);
		log("Note: Liquid templates will display as-is without Shopify data", colors.yellow);
	});

	return server;
};

// Handle network timeout errors with exponential backoff
const handleNetworkTimeout = async (retryCount = 0, maxRetries = 5) => {
	if (retryCount >= maxRetries) {
		error(`Network connection failed after ${maxRetries} attempts.`);

		log("\nPlease check your network:", colors.yellow);
		log("1. Internet connection - ensure you have a stable connection", colors.cyan);
		log("2. Firewall settings - ensure Shopify API domains aren't blocked", colors.cyan);
		log("3. VPN configuration - try disconnecting from VPN if you're using one", colors.cyan);
		log("4. DNS settings - try using alternative DNS servers", colors.cyan);
		log("5. Shopify status - check if Shopify is experiencing any outages", colors.cyan);

		log("\nTerminating due to connection failure. Please try again when your network connection is stable.", colors.red);

		// Exit process with error code
		process.exit(1);
		return false;
	}

	const waitTime = Math.min(2000 * Math.pow(2, retryCount), 30000); // Exponential backoff with 30s max
	log(`Network timeout detected. Waiting ${waitTime / 1000}s before retry ${retryCount + 1}/${maxRetries}...`, colors.yellow);

	return new Promise(resolve => setTimeout(() => resolve(true), waitTime));
};

// Start Shopify theme dev server with automatic Yes response
const startShopifyThemeDev = async (retryCount = 0) => {
	// Get the absolute path of the build directory for better reliability
	const buildDirPath = path.resolve(BUILD_DIR);

	log(`Starting Shopify theme dev for: ${buildDirPath}`, colors.magenta);

	try {
		// Check if Shopify CLI is installed
		const checkCmd = spawn("shopify", ["version"], { shell: true });
		let versionOutput = "";

		checkCmd.stdout.on("data", data => {
			versionOutput += data.toString();
		});

		await new Promise((resolve, reject) => {
			checkCmd.on("close", code => {
				if (code !== 0) {
					reject(new Error("Shopify CLI not found or not working. Is it installed?"));
				} else {
					log(`Shopify CLI detected: ${versionOutput.trim()}`, colors.green);
					resolve();
				}
			});
		});

		// Check authentication status
		const isAuthenticated = await checkShopifyAuth();
		if (!isAuthenticated) {
			return null;
		}

		// Ensure the theme directory structure is valid
		await ensureShopifyThemeStructure();

		// Create shopify.theme.toml for newer CLI versions
		await createShopifyThemeConfig();

		// For Windows, use a direct approach instead of a batch file
		if (process.platform === "win32") {
			// Instead of a batch file, directly change directory and run the command
			log("Starting Shopify CLI in theme directory...", colors.magenta);

			// Save current directory
			const originalDir = process.cwd();

			try {
				// Change to the build directory first
				process.chdir(buildDirPath);
				log(`Changed working directory to: ${process.cwd()}`, colors.magenta);

				// Start the Shopify CLI directly from the theme directory
				const cmdProcess = spawn("cmd.exe", ["/c", "shopify theme dev --path . --theme-editor-sync --store curalife-commerce"], {
					shell: true,
					stdio: "inherit",
					windowsVerbatimArguments: true
				});

				// Handle process events
				cmdProcess.on("error", async err => {
					error(`Failed to start Shopify CLI: ${err.message}`);
					// Change back to original directory
					process.chdir(originalDir);

					// Provide more helpful error messages for common issues
					if (err.message.includes("ETIMEDOUT") || err.message.includes("timeout") || err.message.includes("connection failed")) {
						log("\nNetwork timeout detected. Please check:", colors.yellow);
						log("1. Your internet connection is working", colors.cyan);
						log("2. You're authenticated with Shopify (run 'shopify theme dev --store curalife-commerce')", colors.cyan);
						log("3. The Shopify store is accessible", colors.cyan);
						log("4. Any firewall or VPN settings that might block connections", colors.cyan);

						if (retryCount < 3) {
							const shouldRetry = await handleNetworkTimeout(retryCount);
							if (shouldRetry) {
								log(`Retrying (${retryCount + 1}/3)...`, colors.yellow);
								setTimeout(() => startShopifyThemeDev(retryCount + 1), 1000);
							}
						}
					} else if (retryCount < 3) {
						log(`Retrying (${retryCount + 1}/3) in 5 seconds...`, colors.yellow);
						setTimeout(() => startShopifyThemeDev(retryCount + 1), 5000);
					}
				});

				// Look for timeout errors in stdout/stderr
				cmdProcess.stdout?.on("data", async data => {
					const output = data.toString();
					if (output.includes("ETIMEDOUT") || output.includes("failed, reason: connect") || output.includes("network timeout") || output.includes("connection failed")) {
						if (retryCount < 3) {
							error("Network timeout detected in CLI output");
							const shouldRetry = await handleNetworkTimeout(retryCount);
							if (shouldRetry) {
								// Kill current process
								cmdProcess.kill();
								log(`Retrying (${retryCount + 1}/3)...`, colors.yellow);
								setTimeout(() => startShopifyThemeDev(retryCount + 1), 1000);
							}
						}
					}
				});

				cmdProcess.stderr?.on("data", async data => {
					const output = data.toString();
					if (output.includes("ETIMEDOUT") || output.includes("failed, reason: connect") || output.includes("network timeout") || output.includes("connection failed")) {
						if (retryCount < 3) {
							error("Network timeout detected in CLI error output");
							const shouldRetry = await handleNetworkTimeout(retryCount);
							if (shouldRetry) {
								// Kill current process
								cmdProcess.kill();
								log(`Retrying (${retryCount + 1}/3)...`, colors.yellow);
								setTimeout(() => startShopifyThemeDev(retryCount + 1), 1000);
							}
						}
					}
				});

				// Change back to the original directory when done
				cmdProcess.on("exit", () => {
					process.chdir(originalDir);
				});

				return cmdProcess;
			} catch (err) {
				// Make sure we change back to the original directory even on error
				process.chdir(originalDir);
				throw err;
			}
		} else {
			// Unix-based systems - use expect-like behavior
			const originalDir = process.cwd();
			process.chdir(buildDirPath);

			// Create a shell script that automatically answers 'yes'
			const scriptPath = path.join(__dirname, "shopify-dev-temp.sh");
			const scriptContent = `
#!/bin/bash
cd "${buildDirPath}"
shopify theme dev --path . --theme-editor-sync --store curalife-commerce
`;

			await fs.promises.writeFile(scriptPath, scriptContent);
			await fs.promises.chmod(scriptPath, 0o755); // Make executable

			const cmdProcess = spawn(scriptPath, [], {
				shell: true,
				stdio: "inherit"
			});

			// Monitor output for timeouts
			cmdProcess.stdout?.on("data", async data => {
				const output = data.toString();
				if (output.includes("ETIMEDOUT") || output.includes("failed, reason: connect") || output.includes("network timeout") || output.includes("connection failed")) {
					if (retryCount < 3) {
						error("Network timeout detected in CLI output");
						const shouldRetry = await handleNetworkTimeout(retryCount);
						if (shouldRetry) {
							// Kill current process
							cmdProcess.kill();
							log(`Retrying (${retryCount + 1}/3)...`, colors.yellow);
							setTimeout(() => startShopifyThemeDev(retryCount + 1), 1000);
						}
					}
				}
			});

			cmdProcess.stderr?.on("data", async data => {
				const output = data.toString();
				if (output.includes("ETIMEDOUT") || output.includes("failed, reason: connect") || output.includes("network timeout") || output.includes("connection failed")) {
					if (retryCount < 3) {
						error("Network timeout detected in CLI error output");
						const shouldRetry = await handleNetworkTimeout(retryCount);
						if (shouldRetry) {
							// Kill current process
							cmdProcess.kill();
							log(`Retrying (${retryCount + 1}/3)...`, colors.yellow);
							setTimeout(() => startShopifyThemeDev(retryCount + 1), 1000);
						}
					}
				}
			});

			// Clean up script after use
			cmdProcess.on("exit", () => {
				try {
					fs.unlinkSync(scriptPath);
				} catch (err) {
					// Ignore errors on cleanup
				}
			});

			cmdProcess.on("error", async err => {
				error(`Error starting Shopify theme dev: ${err.message}`);

				// Provide more helpful error messages for common issues
				if (err.message.includes("ETIMEDOUT") || err.message.includes("timeout") || err.message.includes("connection failed")) {
					log("\nNetwork timeout detected. Please check:", colors.yellow);
					log("1. Your internet connection is working", colors.cyan);
					log("2. You're authenticated with Shopify (run 'shopify theme dev --store curalife-commerce')", colors.cyan);
					log("3. The Shopify store is accessible", colors.cyan);
					log("4. Any firewall or VPN settings that might block connections", colors.cyan);

					if (retryCount < 3) {
						const shouldRetry = await handleNetworkTimeout(retryCount);
						if (shouldRetry) {
							log(`Retrying (${retryCount + 1}/3)...`, colors.yellow);
							setTimeout(() => startShopifyThemeDev(retryCount + 1), 1000);
						}
					}
				} else if (retryCount < 3) {
					log(`Retrying (${retryCount + 1}/3) in 5 seconds...`, colors.yellow);
					setTimeout(() => startShopifyThemeDev(retryCount + 1), 5000);
				}
			});

			// Return to original directory after spawning
			process.chdir(originalDir);

			return cmdProcess;
		}
	} catch (err) {
		error(`Error starting Shopify theme dev: ${err.message}`);

		if (retryCount < 3) {
			log(`Retrying (${retryCount + 1}/3) in 5 seconds...`, colors.yellow);
			setTimeout(() => startShopifyThemeDev(retryCount + 1), 5000);
		} else {
			// Provide helpful guidance
			log("\nPlease make sure:", colors.yellow);
			log("1. You have Shopify CLI installed:", colors.yellow);
			log("   npm install -g @shopify/cli @shopify/theme", colors.cyan);
			log("2. You are authenticated with Shopify:", colors.yellow);
			log("   shopify auth login", colors.cyan);
			log("3. Your theme directory has the correct structure:", colors.yellow);
			log("   - Required folders: assets, config, layout, sections, snippets, templates", colors.cyan);
			log("   - Required files: config/settings_schema.json, theme.json, layout/theme.liquid", colors.cyan);
			log("\nAlternative approach - try running these commands directly:", colors.yellow);
			log(`cd "${buildDirPath}"`, colors.cyan);
			log(`shopify theme dev --path . --theme-editor-sync --store curalife-commerce`, colors.cyan);
		}

		return null;
	}
};

// Main function
const main = async () => {
	log("Starting Shopify hot reload system...", colors.green);

	// Ensure build directory exists
	if (!fs.existsSync(BUILD_DIR)) {
		await fs.promises.mkdir(BUILD_DIR, { recursive: true });
	}

	// Run initial Vite build
	const buildSuccess = await runInitialBuild();
	if (!buildSuccess) {
		error("Initial build failed, cannot continue");
		process.exit(1);
	}

	// Set up watchers
	const fileWatcher = setupFileWatcher();
	const viteWatcher = setupViteWatcher();

	// Test connectivity to Shopify API
	const isConnected = await testShopifyConnectivity();
	if (!isConnected) {
		error("Failed to connect to Shopify API, terminating script.");
		process.exit(1);
	}

	// Start Shopify theme development
	const cmdProcess = await startShopifyThemeDev();
	if (!cmdProcess) {
		error("Failed to start Shopify theme development");
		process.exit(1);
	}

	// Set up periodic metrics reporting
	const statsInterval = setInterval(() => {
		printMetrics();
	}, 60000); // Print stats every minute

	// Handle process termination
	const cleanup = () => {
		log("Shutting down...", colors.yellow);

		// Stop the watchers
		if (fileWatcher) fileWatcher.close();
		if (viteWatcher) viteWatcher.close();

		// Clear intervals
		clearInterval(statsInterval);

		// Print final metrics
		printMetrics();

		// Exit cleanly
		process.exit(0);
	};

	// Set up cleanup handlers
	process.on("SIGINT", cleanup);
	process.on("SIGTERM", cleanup);
	process.on("exit", cleanup);

	log("\n✨ Development environment ready!", colors.green);
	log("• Watching for file changes in src directory", colors.cyan);
	log("• Vite is handling JS and CSS processing", colors.cyan);
	log("• Shopify theme dev server should be starting", colors.cyan);
	log("• Press Ctrl+C to exit\n", colors.cyan);
};

// Start the main function
main().catch(err => {
	error(`Unhandled error: ${err.message}`);
	console.error(err);
	process.exit(1);
});
