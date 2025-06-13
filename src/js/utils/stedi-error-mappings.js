/**
 * Stedi Error Code Mappings
 * Maps Stedi eligibility error codes to appropriate screen types and user messages
 */

export const STEDI_ERROR_MAPPINGS = {
	// Technical Problem Errors - System/Provider/Technical Issues
	TECHNICAL_PROBLEM: {
		codes: [
			"04",
			"15",
			"33",
			"35",
			"41",
			"42",
			"43",
			"44",
			"45",
			"46",
			"47",
			"48",
			"49",
			"50",
			"51",
			"52",
			"53",
			"54",
			"55",
			"56",
			"57",
			"62",
			"63",
			"79",
			"80",
			"97",
			"98",
			"AA",
			"AE",
			"AF",
			"AG",
			"AO",
			"CI",
			"E8",
			"IA",
			"MA",
			"T4",
			"NULL",
			"other"
		],
		screenType: "TECHNICAL_PROBLEM",
		category: "system",
		userMessage: "There was a technical issue processing your insurance verification. Our system encountered a problem that requires manual resolution.",
		actionTitle: "Technical Support Required",
		actionText: "Our technical team will resolve this issue and complete your verification manually.",
		priority: "high",
		requiresManualReview: true
	},

	// Insurance Plans Error - Patient/Subscriber Data Issues
	INSURANCE_PLANS_ERROR: {
		codes: ["58", "60", "61", "64", "65", "66", "67", "68", "69", "70", "71", "72", "73", "74", "75", "76", "77", "78"],
		screenType: "INSURANCE_PLANS_ERROR",
		category: "insurance_data",
		userMessage: "There was an issue with your insurance information. The details provided don't match what's on file with your insurance company.",
		actionTitle: "Insurance Information Review",
		actionText: "Please verify your insurance details match your card exactly, or our team can help verify your coverage manually.",
		priority: "medium",
		requiresManualReview: true,
		canRetry: true
	}
};

/**
 * Detailed error code descriptions for specific handling
 */
export const DETAILED_ERROR_DESCRIPTIONS = {
	// Patient/Member Data Errors
	58: "Invalid or missing date of birth",
	60: "Date of birth is after service date",
	61: "Date of death is before service date",
	64: "Invalid or missing patient ID",
	65: "Invalid or missing patient name",
	66: "Invalid or missing patient gender",
	67: "Patient not found in system",
	68: "Duplicate patient ID number",
	69: "Information inconsistent with patient age",
	70: "Information inconsistent with patient gender",
	71: "Patient birth date doesn't match records",
	72: "Invalid or missing subscriber/insured ID",
	73: "Invalid or missing subscriber/insured name",
	74: "Invalid or missing subscriber/insured gender",
	75: "Subscriber/insured not found",
	76: "Duplicate subscriber/insured ID",
	77: "Subscriber found but patient not found",
	78: "Subscriber not in identified group/plan",

	// Technical/System Errors
	42: "Unable to respond at current time",
	43: "Invalid or missing provider identification",
	79: "Invalid participant identification",
	80: "No response received - transaction terminated"
};

/**
 * Get error mapping for a specific Stedi error code
 * @param {string|number} errorCode - The Stedi error code
 * @returns {object} Error mapping configuration
 */
export function getStediErrorMapping(errorCode) {
	const codeStr = String(errorCode).toUpperCase();

	// Check insurance plans errors first (more specific)
	if (STEDI_ERROR_MAPPINGS.INSURANCE_PLANS_ERROR.codes.includes(codeStr)) {
		return {
			...STEDI_ERROR_MAPPINGS.INSURANCE_PLANS_ERROR,
			detailedDescription: DETAILED_ERROR_DESCRIPTIONS[codeStr] || null
		};
	}

	// Check technical problems
	if (STEDI_ERROR_MAPPINGS.TECHNICAL_PROBLEM.codes.includes(codeStr)) {
		return {
			...STEDI_ERROR_MAPPINGS.TECHNICAL_PROBLEM,
			detailedDescription: DETAILED_ERROR_DESCRIPTIONS[codeStr] || null
		};
	}

	// Default to technical problem for unknown codes
	return {
		...STEDI_ERROR_MAPPINGS.TECHNICAL_PROBLEM,
		userMessage: "An unexpected error occurred during insurance verification. Our team will resolve this manually.",
		detailedDescription: `Unknown error code: ${codeStr}`
	};
}

/**
 * Check if an error code represents a data validation issue that user might be able to fix
 * @param {string|number} errorCode - The Stedi error code
 * @returns {boolean} True if user might be able to resolve by correcting data
 */
export function isUserCorrectableError(errorCode) {
	const mapping = getStediErrorMapping(errorCode);
	return mapping.category === "insurance_data" && mapping.canRetry === true;
}

/**
 * Get user-friendly error title based on error code
 * @param {string|number} errorCode - The Stedi error code
 * @returns {string} User-friendly error title
 */
export function getErrorTitle(errorCode) {
	const mapping = getStediErrorMapping(errorCode);

	if (mapping.category === "insurance_data") {
		return "Insurance Information Issue";
	}

	if (mapping.category === "system") {
		return "Technical Processing Issue";
	}

	return "Verification Issue";
}

/**
 * Create eligibility data object for Stedi errors
 * @param {string|number} errorCode - The Stedi error code
 * @param {string} customMessage - Optional custom message to override default
 * @returns {object} Formatted eligibility data object
 */
export function createStediErrorEligibilityData(errorCode, customMessage = null) {
	const mapping = getStediErrorMapping(errorCode);
	const finalMessage = customMessage || mapping.userMessage;

	return {
		isEligible: false,
		sessionsCovered: 0,
		deductible: { individual: 0 },
		eligibilityStatus: mapping.screenType,
		userMessage: finalMessage,
		planBegin: "",
		planEnd: "",
		stediErrorCode: String(errorCode),
		error: {
			code: String(errorCode),
			message: finalMessage,
			category: mapping.category,
			screenType: mapping.screenType,
			actionTitle: mapping.actionTitle,
			actionText: mapping.actionText,
			detailedDescription: mapping.detailedDescription,
			priority: mapping.priority,
			requiresManualReview: mapping.requiresManualReview,
			canRetry: mapping.canRetry || false,
			isStediError: true
		}
	};
}
