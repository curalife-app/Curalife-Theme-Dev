#!/usr/bin/env node

/**
 * Server Availability Check Utility
 *
 * This script checks if the Shopify development server is running and accessible
 * before performing operations that require a running server, such as performance tests.
 *
 * Usage:
 *   node check-server.js [--url=http://custom-url] [--verbose]
 *
 * Exit codes:
 *   0 - Server is available
 *   1 - Server is not available
 */

import http from "http";

// Default Shopify development server URLs to try
const DEFAULT_URLS = ["http://localhost:9292/", "http://127.0.0.1:9292/"];

// Parse command line arguments
const args = process.argv.slice(2);
const urlArg = args.find(arg => arg.startsWith("--url="));
const verbose = args.includes("--verbose");
const urls = urlArg ? [urlArg.split("=")[1]] : DEFAULT_URLS;

/**
 * Check if a server is responding at the specified URL
 * @param {string} url - The URL to check
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<boolean>} - True if server is available, false otherwise
 */
async function checkServerAvailability(url, timeoutMs = 5000) {
	return new Promise(resolve => {
		if (verbose) {
			console.log(`Verbose mode: Checking URL ${url} with timeout ${timeoutMs}ms`);
		}

		try {
			const parsedUrl = new URL(url);

			if (verbose) {
				console.log(`Verbose mode: Parsed URL - hostname: ${parsedUrl.hostname}, port: ${parsedUrl.port}, path: ${parsedUrl.pathname}`);
			}

			const req = http.get(
				{
					hostname: parsedUrl.hostname,
					port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
					path: parsedUrl.pathname,
					timeout: timeoutMs
				},
				res => {
					if (verbose) {
						console.log(`Verbose mode: Received response with status code ${res.statusCode}`);
					}

					// Consider any response (even errors) as the server being available
					// This is because a 500 error still means the server is running
					resolve(true);

					// Consume response data to free up memory
					res.resume();
				}
			);

			req.on("error", err => {
				if (verbose) {
					console.log(`Verbose mode: Error occurred: ${err.message}`);
				}

				// Error occurred, server not available
				resolve(false);
			});

			req.on("timeout", () => {
				if (verbose) {
					console.log(`Verbose mode: Request timed out after ${timeoutMs}ms`);
				}

				// Request timed out
				req.destroy();
				resolve(false);
			});
		} catch (err) {
			if (verbose) {
				console.log(`Verbose mode: Exception caught: ${err.message}`);
			}

			resolve(false);
		}
	});
}

/**
 * Check multiple URLs for server availability
 * @param {string[]} urls - Array of URLs to check
 * @returns {Promise<boolean>} - True if any server is available, false otherwise
 */
async function checkMultipleUrls(urls) {
	for (const url of urls) {
		console.log(`Checking if server is running at ${url}...`);
		const isAvailable = await checkServerAvailability(url);
		if (isAvailable) {
			console.log(`✅ Server is responding at ${url}`);
			return true;
		}
	}
	return false;
}

/**
 * Main function that checks server availability and exits with appropriate code
 */
async function main() {
	try {
		const isAvailable = await checkMultipleUrls(urls);

		if (isAvailable) {
			console.log("✅ Server is running and ready for performance testing.");
			process.exit(0);
		} else {
			console.log("Please start the server with 'npm run shopify' before running performance tests.");
			process.exit(1);
		}
	} catch (err) {
		console.error("Error checking server availability:", err.message);
		process.exit(1);
	}
}

// Run the main function
main();
