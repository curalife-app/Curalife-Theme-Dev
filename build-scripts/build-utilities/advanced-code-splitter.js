/**
 * Advanced Code Splitting System
 *
 * Implements intelligent code splitting strategies for Shopify themes:
 * - Route-based code splitting (different pages)
 * - Component-based splitting (reusable components)
 * - Dynamic import optimization (lazy loading)
 * - Critical path optimization (above-the-fold content)
 * - Bundle dependency analysis
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { glob } from "glob";
import { createHash } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AdvancedCodeSplitter {
	constructor(options = {}) {
		this.options = {
			// Enable different splitting strategies
			enableRouteSplitting: options.enableRouteSplitting ?? true,
			enableComponentSplitting: options.enableComponentSplitting ?? true,
			enableDynamicImports: options.enableDynamicImports ?? true,
			enableCriticalPath: options.enableCriticalPath ?? true,

			// Size thresholds
			minChunkSize: options.minChunkSize ?? 10 * 1024, // 10KB
			maxChunkSize: options.maxChunkSize ?? 250 * 1024, // 250KB

			// Paths
			srcDir: options.srcDir ?? path.join(__dirname, "../../src"),
			buildDir: options.buildDir ?? path.join(__dirname, "../../Curalife-Theme-Build"),

			// Output settings
			generateManifest: options.generateManifest ?? true,
			enableSourceMaps: options.enableSourceMaps ?? false,

			...options
		};

		this.chunks = new Map();
		this.dependencies = new Map();
		this.criticalModules = new Set();
		this.routeMap = new Map();
		this.componentRegistry = new Map();
		this.manifest = {
			version: "1.0.0",
			chunks: {},
			routes: {},
			components: {},
			critical: [],
			lazy: [],
			dependencies: {}
		};
	}

	// Main entry point for code splitting analysis
	async analyze() {
		console.log("🔍 Starting Advanced Code Splitting Analysis...");

		try {
			// Step 1: Discover and analyze all source files
			await this.discoverSourceFiles();

			// Step 2: Build dependency graph
			await this.buildDependencyGraph();

			// Step 3: Identify critical path modules
			await this.identifyCriticalPath();

			// Step 4: Apply splitting strategies
			if (this.options.enableRouteSplitting) {
				await this.performRouteSplitting();
			}

			if (this.options.enableComponentSplitting) {
				await this.performComponentSplitting();
			}

			if (this.options.enableDynamicImports) {
				await this.optimizeDynamicImports();
			}

			// Step 5: Generate optimized bundle configuration
			await this.generateBundleConfig();

			// Step 6: Create manifest and reports
			await this.generateManifest();

			console.log("✅ Code Splitting Analysis Complete");
			return this.manifest;
		} catch (error) {
			console.error("❌ Code Splitting Analysis Failed:", error);
			throw error;
		}
	}

	// Discover all source files and classify them
	async discoverSourceFiles() {
		console.log("📁 Discovering source files...");

		const patterns = [
			path.join(this.options.srcDir, "scripts/**/*.js"),
			path.join(this.options.srcDir, "liquid/**/*.liquid"),
			path.join(this.options.srcDir, "styles/**/*.css"),
			path.join(this.options.srcDir, "styles/**/*.scss")
		];

		for (const pattern of patterns) {
			const files = await glob(pattern);

			for (const filePath of files) {
				await this.analyzeFile(filePath);
			}
		}

		console.log(`📊 Analyzed ${this.chunks.size} source files`);
	}

	// Analyze individual file and extract metadata
	async analyzeFile(filePath) {
		const content = await fs.promises.readFile(filePath, "utf8");
		const relativePath = path.relative(this.options.srcDir, filePath);
		const ext = path.extname(filePath);

		const fileInfo = {
			path: filePath,
			relativePath,
			content,
			size: Buffer.byteLength(content, "utf8"),
			type: this.getFileType(ext),
			hash: this.generateFileHash(content),
			imports: [],
			exports: [],
			dependencies: new Set(),
			route: null,
			component: null,
			critical: false,
			lazy: false
		};

		// Extract imports/dependencies based on file type
		if (ext === ".js") {
			fileInfo.imports = this.extractJSImports(content);
			fileInfo.exports = this.extractJSExports(content);
		} else if (ext === ".css" || ext === ".scss") {
			fileInfo.imports = this.extractCSSImports(content);
		} else if (ext === ".liquid") {
			fileInfo.dependencies = this.extractLiquidDependencies(content);
		}

		// Classify file purpose
		this.classifyFile(fileInfo);

		this.chunks.set(relativePath, fileInfo);
	}

	// Extract JavaScript imports
	extractJSImports(content) {
		const imports = [];

		// ES6 imports
		const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"`]([^'"`]+)['"`]/g;
		let match;

		while ((match = importRegex.exec(content)) !== null) {
			imports.push({
				type: "es6",
				module: match[1],
				dynamic: false
			});
		}

		// Dynamic imports
		const dynamicImportRegex = /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
		while ((match = dynamicImportRegex.exec(content)) !== null) {
			imports.push({
				type: "dynamic",
				module: match[1],
				dynamic: true
			});
		}

		// CommonJS requires
		const requireRegex = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
		while ((match = requireRegex.exec(content)) !== null) {
			imports.push({
				type: "commonjs",
				module: match[1],
				dynamic: false
			});
		}

		return imports;
	}

	// Extract JavaScript exports
	extractJSExports(content) {
		const exports = [];

		// Named exports
		const namedExportRegex = /export\s+(?:const|let|var|function|class)\s+(\w+)/g;
		let match;

		while ((match = namedExportRegex.exec(content)) !== null) {
			exports.push({
				type: "named",
				name: match[1]
			});
		}

		// Default exports
		const defaultExportRegex = /export\s+default\s+(?:(?:const|let|var|function|class)\s+)?(\w+)?/g;
		while ((match = defaultExportRegex.exec(content)) !== null) {
			exports.push({
				type: "default",
				name: match[1] || "default"
			});
		}

		return exports;
	}

	// Extract CSS imports
	extractCSSImports(content) {
		const imports = [];

		// @import statements
		const importRegex = /@import\s+['"`]([^'"`]+)['"`]/g;
		let match;

		while ((match = importRegex.exec(content)) !== null) {
			imports.push({
				type: "css",
				module: match[1],
				dynamic: false
			});
		}

		return imports;
	}

	// Extract Liquid template dependencies
	extractLiquidDependencies(content) {
		const dependencies = new Set();

		// Include statements
		const includeRegex = /{%\s*include\s+['"`]([^'"`]+)['"`]/g;
		let match;

		while ((match = includeRegex.exec(content)) !== null) {
			dependencies.add(match[1]);
		}

		// Render statements
		const renderRegex = /{%\s*render\s+['"`]([^'"`]+)['"`]/g;
		while ((match = renderRegex.exec(content)) !== null) {
			dependencies.add(match[1]);
		}

		// Section references
		const sectionRegex = /{%\s*section\s+['"`]([^'"`]+)['"`]/g;
		while ((match = sectionRegex.exec(content)) !== null) {
			dependencies.add(match[1]);
		}

		return dependencies;
	}

	// Classify file based on path and content
	classifyFile(fileInfo) {
		const { relativePath, content } = fileInfo;

		// Route-based classification
		if (relativePath.includes("templates/")) {
			const template = path.basename(relativePath, ".liquid");
			fileInfo.route = template;
			this.routeMap.set(template, fileInfo);
		}

		// Component classification
		if (relativePath.includes("components/") || relativePath.includes("snippets/")) {
			const component = path.basename(relativePath, path.extname(relativePath));
			fileInfo.component = component;
			this.componentRegistry.set(component, fileInfo);
		}

		// Critical path detection (basic heuristics)
		if (this.isCriticalFile(relativePath, content)) {
			fileInfo.critical = true;
			this.criticalModules.add(relativePath);
		}

		// Lazy loading candidates
		if (this.isLazyCandidate(relativePath, content)) {
			fileInfo.lazy = true;
		}
	}

	// Determine if file is critical for initial page load
	isCriticalFile(relativePath, content) {
		// Critical paths
		const criticalPaths = ["layout/", "sections/header", "sections/footer", "snippets/critical", "styles/critical", "scripts/performance"];

		if (criticalPaths.some(path => relativePath.includes(path))) {
			return true;
		}

		// Critical content indicators
		const criticalIndicators = ["document.addEventListener", "DOMContentLoaded", "critical", "above-the-fold", "hero", "header", "navigation"];

		return criticalIndicators.some(indicator => content.includes(indicator));
	}

	// Determine if file is a candidate for lazy loading
	isLazyCandidate(relativePath, content) {
		// Lazy loading paths
		const lazyPaths = ["components/modal", "components/carousel", "components/accordion", "sections/footer", "sections/testimonials", "scripts/analytics", "scripts/tracking"];

		if (lazyPaths.some(path => relativePath.includes(path))) {
			return true;
		}

		// Lazy content indicators
		const lazyIndicators = ["intersection", "lazy", "defer", "modal", "popup", "carousel", "accordion", "analytics", "tracking"];

		return lazyIndicators.some(indicator => content.toLowerCase().includes(indicator));
	}

	// Build comprehensive dependency graph
	async buildDependencyGraph() {
		console.log("🕸️ Building dependency graph...");

		for (const [filePath, fileInfo] of this.chunks) {
			const deps = new Set();

			// Process imports
			for (const imp of fileInfo.imports) {
				const resolvedPath = await this.resolveImport(imp.module, filePath);
				if (resolvedPath) {
					deps.add(resolvedPath);
				}
			}

			// Process Liquid dependencies
			for (const dep of fileInfo.dependencies) {
				const resolvedPath = await this.resolveLiquidDependency(dep);
				if (resolvedPath) {
					deps.add(resolvedPath);
				}
			}

			this.dependencies.set(filePath, deps);
		}

		console.log(`📈 Built dependency graph with ${this.dependencies.size} entries`);
	}

	// Resolve import path to actual file
	async resolveImport(modulePath, fromFile) {
		// Handle relative imports
		if (modulePath.startsWith("./") || modulePath.startsWith("../")) {
			const fromDir = path.dirname(fromFile);
			const resolved = path.resolve(path.join(this.options.srcDir, fromDir), modulePath);

			// Try different extensions
			const extensions = [".js", ".css", ".scss"];
			for (const ext of extensions) {
				const withExt = resolved + ext;
				if (await this.fileExists(withExt)) {
					return path.relative(this.options.srcDir, withExt);
				}
			}
		}

		return null;
	}

	// Resolve Liquid dependency
	async resolveLiquidDependency(depName) {
		// Look in snippets and sections
		const possiblePaths = [path.join(this.options.srcDir, "liquid/snippets", `${depName}.liquid`), path.join(this.options.srcDir, "liquid/sections", `${depName}.liquid`)];

		for (const possiblePath of possiblePaths) {
			if (await this.fileExists(possiblePath)) {
				return path.relative(this.options.srcDir, possiblePath);
			}
		}

		return null;
	}

	// Identify critical path modules using dependency analysis
	async identifyCriticalPath() {
		console.log("🎯 Identifying critical path modules...");

		// Find entry points (templates, layouts)
		const entryPoints = Array.from(this.chunks.values()).filter(file => file.relativePath.includes("layout/") || file.relativePath.includes("templates/"));

		for (const entry of entryPoints) {
			await this.markCriticalDependencies(entry.relativePath, new Set());
		}

		console.log(`🔥 Identified ${this.criticalModules.size} critical modules`);
	}

	// Recursively mark dependencies as critical
	async markCriticalDependencies(filePath, visited) {
		if (visited.has(filePath)) return;
		visited.add(filePath);

		const fileInfo = this.chunks.get(filePath);
		if (!fileInfo) return;

		// Mark as critical if it's an immediate dependency of a critical file
		if (fileInfo.critical || visited.size === 1) {
			this.criticalModules.add(filePath);

			// Mark direct dependencies as critical too (limited depth)
			if (visited.size <= 2) {
				const deps = this.dependencies.get(filePath) || new Set();
				for (const dep of deps) {
					await this.markCriticalDependencies(dep, new Set([...visited]));
				}
			}
		}
	}

	// Perform route-based code splitting
	async performRouteSplitting() {
		console.log("🛣️ Performing route-based code splitting...");

		for (const [route, fileInfo] of this.routeMap) {
			const routeChunk = {
				name: `route-${route}`,
				files: new Set([fileInfo.relativePath]),
				dependencies: new Set(),
				critical: fileInfo.critical,
				size: fileInfo.size
			};

			// Include route-specific dependencies
			await this.collectRouteDependencies(fileInfo.relativePath, routeChunk);

			this.manifest.routes[route] = {
				chunk: routeChunk.name,
				files: Array.from(routeChunk.files),
				size: routeChunk.size,
				critical: routeChunk.critical
			};
		}

		console.log(`📍 Created ${this.routeMap.size} route-based chunks`);
	}

	// Collect dependencies specific to a route
	async collectRouteDependencies(filePath, routeChunk, visited = new Set()) {
		if (visited.has(filePath)) return;
		visited.add(filePath);

		const deps = this.dependencies.get(filePath) || new Set();

		for (const dep of deps) {
			const depInfo = this.chunks.get(dep);
			if (depInfo && !this.criticalModules.has(dep)) {
				routeChunk.files.add(dep);
				routeChunk.size += depInfo.size;

				// Recursively collect dependencies
				await this.collectRouteDependencies(dep, routeChunk, visited);
			}
		}
	}

	// Perform component-based code splitting
	async performComponentSplitting() {
		console.log("🧩 Performing component-based code splitting...");

		for (const [component, fileInfo] of this.componentRegistry) {
			// Skip critical components (they should be in main bundle)
			if (fileInfo.critical) continue;

			const componentChunk = {
				name: `component-${component}`,
				files: new Set([fileInfo.relativePath]),
				size: fileInfo.size,
				reusable: true
			};

			this.manifest.components[component] = {
				chunk: componentChunk.name,
				files: Array.from(componentChunk.files),
				size: componentChunk.size,
				lazy: fileInfo.lazy
			};
		}

		console.log(`🔧 Created ${this.componentRegistry.size} component-based chunks`);
	}

	// Optimize dynamic imports
	async optimizeDynamicImports() {
		console.log("⚡ Optimizing dynamic imports...");

		const dynamicImports = new Map();

		for (const [filePath, fileInfo] of this.chunks) {
			const dynamicImps = fileInfo.imports.filter(imp => imp.dynamic);

			if (dynamicImps.length > 0) {
				for (const imp of dynamicImps) {
					const resolvedPath = await this.resolveImport(imp.module, filePath);
					if (resolvedPath) {
						if (!dynamicImports.has(resolvedPath)) {
							dynamicImports.set(resolvedPath, []);
						}
						dynamicImports.get(resolvedPath).push(filePath);
					}
				}
			}
		}

		// Create chunks for frequently imported dynamic modules
		for (const [modulePath, importers] of dynamicImports) {
			if (importers.length > 1) {
				const moduleInfo = this.chunks.get(modulePath);
				if (moduleInfo) {
					this.manifest.lazy.push({
						chunk: `dynamic-${path.basename(modulePath, ".js")}`,
						module: modulePath,
						importers: importers,
						size: moduleInfo.size
					});
				}
			}
		}

		console.log(`💫 Optimized ${dynamicImports.size} dynamic imports`);
	}

	// Generate optimized bundle configuration
	async generateBundleConfig() {
		console.log("📦 Generating bundle configuration...");

		// Create main critical bundle
		const criticalFiles = Array.from(this.criticalModules);
		const criticalSize = criticalFiles.reduce((size, filePath) => {
			const fileInfo = this.chunks.get(filePath);
			return size + (fileInfo ? fileInfo.size : 0);
		}, 0);

		this.manifest.chunks.critical = {
			name: "critical",
			files: criticalFiles,
			size: criticalSize,
			priority: "high",
			preload: true
		};

		// Create vendor bundle for shared dependencies
		const vendorFiles = Array.from(this.chunks.values())
			.filter(file => file.relativePath.includes("node_modules") || file.relativePath.includes("vendor"))
			.map(file => file.relativePath);

		if (vendorFiles.length > 0) {
			const vendorSize = vendorFiles.reduce((size, filePath) => {
				const fileInfo = this.chunks.get(filePath);
				return size + (fileInfo ? fileInfo.size : 0);
			}, 0);

			this.manifest.chunks.vendor = {
				name: "vendor",
				files: vendorFiles,
				size: vendorSize,
				priority: "medium",
				cache: "long-term"
			};
		}

		console.log("✅ Bundle configuration generated");
	}

	// Generate comprehensive manifest
	async generateManifest() {
		if (!this.options.generateManifest) return;

		console.log("📄 Generating code splitting manifest...");

		// Add metadata
		this.manifest.generated = new Date().toISOString();
		this.manifest.stats = {
			totalFiles: this.chunks.size,
			totalSize: Array.from(this.chunks.values()).reduce((size, file) => size + file.size, 0),
			criticalModules: this.criticalModules.size,
			routes: this.routeMap.size,
			components: this.componentRegistry.size,
			lazyModules: this.manifest.lazy.length
		};

		// Calculate savings
		this.manifest.optimizations = {
			estimatedSavings: this.calculateEstimatedSavings(),
			recommendations: this.generateRecommendations()
		};

		// Write manifest file
		const manifestPath = path.join(this.options.buildDir, "code-splitting-manifest.json");
		await fs.promises.writeFile(manifestPath, JSON.stringify(this.manifest, null, 2));

		// Generate human-readable report
		await this.generateReport();

		console.log(`📊 Manifest saved to ${manifestPath}`);
	}

	// Calculate estimated performance savings
	calculateEstimatedSavings() {
		const totalSize = this.manifest.stats.totalSize;
		const criticalSize = this.manifest.chunks.critical?.size || 0;
		const lazySize = this.manifest.lazy.reduce((size, lazy) => size + lazy.size, 0);

		return {
			initialBundleReduction: Math.round(((totalSize - criticalSize) / totalSize) * 100),
			lazyLoadableSavings: this.formatBytes(lazySize),
			estimatedLoadTimeImprovement: Math.round(((totalSize - criticalSize) / 100000) * 1000) // Rough estimate
		};
	}

	// Generate optimization recommendations
	generateRecommendations() {
		const recommendations = [];

		// Large chunk recommendations
		for (const [route, routeInfo] of Object.entries(this.manifest.routes)) {
			if (routeInfo.size > this.options.maxChunkSize) {
				recommendations.push({
					type: "chunk-size",
					severity: "warning",
					message: `Route chunk '${route}' is large (${this.formatBytes(routeInfo.size)})`,
					suggestion: "Consider further component splitting or lazy loading"
				});
			}
		}

		// Critical path recommendations
		if (this.manifest.chunks.critical && this.manifest.chunks.critical.size > 100 * 1024) {
			recommendations.push({
				type: "critical-path",
				severity: "error",
				message: `Critical bundle is large (${this.formatBytes(this.manifest.chunks.critical.size)})`,
				suggestion: "Move non-essential code to lazy chunks"
			});
		}

		return recommendations;
	}

	// Generate human-readable report
	async generateReport() {
		const report = `
# Advanced Code Splitting Report
Generated: ${new Date().toLocaleString()}

## Summary
- **Total Files Analyzed**: ${this.manifest.stats.totalFiles}
- **Total Size**: ${this.formatBytes(this.manifest.stats.totalSize)}
- **Critical Modules**: ${this.manifest.stats.criticalModules}
- **Route Chunks**: ${this.manifest.stats.routes}
- **Component Chunks**: ${this.manifest.stats.components}
- **Lazy Modules**: ${this.manifest.stats.lazyModules}

## Optimizations
- **Initial Bundle Reduction**: ${this.manifest.optimizations.estimatedSavings.initialBundleReduction}%
- **Lazy Loadable Content**: ${this.manifest.optimizations.estimatedSavings.lazyLoadableSavings}
- **Estimated Load Time Improvement**: ${this.manifest.optimizations.estimatedSavings.estimatedLoadTimeImprovement}ms

## Chunks
${Object.entries(this.manifest.chunks)
	.map(([name, chunk]) => `- **${name}**: ${chunk.files.length} files, ${this.formatBytes(chunk.size)}`)
	.join("\n")}

## Routes
${Object.entries(this.manifest.routes)
	.map(([route, info]) => `- **${route}**: ${info.files.length} files, ${this.formatBytes(info.size)}`)
	.join("\n")}

## Recommendations
${this.manifest.optimizations.recommendations.map(rec => `- **${rec.severity.toUpperCase()}**: ${rec.message}\n  *${rec.suggestion}*`).join("\n")}
`;

		const reportPath = path.join(this.options.buildDir, "code-splitting-report.md");
		await fs.promises.writeFile(reportPath, report.trim());
	}

	// Utility methods
	getFileType(ext) {
		const typeMap = {
			".js": "javascript",
			".css": "stylesheet",
			".scss": "stylesheet",
			".liquid": "template"
		};
		return typeMap[ext] || "unknown";
	}

	generateFileHash(content) {
		return createHash("md5").update(content).digest("hex").substring(0, 8);
	}

	formatBytes(bytes) {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
	}

	async fileExists(filePath) {
		try {
			await fs.promises.access(filePath);
			return true;
		} catch {
			return false;
		}
	}
}

// Export the class and utility functions
export default AdvancedCodeSplitter;

export function createCodeSplitter(options = {}) {
	return new AdvancedCodeSplitter(options);
}

// Integration with build process
export async function integrateCodeSplitting(buildConfig, options = {}) {
	const splitter = new AdvancedCodeSplitter(options);
	const manifest = await splitter.analyze();

	// Modify build config based on analysis
	if (manifest.chunks.critical) {
		buildConfig.entry = buildConfig.entry || {};
		buildConfig.entry.critical = manifest.chunks.critical.files;
	}

	// Add route-based entries
	for (const [route, routeInfo] of Object.entries(manifest.routes)) {
		buildConfig.entry[`route-${route}`] = routeInfo.files;
	}

	// Add component-based entries
	for (const [component, componentInfo] of Object.entries(manifest.components)) {
		if (componentInfo.lazy) {
			buildConfig.entry[`component-${component}`] = componentInfo.files;
		}
	}

	return { buildConfig, manifest };
}
