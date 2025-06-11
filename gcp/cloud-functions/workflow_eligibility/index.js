const { workflowsClient } = require("./workflow-client");

// Constants for workflow names
const ELIGIBILITY_WORKFLOW_NAME = process.env.ELIGIBILITY_WORKFLOW_NAME || "eligibility-workflow";
const USER_CREATION_WORKFLOW_NAME = process.env.USER_CREATION_WORKFLOW_NAME || "user-creation-workflow";
const SCHEDULING_WORKFLOW_NAME = process.env.SCHEDULING_WORKFLOW_NAME || "scheduling-workflow";
const INSURANCE_PLAN_WORKFLOW_NAME = process.env.INSURANCE_PLAN_WORKFLOW_NAME || "insurance-plan-workflow";

exports.processWorkflow = async (req, res) => {
	// Set CORS headers for all requests
	res.set("Access-Control-Allow-Origin", "*");
	res.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
	res.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-Workflow-Type");
	res.set("Access-Control-Allow-Credentials", "true");
	res.set("Access-Control-Max-Age", "3600");

	// Handle preflight OPTIONS request
	if (req.method === "OPTIONS") {
		res.status(204).send("");
		return;
	}

	let workflowType = "eligibility"; // Initialize with default

	try {
		const projectId = process.env.GCP_PROJECT || "telemedicine-458913";
		const location = "us-central1";

		// Get the request data
		const requestData = req.body || {};

		// Determine workflow type from header or request body
		workflowType = req.get("X-Workflow-Type") || requestData.workflowType || "eligibility";

		let workflowName;
		let processedData;

		switch (workflowType) {
			case "eligibility":
				workflowName = ELIGIBILITY_WORKFLOW_NAME;
				processedData = processEligibilityData(requestData);
				break;

			case "user_creation":
				workflowName = USER_CREATION_WORKFLOW_NAME;
				processedData = processUserCreationData(requestData);
				break;

			case "scheduling":
				workflowName = SCHEDULING_WORKFLOW_NAME;
				processedData = processSchedulingData(requestData);
				break;

			case "insurance_plan":
				workflowName = INSURANCE_PLAN_WORKFLOW_NAME;
				processedData = processInsurancePlanData(requestData);
				break;

			default:
				// Default to eligibility for backward compatibility
				workflowName = ELIGIBILITY_WORKFLOW_NAME;
				processedData = processEligibilityData(requestData);
				console.log("No workflow type specified, defaulting to eligibility");
		}

		console.log(`Executing workflow: ${workflowName} (type: ${workflowType})`);

		// Create workflow execution request
		const workflowPath = `projects/${projectId}/locations/${location}/workflows/${workflowName}`;

		// Execute the workflow using createExecution
		const [execution] = await workflowsClient.createExecution({
			parent: workflowPath,
			execution: {
				argument: JSON.stringify(processedData)
			}
		});

		console.log(`Workflow execution started: ${execution.name}`);

		// Wait for completion with timeout
		const result = await waitForWorkflowCompletion(execution.name, 60000);

		console.log("Execution finished");
		console.log(result);

		// Return the result
		res.status(200).send(result || {});
	} catch (error) {
		console.error("Error executing workflow:", error);
		res.status(500).send({
			success: false,
			error: `Failed to execute ${workflowType} workflow`,
			details: error.message
		});
	}
};

// Helper function to sanitize values
function sanitizeValue(value, defaultValue = "") {
	if (value === null || value === undefined) return defaultValue;
	if (typeof value === "string") return value.trim();
	return String(value);
}

// Helper function to sanitize arrays
function sanitizeArray(value, defaultValue = []) {
	if (!Array.isArray(value)) return defaultValue;
	return value;
}

// Helper function to sanitize phone numbers
function sanitizePhoneNumber(phoneNumber) {
	if (!phoneNumber) return "+15142546011"; // Default test number

	// Remove all non-digit characters
	const digitsOnly = phoneNumber.replace(/\D/g, "");

	// If it's 10 digits, add +1 prefix
	if (digitsOnly.length === 10) {
		return `+1${digitsOnly}`;
	}

	// If it's 11 digits and starts with 1, add + prefix
	if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
		return `+${digitsOnly}`;
	}

	// Return as-is with + prefix if not already present
	return phoneNumber.startsWith("+") ? phoneNumber : `+${digitsOnly}`;
}

