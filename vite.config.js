import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import tailwindcssVite from "@tailwindcss/vite";
import path from "path";

// Define absolute paths (mimicking your Laravel Mix setup)
const paths = {
	buildFolder: path.resolve(__dirname, "Curalife-Theme-Build"),
	assets: {
		scripts: path.join(__dirname, "src", "scripts"),
		fonts: path.join(__dirname, "src", "fonts"),
		css: path.join(__dirname, "src", "styles", "css"),
		images: path.join(__dirname, "src", "images"),
		tailwind: path.join(__dirname, "src", "styles", "tailwind.css")
	},
	liquid: {
		layout: path.join(__dirname, "src", "liquid", "layout"),
		sections: path.join(__dirname, "src", "liquid", "sections"),
		snippets: path.join(__dirname, "src", "liquid", "snippets"),
		blocks: path.join(__dirname, "src", "liquid", "blocks")
	}
};

export default defineConfig({
	build: {
		outDir: paths.buildFolder,
		assetsDir: "assets",
		rollupOptions: {
			output: {
				// Hashed filenames for cache busting (versioning)
				entryFileNames: "assets/[name].[hash].js",
				chunkFileNames: "assets/[name].[hash].js",
				assetFileNames: "assets/[name].[hash].[ext]"
			}
		}
	},
	plugins: [
		// Use the dedicated Tailwind CSS v4 Vite plugin
		tailwindcssVite(),
		// Copy static assets and Liquid files to your build directories
		viteStaticCopy({
			targets: [
				{ src: `${paths.assets.scripts}/**/*`, dest: "." },
				{ src: `${paths.assets.fonts}/**/*.{woff,woff2,eot,ttf,otf}`, dest: "fonts" },
				{ src: `${paths.assets.css}/**/*`, dest: "css" },
				{ src: `${paths.assets.images}/**/*.{png,jpg,jpeg,gif,svg}`, dest: "images" },
				{ src: `${paths.liquid.layout}/**/*`, dest: "layout" },
				{ src: `${paths.liquid.sections}/**/*.liquid`, dest: "sections" },
				{ src: `${paths.liquid.snippets}/**/*.liquid`, dest: "snippets" },
				{ src: `${paths.liquid.blocks}/**/*.liquid`, dest: "blocks" }
			]
		})
	]
});
