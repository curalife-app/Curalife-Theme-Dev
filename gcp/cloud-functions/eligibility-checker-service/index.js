const axios = require("axios");

/**
 * All-in-One Insurance Eligibility Checker
 * HIPAA-compliant Cloud Function that replaces the eligibility workflow
 */
exports.checkEligibility = async (req, res) => {
	// Set CORS headers for all requests
	res.set("Access-Control-Allow-Origin", "*");
	res.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
	res.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
	res.set("Access-Control-Allow-Credentials", "true");
	res.set("Access-Control-Max-Age", "3600");
	res.set("Content-Type", "application/json");

	// Handle preflight OPTIONS request
	if (req.method === "OPTIONS") {
		res.status(204).send("");
		return;
	}

	const timestamp = Date.now();

	try {
		// 1. Parse and extract request data
		const rawData = req.body || {};
		let actualPayload = rawData;

		// Handle nested data field if present
		if (rawData.data) {
			try {
				actualPayload = typeof rawData.data === "string" ? JSON.parse(rawData.data) : rawData.data;
			} catch (e) {
				actualPayload = rawData.data;
			}
		}

		// 2. Extract required fields with safe defaults
		const firstName = getString(actualPayload, "firstName", "");
		const lastName = getString(actualPayload, "lastName", "");
		const insurance = getString(actualPayload, "insurance", "");
		const insuranceMemberId = getString(actualPayload, "insuranceMemberId", "");
		const groupNumber = getString(actualPayload, "groupNumber", "");
		const dateOfBirth = getString(actualPayload, "dateOfBirth", "");
		const testMode = getBoolean(actualPayload, "testMode", false);

		console.log("Processing eligibility request:", {
			firstName: firstName ? "***" : "missing",
			lastName: lastName ? "***" : "missing",
			insurance,
			hasMemberId: !!insuranceMemberId,
			hasGroupNumber: !!groupNumber,
			testMode
		});

		// 3. Validate required fields
		const missingFields = [];
		if (!firstName) missingFields.push("firstName");
		if (!lastName) missingFields.push("lastName");
		if (!insuranceMemberId) missingFields.push("insuranceMemberId");

		if (missingFields.length > 0) {
			return res.status(400).json({
				success: false,
				error: "Missing required fields for eligibility check",
				missingFields,
				timestamp,
				receivedData: {
					firstName: !!firstName,
					lastName: !!lastName,
					insurance: !!insurance,
					insuranceMemberId: !!insuranceMemberId,
					groupNumber: !!groupNumber,
					dateOfBirth: !!dateOfBirth
				}
			});
		}

		// 4. Select appropriate API key
		const apiKeyResult = selectApiKey(testMode);
		if (!apiKeyResult.valid) {
			return res.status(500).json({
				success: false,
				error: "Invalid API configuration",
				eligibilityData: {
					isEligible: false,
					sessionsCovered: 0,
					deductible: { individual: 0 },
					eligibilityStatus: "ERROR",
					userMessage: "Invalid API configuration. Please contact customer support.",
					planBegin: "",
					planEnd: "",
					isProcessing: false
				},
				debug: {
					apiKeyDebug: apiKeyResult.debug,
					message: "STEDI API key validation failed"
				},
				timestamp
			});
		}

		// 5. Call Stedi API for eligibility check
		const stediResult = await callStediAPI({
			firstName,
			lastName,
			dateOfBirth,
			insuranceMemberId,
			insurance,
			groupNumber,
			apiKey: apiKeyResult.apiKey,
			timestamp
		});

		// 6. Process and return the result
		const response = {
			success: true,
			eligibilityData: stediResult.eligibilityData,
			debug: stediResult.debug,
			timestamp
		};

		console.log("Eligibility check completed:", {
			isEligible: stediResult.eligibilityData.isEligible,
			status: stediResult.eligibilityData.eligibilityStatus,
			sessionsCovered: stediResult.eligibilityData.sessionsCovered
		});

		res.status(200).json(response);
	} catch (error) {
		console.error("Eligibility check failed:", error);

		res.status(500).json({
			success: false,
			error: "Eligibility check failed",
			eligibilityData: {
				isEligible: false,
				sessionsCovered: 0,
				deductible: { individual: 0 },
				eligibilityStatus: "ERROR",
				userMessage: "Unable to verify insurance eligibility at this time. Please contact customer support.",
				planBegin: "",
				planEnd: "",
				isProcessing: false
			},
			debug: {
				error: error.message,
				stack: error.stack
			},
			timestamp
		});
	}
};

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
	const defaultApiKey = "test_fsWwDEq.XvSAryFi2OujuV0n3mNPhFfE";

	const prodApiKeyValid = envProdApiKey && envProdApiKey.length > 10;
	const testApiKeyValid = envTestApiKey && envTestApiKey.length > 10;

	let selectedApiKey;
	let keyType;

	if (testMode) {
		// Force test API key when testMode is true
		selectedApiKey = testApiKeyValid ? envTestApiKey : defaultApiKey;
		keyType = testApiKeyValid ? "test (env)" : "test (default)";
	} else {
		// Use production key if available, otherwise fall back to test
		if (prodApiKeyValid) {
			selectedApiKey = envProdApiKey;
			keyType = "production";
		} else if (testApiKeyValid) {
			selectedApiKey = envTestApiKey;
			keyType = "test (fallback)";
		} else {
			selectedApiKey = defaultApiKey;
			keyType = "test (default fallback)";
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
 * Call Stedi API for eligibility verification
 */
async function callStediAPI({ firstName, lastName, dateOfBirth, insuranceMemberId, insurance, groupNumber, apiKey, timestamp }) {
	const stediApiUrl = "https://healthcare.us.stedi.com/2024-04-01/change/medicalnetwork/eligibility/v3";
	const controlNumber = String(Math.floor(timestamp * 1000));

	// Use correct trading partner service ID for Humana
	const tradingPartnerServiceId = "61101";

	// Convert date from YYYY-MM-DD to YYYYMMDD format
	let formattedDateOfBirth = dateOfBirth;
	if (dateOfBirth && dateOfBirth.includes("-")) {
		formattedDateOfBirth = dateOfBirth.replace(/-/g, "");
	}

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

	// Note: groupNumber is not included in the subscriber object based on working examples

	try {
		console.log("Calling Stedi API:", {
			url: stediApiUrl,
			controlNumber,
			tradingPartnerServiceId,
			hasGroupNumber: !!groupNumber
		});

		const response = await axios.post(stediApiUrl, requestBody, {
			headers: {
				Authorization: apiKey,
				"Content-Type": "application/json"
			},
			timeout: 30000 // 30 second timeout
		});

		console.log("Stedi API response received:", {
			status: response.status,
			hasData: !!response.data
		});

		return processStediResponse(response.data, requestBody);
	} catch (error) {
		console.error("Stedi API call failed:", {
			message: error.message,
			status: error.response?.status,
			statusText: error.response?.statusText
		});

		return {
			eligibilityData: {
				isEligible: false,
				sessionsCovered: 0,
				deductible: { individual: 0 },
				eligibilityStatus: "API_ERROR",
				userMessage: "Unable to verify insurance eligibility at this time. Please contact customer support.",
				planBegin: "",
				planEnd: "",
				isProcessing: false
			},
			debug: {
				stediApiError: true,
				error: error.message,
				status: error.response?.status,
				statusText: error.response?.statusText,
				requestBody
			}
		};
	}
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

		// Check if we have a valid response structure
		if (!stediData) {
			eligibilityData.eligibilityStatus = "NO_RESPONSE";
			eligibilityData.userMessage = "No eligibility information received from insurance provider.";

			return {
				eligibilityData,
				debug: {
					stediResponse: stediData,
					requestBody,
					processingNote: "No data received from Stedi API"
				}
			};
		}

		// Extract plan status information
		if (stediData.planStatus && Array.isArray(stediData.planStatus)) {
			for (const planStatus of stediData.planStatus) {
				if (planStatus.statusCode === "1" || planStatus.status === "Active Coverage") {
					eligibilityData.isEligible = true;
					eligibilityData.eligibilityStatus = "ACTIVE";
					eligibilityData.userMessage = "Your insurance coverage is active and eligible for services.";
					break;
				}
			}
		}

		// Extract plan dates
		if (stediData.planDateInformation) {
			if (stediData.planDateInformation.planBegin) {
				eligibilityData.planBegin = stediData.planDateInformation.planBegin;
			}
			// Note: Stedi doesn't always provide planEnd, so we'll leave it empty
		}

		// Extract benefit information from benefitsInformation array
		if (stediData.benefitsInformation && Array.isArray(stediData.benefitsInformation)) {
			let totalSessions = 0;
			let individualDeductible = 0;
			let copayAmount = 0;

			for (const benefit of stediData.benefitsInformation) {
				// Look for relevant service types (30 = Health Benefit Plan Coverage, 98 = Professional Visits, MH = Mental Health)
				const relevantServiceTypes = ["30", "98", "MH"];
				const hasRelevantService = benefit.serviceTypeCodes && benefit.serviceTypeCodes.some(code => relevantServiceTypes.includes(code));

				if (hasRelevantService) {
					// Extract session/visit limits
					if (benefit.name === "Limitations" && benefit.benefitQuantity) {
						const quantity = parseInt(benefit.benefitQuantity) || 0;
						if (quantity > totalSessions) {
							totalSessions = quantity;
						}
					}

					// Extract deductible information
					if (benefit.name === "Deductible" && benefit.benefitAmount) {
						const deductible = parseFloat(benefit.benefitAmount) || 0;
						if (deductible > individualDeductible) {
							individualDeductible = deductible;
						}
					}

					// Extract copay information
					if (benefit.name === "Co-Payment" && benefit.benefitAmount) {
						const copay = parseFloat(benefit.benefitAmount) || 0;
						if (copay > 0 && copayAmount === 0) {
							copayAmount = copay;
						}
					}
				}
			}

			eligibilityData.sessionsCovered = totalSessions;
			eligibilityData.deductible.individual = individualDeductible;
			if (copayAmount > 0) {
				eligibilityData.copay = copayAmount;
			}
		}

		// Update user message based on eligibility and benefits
		if (eligibilityData.isEligible) {
			if (eligibilityData.sessionsCovered > 0) {
				eligibilityData.userMessage = `Your insurance is active. Coverage details: ${eligibilityData.sessionsCovered} sessions covered.`;
			} else {
				eligibilityData.userMessage = "Your insurance coverage is active. Contact your provider for specific session details.";
			}
		}

		return {
			eligibilityData,
			debug: {
				stediResponse: stediData,
				requestBody,
				processingNote: "Successfully processed Stedi response",
				extractedBenefits: {
					planStatusFound: !!(stediData.planStatus && stediData.planStatus.length > 0),
					benefitsFound: !!(stediData.benefitsInformation && stediData.benefitsInformation.length > 0),
					planDatesFound: !!stediData.planDateInformation
				}
			}
		};
	} catch (error) {
		console.error("Error processing Stedi response:", error);

		return {
			eligibilityData: {
				isEligible: false,
				sessionsCovered: 0,
				deductible: { individual: 0 },
				eligibilityStatus: "PROCESSING_ERROR",
				userMessage: "Error processing insurance eligibility information.",
				planBegin: "",
				planEnd: "",
				isProcessing: false
			},
			debug: {
				stediResponse: stediData,
				requestBody,
				processingError: error.message,
				processingNote: "Error occurred while processing Stedi response"
			}
		};
	}
}
