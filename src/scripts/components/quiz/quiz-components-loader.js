/**
 * Quiz Components Loader
 *
 * Central loading system for all quiz Web Components.
 * This file ensures all components are registered and available for use.
 */

import { quizComponentRegistry } from "./base/quiz-base-component.js";

// Import all components
import QuizCalendarIcon from "./icons/quiz-calendar-icon.js";
import QuizClockIcon from "./icons/quiz-clock-icon.js";
import QuizCheckmarkIcon from "./icons/quiz-checkmark-icon.js";
import QuizCoverageCard from "./content/quiz-coverage-card.js";
import QuizBenefitItem from "./content/quiz-benefit-item.js";
import QuizActionSection from "./content/quiz-action-section.js";
import QuizErrorDisplay from "./content/quiz-error-display.js";
import QuizLoadingDisplay from "./content/quiz-loading-display.js";

/**
 * Component loading configuration
 */
const COMPONENT_CONFIG = {
	// Core icons
	"quiz-calendar-icon": {
		module: QuizCalendarIcon,
		category: "icons",
		description: "Calendar icon for date-related benefits"
	},
	"quiz-clock-icon": {
		module: QuizClockIcon,
		category: "icons",
		description: "Clock icon for time-related benefits"
	},
	"quiz-checkmark-icon": {
		module: QuizCheckmarkIcon,
		category: "icons",
		description: "Checkmark icon for success states"
	},

	// Content components
	"quiz-coverage-card": {
		module: QuizCoverageCard,
		category: "content",
		description: "Insurance coverage information card"
	},
	"quiz-benefit-item": {
		module: QuizBenefitItem,
		category: "content",
		description: "Individual benefit item with icon and text"
	},
	"quiz-action-section": {
		module: QuizActionSection,
		category: "content",
		description: "Call-to-action section with buttons and info"
	},
	"quiz-error-display": {
		module: QuizErrorDisplay,
		category: "content",
		description: "Error display with different severity levels"
	},
	"quiz-loading-display": {
		module: QuizLoadingDisplay,
		category: "content",
		description: "Loading display with progress and step indicators"
	}
};

/**
 * Load all quiz components
 */
export function loadQuizComponents() {
	const startTime = performance.now();
	let loadedCount = 0;

	console.log("🚀 Loading Quiz Web Components...");

	Object.entries(COMPONENT_CONFIG).forEach(([tagName, config]) => {
		if (!quizComponentRegistry.isRegistered(tagName)) {
			try {
				// Component should auto-register when imported
				loadedCount++;
				console.log(`  ✓ ${tagName} (${config.category})`);
			} catch (error) {
				console.error(`  ✗ Failed to load ${tagName}:`, error);
			}
		} else {
			console.log(`  ~ ${tagName} already registered`);
		}
	});

	const endTime = performance.now();
	console.log(`🎉 Quiz Components loaded: ${loadedCount} components in ${(endTime - startTime).toFixed(2)}ms`);

	return {
		loaded: loadedCount,
		total: Object.keys(COMPONENT_CONFIG).length,
		loadTime: endTime - startTime
	};
}

/**
 * Check if all required components are loaded
 */
export function areComponentsReady() {
	const requiredComponents = Object.keys(COMPONENT_CONFIG);
	return requiredComponents.every(component => quizComponentRegistry.isRegistered(component));
}

/**
 * Wait for components to be ready
 */
export function waitForComponents() {
	return new Promise(resolve => {
		if (areComponentsReady()) {
			resolve(true);
			return;
		}

		// Poll for components to be ready
		const checkInterval = setInterval(() => {
			if (areComponentsReady()) {
				clearInterval(checkInterval);
				resolve(true);
			}
		}, 10);

		// Timeout after 5 seconds
		setTimeout(() => {
			clearInterval(checkInterval);
			console.warn("Components loading timeout - some components may not be available");
			resolve(false);
		}, 5000);
	});
}

/**
 * Get component information
 */
export function getComponentInfo(tagName) {
	return COMPONENT_CONFIG[tagName] || null;
}

/**
 * Get all available components by category
 */
export function getComponentsByCategory(category) {
	return Object.entries(COMPONENT_CONFIG)
		.filter(([_, config]) => config.category === category)
		.map(([tagName, config]) => ({ tagName, ...config }));
}

/**
 * Development helper: Log component status
 */
export function logComponentStatus() {
	console.group("Quiz Components Status");

	Object.entries(COMPONENT_CONFIG).forEach(([tagName, config]) => {
		const isRegistered = quizComponentRegistry.isRegistered(tagName);
		const status = isRegistered ? "✅" : "❌";
		console.log(`${status} ${tagName} (${config.category}) - ${config.description}`);
	});

	console.groupEnd();
}

// Auto-load components when this module is imported
loadQuizComponents();