function processEligibilityData(data) {
	// Sanitize phone number for Stedi (10 digits only for eligibility checks)
	const sanitizedPhone = sanitizePhoneNumber(data.phoneNumber);

	return {
		// Required fields for Stedi API
		firstName: sanitizeValue(data.firstName, "John"),
		lastName: sanitizeValue(data.lastName, "Doe"),
		insurance: sanitizeValue(data.insurance, "aetna"),
		insuranceMemberId: sanitizeValue(data.insuranceMemberId, ""),
		groupNumber: sanitizeValue(data.groupNumber, ""),
		dateOfBirth: sanitizeValue(data.dateOfBirth, "19710101"), // YYYYMMDD format

		// Tracking and metadata
		workflowType: "eligibility",
		testMode: Boolean(data.testMode),
		triggeredAt: sanitizeValue(data.triggeredAt, new Date().toISOString()),
		customerEmail: sanitizeValue(data.customerEmail, `test-${Date.now()}@curalife-test.com`),
		phoneNumber: sanitizedPhone,
		state: sanitizeValue(data.state, "NY")
	};
}

function processUserCreationData(data) {
	return {
		// Required customer information
		customerEmail: sanitizeValue(data.customerEmail, `test-${Date.now()}@curalife-test.com`),
		firstName: sanitizeValue(data.firstName, "John"),
		lastName: sanitizeValue(data.lastName, "Doe"),
		phoneNumber: sanitizeValue(data.phoneNumber, "+15142546011"),
		state: sanitizeValue(data.state, "NY"),
		dateOfBirth: sanitizeValue(data.dateOfBirth, "19710101"),
		consent: Boolean(data.consent),

		// Insurance information
		insurance: sanitizeValue(data.insurance, "aetna"),
		insuranceMemberId: sanitizeValue(data.insuranceMemberId, ""),
		groupNumber: sanitizeValue(data.groupNumber, ""),

		// Telemedicine categories
		mainReasons: sanitizeArray(data.mainReasons, []),
		medicalConditions: sanitizeArray(data.medicalConditions, []),

		// Eligibility data passthrough
		eligibilityData: data.eligibilityData || {},

		// Quiz responses for context
		allResponses: Array.isArray(data.allResponses)
			? data.allResponses.map(response => ({
					questionId: sanitizeValue(response?.questionId, ""),
					answer: sanitizeValue(response?.answer, ""),
					value: sanitizeValue(response?.value, "")
				}))
			: [],

		// Tracking and metadata
		workflowType: "user_creation",
		testMode: Boolean(data.testMode),
		triggeredAt: sanitizeValue(data.triggeredAt, new Date().toISOString()),
		completedAt: sanitizeValue(data.completedAt, new Date().toISOString()),
		quizId: sanitizeValue(data.quizId, "dietitian-quiz"),
		quizTitle: sanitizeValue(data.quizTitle, "Find Your Perfect Dietitian")
	};
}

