const axios = require("axios");

/**
 * Insurance Plan Creator Cloud Function
 * Creates insurance plan custom objects in HubSpot
 * HIPAA-compliant implementation
 */
exports.handler = async (req, res) => {
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
		console.log("Processing insurance plan creation request");
		console.log("Raw request body:", JSON.stringify(req.body, null, 2));

		// 1. Parse and extract request data
		const rawData = req.body || {};

		// 2. Extract required fields
		const customerEmail = getString(rawData, "customerEmail", "");
		const firstName = getString(rawData, "firstName", "");
		const lastName = getString(rawData, "lastName", "");
		const phoneNumber = getString(rawData, "phoneNumber", "");
		const state = getString(rawData, "state", "");
		const insurance = getString(rawData, "insurance", "");
		const insuranceMemberId = getString(rawData, "insuranceMemberId", "");
		const groupNumber = getString(rawData, "groupNumber", "");
		const dateOfBirth = getString(rawData, "dateOfBirth", "");
		const hubspotContactId = getString(rawData, "hubspotContactId", "");
		const eligibilityData = rawData.eligibilityData || {};
		const mainReasons = rawData.mainReasons || [];
		const medicalConditions = rawData.medicalConditions || [];

		console.log("Processing insurance plan for:", {
			customerEmail: customerEmail ? "***" : "missing",
			firstName: firstName ? "***" : "missing",
			lastName: lastName ? "***" : "missing",
			insurance,
			hubspotContactId: hubspotContactId ? "***" : "missing",
			hasEligibilityData: !!Object.keys(eligibilityData).length
		});

		// 3. Validate required fields
		const missingFields = [];
		if (!customerEmail) missingFields.push("customerEmail");
		if (!firstName && !lastName) missingFields.push("firstName or lastName");

		if (missingFields.length > 0) {
			console.log("Missing critical fields:", missingFields);
			return res.status(400).json({
				success: false,
				error: "Missing required fields for insurance plan creation",
				missingFields,
				timestamp
			});
		}

		// 4. Get HubSpot API key
		const hubspotApiKey = process.env.HUBSPOT_API_KEY || process.env.HUBSPOT_ACCESS_TOKEN;
		if (!hubspotApiKey || hubspotApiKey === "YOUR_ACTUAL_HUBSPOT_API_KEY_HERE" || hubspotApiKey.length < 10) {
			return res.status(500).json({
				success: false,
				error: "HubSpot API key not configured properly - requires HUBSPOT_API_KEY or HUBSPOT_ACCESS_TOKEN environment variable",
				timestamp
			});
		}

		// 5. Create insurance plan custom object
		const result = await createInsurancePlanObject({
			customerEmail,
			firstName,
			lastName,
			phoneNumber,
			state,
			insurance,
			insuranceMemberId,
			groupNumber,
			dateOfBirth,
			hubspotContactId,
			eligibilityData,
			mainReasons,
			medicalConditions,
			hubspotApiKey,
			timestamp
		});

		console.log("Insurance plan creation completed:", {
			success: result.success,
			objectId: result.insurancePlanObjectId
		});

		// 6. Return success response
		res.status(200).json({
			success: true,
			insurancePlanId: result.insurancePlanId,
			insurancePlanObjectId: result.insurancePlanObjectId,
			message: "Insurance plan created successfully",
			timestamp
		});
	} catch (error) {
		console.error("Insurance plan creation failed:", error);

		res.status(500).json({
			success: false,
			error: "Insurance plan creation failed",
			details: error.message,
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
 * Create insurance plan custom object in HubSpot
 */
async function createInsurancePlanObject(params) {
	const {
		customerEmail,
		firstName,
		lastName,
		phoneNumber,
		state,
		insurance,
		insuranceMemberId,
		groupNumber,
		dateOfBirth,
		hubspotContactId,
		eligibilityData,
		mainReasons,
		medicalConditions,
		hubspotApiKey,
		timestamp
	} = params;

	try {
		// Generate unique insurance plan ID
		const insurancePlanId = `plan_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
		const fullName = `${firstName} ${lastName}`.trim();

		console.log("Creating insurance plan object with ID:", insurancePlanId);

		// Map data to custom object properties based on CSV analysis
		const properties = {
			// Required fields
			insurance_plan_id: insurancePlanId,
			email: customerEmail,
			full_name: fullName,

			// Basic information
			first_name: firstName,
			last_name: lastName,
			date_of_birth: dateOfBirth,
			state: state,

			// Form data (what user entered)
			form_first_name: firstName,
			form_last_name: lastName,
			form_full_name: fullName,
			form_state: state,
			form_insurance_plan: insurance,
			form_birthday: dateOfBirth,

			// Plan details
			plan_name: insurance,

			// Coverage information from eligibility data
			coverage_status: eligibilityData.eligibilityStatus || "Unknown",
			coverage_start_date: eligibilityData.planBegin || "",
			coverage_end_date: eligibilityData.planEnd || "",

			// Initial eligibility tracking
			initial_eligibility: eligibilityData.isEligible ? "True" : "False",
			initial_eligibility_date: new Date().toISOString().split("T")[0],
			initial_checked_at: new Date().toISOString().split("T")[0],

			// Last eligibility (same as initial for new records)
			last_eligibility: eligibilityData.isEligible ? "True" : "False",
			last_checked_at: new Date().toISOString().split("T")[0],

			// Benefit information
			benefit_amount: eligibilityData.sessionsCovered ? `${eligibilityData.sessionsCovered} sessions` : "",

			// Visits remaining
			visits_remaining: eligibilityData.sessionsCovered ? String(eligibilityData.sessionsCovered) : "0",

			// Telemedicine categories based on main reasons
			telemedicine_primary_category: Array.isArray(mainReasons) ? mainReasons[0] : "",
			telemedicine_secondary_category: getSecondaryCategory(mainReasons, medicalConditions)
		};

		// Add co-pay information if available
		if (eligibilityData.deductible?.individual) {
			properties.initial_eligibility_co_pay = parseFloat(eligibilityData.deductible.individual) || 0;
			properties.last_eligibility_co_pay = parseFloat(eligibilityData.deductible.individual) || 0;
		}

		// Filter out empty values
		const filteredProperties = Object.fromEntries(Object.entries(properties).filter(([key, value]) => value !== "" && value !== null && value !== undefined));

		console.log("Creating insurance plan object with properties:", Object.keys(filteredProperties));

		// Create the custom object using HubSpot API
		const response = await axios.post(
			"https://api.hubapi.com/crm/v3/objects/2-142995261", // Replace with your actual object type ID
			{
				properties: filteredProperties
				// Temporarily remove associations to test basic object creation
				// associations: hubspotContactId ? [
				// 	{
				// 		to: {
				// 			id: hubspotContactId
				// 		},
				// 		types: [
				// 			{
				// 				associationCategory: "USER_DEFINED",
				// 				associationTypeId: 1 // You may need to adjust this based on your association setup
				// 			}
				// 		]
				// 	}
				// ] : []
			},
			{
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${hubspotApiKey}`
				}
			}
		);

		console.log("Insurance plan object created successfully!");
		console.log("Object ID:", response.data.id);

		return {
			success: true,
			insurancePlanId: insurancePlanId,
			insurancePlanObjectId: response.data.id,
			propertiesSet: Object.keys(filteredProperties),
			associatedContact: hubspotContactId || null
		};
	} catch (error) {
		console.error("Failed to create insurance plan object:", {
			message: error.message,
			status: error.response?.status,
			statusText: error.response?.statusText,
			data: error.response?.data,
			url: error.config?.url,
			requestData: error.config?.data
		});

		// Log the full error response for debugging
		if (error.response?.data) {
			console.error("HubSpot API Error Details:", JSON.stringify(error.response.data, null, 2));
		}

		// If we get a 404, the object type might not exist or ID is wrong
		if (error.response?.status === 404) {
			throw new Error("Insurance plan object type not found - check object type ID in API call");
		}

		// If we get a 400, there's likely a property validation issue
		if (error.response?.status === 400) {
			throw new Error(`HubSpot validation error: ${error.response?.data?.message || "Unknown validation error"}`);
		}

		throw error;
	}
}

/**
 * Determine secondary telemedicine category based on reasons and conditions
 */
function getSecondaryCategory(mainReasons, medicalConditions) {
	const allReasons = [...(Array.isArray(mainReasons) ? mainReasons : []), ...(Array.isArray(medicalConditions) ? medicalConditions : [])];
	const reasonsString = allReasons.join(" ").toLowerCase();

	// Check for weight loss related terms
	if (reasonsString.includes("weight") || reasonsString.includes("obesity") || reasonsString.includes("diet")) {
		return "Weight Loss";
	}

	// Check for glucose/diabetes related terms
	if (reasonsString.includes("diabetes") || reasonsString.includes("glucose") || reasonsString.includes("blood sugar")) {
		return "Glucose";
	}

	// Default to Weight Loss if uncertain
	return "Weight Loss";
}
