const axios = require("axios");

// Stedi API Configuration
const STEDI_API_URL = "https://healthcare.us.stedi.com/2024-04-01/change/medicalnetwork/eligibility/v3";

/**
 * All-in-One Insurance Eligibility Checker
 * HIPAA-compliant Cloud Function that replaces the eligibility workflow
 */

/**
 * Map insurance payer ID to trading partner service ID
 */
function mapInsuranceToTradingPartner(insurance, memberId = "") {
	// First, try to detect from member ID patterns (most reliable)
	if (memberId) {
		const upperMemberId = memberId.toUpperCase();

		// UnitedHealth/UHC patterns
		if (upperMemberId.startsWith("UHC") || upperMemberId.startsWith("UNITED")) {
			return "52133"; // Correct UHC trading partner from Stedi docs
		}

		// Humana patterns
		if (upperMemberId.startsWith("HUM") || (upperMemberId.startsWith("H") && upperMemberId.length >= 8)) {
			return "61101"; // Humana trading partner
		}

		// Aetna patterns
		if (upperMemberId.startsWith("AET") || upperMemberId.startsWith("W")) {
			return "60054"; // Correct Aetna trading partner from Stedi docs
		}
	}

	// Fallback to insurance field mapping
	const tradingPartnerMap = {
		// Humana
		87726: "61101",
		HUMANA: "61101",
		humana: "61101",

		// Aetna
		60054: "60054",
		AETNA: "60054",
		aetna: "60054",

		// Blue Cross Blue Shield (varies by region, using common one)
		BCBS: "87726",
		"BLUE CROSS": "87726",
		"blue cross": "87726",

		// UnitedHealth/UHC
		UNITED: "52133",
		UHC: "52133",
		unitedhealth: "52133"
	};

	// Try exact match first
	if (tradingPartnerMap[insurance]) {
		return tradingPartnerMap[insurance];
	}

	// Try case-insensitive match
	const lowerInsurance = (insurance || "").toLowerCase();
	for (const [key, value] of Object.entries(tradingPartnerMap)) {
		if (key.toLowerCase() === lowerInsurance) {
			return value;
		}
	}

	// If member ID suggests UnitedHealth but no other match, use UHC
	if (memberId && memberId.toUpperCase().includes("UHC")) {
		return "52133";
	}

	// Default to Humana (most common test case)
	return "61101";
}

/**
 * Safely extract string value from object
 */
function getString(obj, key, defaultValue = "") {
	const value = obj && obj[key];
	return value != null ? String(value).trim() : defaultValue;
}

/**
 * Safely extract boolean value from object
 */
function getBoolean(obj, key, defaultValue = false) {
	const value = obj && obj[key];
	return value != null ? Boolean(value) : defaultValue;
}

/**
 * Select appropriate API key based on test mode and environment
 */
function selectApiKey(testMode) {
	const envProdApiKey = process.env.STEDI_API_KEY_PROD;
	const envTestApiKey = process.env.STEDI_API_KEY;

	const prodApiKeyValid = envProdApiKey && envProdApiKey.length > 10;
	const testApiKeyValid = envTestApiKey && envTestApiKey.length > 10;

	let selectedApiKey;
	let keyType;

	if (testMode) {
		// Force test API key when testMode is true
		if (!testApiKeyValid) {
			return {
				apiKey: null,
				valid: false,
				keyType: "missing",
				error: "STEDI_API_KEY environment variable not configured for test mode"
			};
		}
		selectedApiKey = envTestApiKey;
		keyType = "test (env)";
	} else {
		// Use production key if available, otherwise fail
		if (prodApiKeyValid) {
			selectedApiKey = envProdApiKey;
			keyType = "production";
		} else if (testApiKeyValid) {
			selectedApiKey = envTestApiKey;
			keyType = "test (fallback)";
		} else {
			return {
				apiKey: null,
				valid: false,
				keyType: "missing",
				error: "Neither STEDI_API_KEY_PROD nor STEDI_API_KEY environment variables are configured"
			};
		}
	}

	const valid = selectedApiKey && selectedApiKey.length > 10;

	return {
		apiKey: selectedApiKey,
		valid,
		keyType,
		debug: {
			hasProdKey: !!envProdApiKey,
			hasTestKey: !!envTestApiKey,
			prodKeyLength: envProdApiKey ? envProdApiKey.length : 0,
			testKeyLength: envTestApiKey ? envTestApiKey.length : 0,
			finalKeyLength: selectedApiKey ? selectedApiKey.length : 0,
			isValid: valid,
			usingProdKey: prodApiKeyValid && !testMode,
			testModeForced: testMode,
			selectedKeyType: keyType
		}
	};
}

/**
 * Process Stedi API response and format for our system
 */