function processSchedulingData(data) {
	// Sanitize phone number for Beluga (10 digits only)
	const sanitizedPhone = sanitizePhoneNumber(data.phoneNumber);

	return {
		// Required fields for Beluga API
		firstName: sanitizeValue(data.firstName, "John"),
		lastName: sanitizeValue(data.lastName, "Doe"),
		customerEmail: sanitizeValue(data.customerEmail, `test-${Date.now()}@curalife-test.com`),
		phoneNumber: sanitizedPhone,
		dateOfBirth: sanitizeValue(data.dateOfBirth, "19710101"), // YYYYMMDD format
		state: sanitizeValue(data.state, "NY"),

		// New address fields for Beluga
		address: sanitizeValue(data.address, "123 Main Street"),
		city: sanitizeValue(data.city, "New York"),
		zip: sanitizeValue(data.zip, "10001"),
		sex: sanitizeValue(data.sex, "Other"),

		// Quiz responses for Q&A format
		mainReasons: sanitizeArray(data.mainReasons, []),
		medicalConditions: sanitizeArray(data.medicalConditions, []),
		allResponses: Array.isArray(data.allResponses)
			? data.allResponses.map(response => ({
					questionId: sanitizeValue(response?.questionId, ""),
					answer: sanitizeValue(response?.answer, ""),
					value: sanitizeValue(response?.value, "")
				}))
			: [],

		// Tracking and metadata
		workflowType: "scheduling",
		testMode: Boolean(data.testMode),
		triggeredAt: sanitizeValue(data.triggeredAt, new Date().toISOString()),
		quizId: sanitizeValue(data.quizId, "dietitian-quiz"),
		quizTitle: sanitizeValue(data.quizTitle, "Find Your Perfect Dietitian")
	};
}

function processInsurancePlanData(data) {
	return {
		// Basic customer information
		customerEmail: sanitizeValue(data.customerEmail, `test-${Date.now()}@curalife-test.com`),
		firstName: sanitizeValue(data.firstName, "John"),
		lastName: sanitizeValue(data.lastName, "Doe"),
		phoneNumber: sanitizeValue(data.phoneNumber, "+15142546011"),
		state: sanitizeValue(data.state, "CA"),
		dateOfBirth: sanitizeValue(data.dateOfBirth, "19850315"),

		// Insurance information
		insurance: sanitizeValue(data.insurance, "aetna"),
		insuranceMemberId: sanitizeValue(data.insuranceMemberId, ""),
		groupNumber: sanitizeValue(data.groupNumber, ""),

		// HubSpot contact ID for association
		hubspotContactId: sanitizeValue(data.hubspotContactId, ""),

		// Eligibility data
		eligibilityData: {
			isEligible: data.eligibilityData?.isEligible || false,
			sessionsCovered: Number(data.eligibilityData?.sessionsCovered) || 0,
			eligibilityStatus: sanitizeValue(data.eligibilityData?.eligibilityStatus, "UNKNOWN"),
			copay: Number(data.eligibilityData?.copay) || 0,
			planBegin: sanitizeValue(data.eligibilityData?.planBegin, ""),
			planEnd: sanitizeValue(data.eligibilityData?.planEnd, ""),
			deductible: {
				individual: Number(data.eligibilityData?.deductible?.individual) || 0
			},
			userMessage: sanitizeValue(data.eligibilityData?.userMessage, "")
		},

		// Stedi API response data
		stediResponse: data.stediResponse || {},

		// Telemedicine categories
		mainReasons: sanitizeArray(data.mainReasons, []),
		medicalConditions: sanitizeArray(data.medicalConditions, []),

		// Tracking
		workflowType: "insurance_plan",
		triggeredAt: sanitizeValue(data.triggeredAt, new Date().toISOString())
	};
}

async function waitForWorkflowCompletion(executionName, maxWaitTime = 60000) {
	const startTime = Date.now();
	const pollInterval = 1000; // Poll every 1 second

	while (Date.now() - startTime < maxWaitTime) {
		try {
			const execution = await workflowsClient.getExecution({
				name: executionName
			});

			if (execution.state === "SUCCEEDED") {
				return execution.result ? JSON.parse(execution.result) : {};
			} else if (execution.state === "FAILED") {
				throw new Error(`Workflow execution failed: ${execution.error}`);
			} else if (execution.state === "CANCELLED") {
				throw new Error("Workflow execution was cancelled");
			}

			// Still running, wait before polling again
			await new Promise(resolve => setTimeout(resolve, pollInterval));
		} catch (error) {
			if (error.message.includes("execution failed") || error.message.includes("cancelled")) {
				throw error;
			}
			// Continue polling for other errors (like network issues)
			await new Promise(resolve => setTimeout(resolve, pollInterval));
		}
	}

	throw new Error(`Workflow execution timed out after ${maxWaitTime}ms`);
}