function processStediResponse(stediData, requestBody) {
	try {
		// Default response structure
		const eligibilityData = {
			isEligible: false,
			sessionsCovered: 0,
			deductible: { individual: 0 },
			eligibilityStatus: "UNKNOWN",
			userMessage: "Insurance eligibility could not be determined.",
			planBegin: "",
			planEnd: "",
			isProcessing: false
		};

		// Check for API-level errors first
		if (stediData?.errors && stediData.errors.length > 0) {
			eligibilityData.eligibilityStatus = "API_ERROR";
			eligibilityData.userMessage = "Unable to verify insurance eligibility at this time. Please contact customer support.";
			return eligibilityData;
		}

		// Process plan status
		if (stediData?.planStatus && Array.isArray(stediData.planStatus)) {
			const activeStatus = stediData.planStatus.find(status => status.statusCode === "1" || status.status?.toLowerCase().includes("active") || status.statusCode === "A");

			if (activeStatus) {
				eligibilityData.isEligible = true;
				eligibilityData.eligibilityStatus = "ACTIVE";
				eligibilityData.userMessage = "Your insurance coverage is active. Contact your provider for specific session details.";
			}
		}

		// Extract plan dates
		if (stediData?.planDateInformation?.planBegin) {
			eligibilityData.planBegin = stediData.planDateInformation.planBegin;
		}
		if (stediData?.planDateInformation?.planEnd) {
			eligibilityData.planEnd = stediData.planDateInformation.planEnd;
		}

		// Process benefits information for deductibles and session limits
		if (stediData?.benefitsInformation && Array.isArray(stediData.benefitsInformation)) {
			// Look for deductible information
			const deductibleBenefit = stediData.benefitsInformation.find(benefit => benefit.name?.toLowerCase().includes("deductible") && benefit.coverageLevel === "Individual");

			if (deductibleBenefit && deductibleBenefit.benefitAmount) {
				eligibilityData.deductible.individual = parseFloat(deductibleBenefit.benefitAmount) || 0;
			}
		}

		return eligibilityData;
	} catch (error) {
		return {
			isEligible: false,
			sessionsCovered: 0,
			deductible: { individual: 0 },
			eligibilityStatus: "PROCESSING_ERROR",
			userMessage: "Unable to process insurance information at this time.",
			planBegin: "",
			planEnd: "",
			isProcessing: false
		};
	}
}

/**
 * Main Cloud Function entry point
 */
exports.eligibilityChecker = async (req, res) => {
	// Set CORS headers
	res.set("Access-Control-Allow-Origin", "*");
	res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
	res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

	// Handle preflight requests
	if (req.method === "OPTIONS") {
		return res.status(200).send();
	}

	const timestamp = Date.now();

	// Extract and validate input parameters
	const { firstName, lastName, dateOfBirth, insuranceMemberId, insurance, groupNumber } = req.body;

	if (!firstName || !lastName || !dateOfBirth || !insuranceMemberId) {
		return res.status(400).json({
			success: false,
			error: "Missing required fields: firstName, lastName, dateOfBirth, insuranceMemberId"
		});
	}

	try {
		// Format date of birth for Stedi API (YYYYMMDD)
		const formattedDateOfBirth = dateOfBirth.replace(/[-\/]/g, "");

		// Determine trading partner service ID
		const tradingPartnerServiceId = mapInsuranceToTradingPartner(insurance, insuranceMemberId);

		// Generate control number (timestamp-based)
		const controlNumber = Date.now().toString();

		// Build request body for Stedi API
		const requestBody = {
			controlNumber,
			tradingPartnerServiceId,
			provider: {
				organizationName: "Beluga Health",
				npi: "1999999984"
			},
			subscriber: {
				firstName,
				lastName,
				dateOfBirth: formattedDateOfBirth,
				memberId: insuranceMemberId
			},
			encounter: {
				serviceTypeCodes: ["30"]
			}
		};

		// Add group number to subscriber if available (required by some payers like UnitedHealth)
		if (groupNumber && groupNumber.trim()) {
			requestBody.subscriber.groupNumber = groupNumber.trim();
		}

		// Select appropriate API key
		const testMode = req.body.testMode || false;
		const apiKeyResult = selectApiKey(testMode);
		if (!apiKeyResult.valid) {
			return res.status(500).json({
				success: false,
				error: "API configuration error: " + (apiKeyResult.error || "Invalid API key"),
				details: apiKeyResult.error,
				timestamp
			});
		}

		// Call Stedi API
		const stediResponse = await axios.post(STEDI_API_URL, requestBody, {
			headers: {
				Authorization: `Key ${apiKeyResult.apiKey}`,
				"Content-Type": "application/json"
			}
		});

		// Process successful response
		const eligibilityData = processStediResponse(stediResponse.data, requestBody);

		return res.status(200).json({
			success: true,
			eligibilityData,
			timestamp
		});
	} catch (error) {
		// Handle API errors
		if (error.response) {
			const eligibilityData = {
				isEligible: false,
				sessionsCovered: 0,
				deductible: { individual: 0 },
				eligibilityStatus: "API_ERROR",
				userMessage: "Unable to verify insurance eligibility at this time. Please contact customer support.",
				planBegin: "",
				planEnd: "",
				isProcessing: false
			};

			return res.status(200).json({
				success: true,
				eligibilityData,
				timestamp,
				debug: {
					stediApiError: true,
					error: error.message,
					status: error.response?.status,
					responseData: error.response?.data
				}
			});
		}

		// Handle other errors
		return res.status(500).json({
			success: false,
			error: "Internal server error",
			timestamp
		});
	}
};
