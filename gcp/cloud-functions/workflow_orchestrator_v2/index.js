const { Storage } = require("@google-cloud/storage");
const functions = require("@google-cloud/functions-framework");

const storage = new Storage();
const BUCKET_NAME = "curalife-workflow-status";

// Service endpoints
const ENDPOINTS = {
	eligibilityChecker: "https://us-central1-telemedicine-458913.cloudfunctions.net/eligibility-checker-service",
	userCreation: "https://us-central1-telemedicine-458913.cloudfunctions.net/workflow_user_creation",
	insurancePlan: "https://us-central1-telemedicine-458913.cloudfunctions.net/workflow_insurance_plan"
};

// CORS headers
const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, GET, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
	"Access-Control-Allow-Credentials": "true",
	"Access-Control-Max-Age": "3600",
	"Content-Type": "application/json"
};

class WorkflowOrchestrator {
	constructor(requestData) {
		this.rawData = requestData;
		this.timestamp = Date.now();
		this.statusTrackingId = requestData.statusTrackingId || this.generateStatusId();
		this.bucketName = BUCKET_NAME;
		this.statusObjectName = `status/${this.statusTrackingId}.json`;

		// Workflow state
		this.eligibilityData = null;
		this.userCreationData = null;
		this.insurancePlanData = null;
		this.workflowError = null;
	}

	generateStatusId() {
		return String(this.timestamp * 1000 + Math.floor(Math.random() * 1000));
	}

	formatDateForHubSpot(dateString) {
		if (!dateString) return "";

		// Handle YYYYMMDD format (e.g., "19750505")
		if (/^\d{8}$/.test(dateString)) {
			const year = dateString.substring(0, 4);
			const month = dateString.substring(4, 6);
			const day = dateString.substring(6, 8);

			// Create date at midnight UTC
			const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
			return date.getTime(); // Return timestamp in milliseconds
		}

		// Handle YYYY-MM-DD format
		if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
			const date = new Date(dateString + "T00:00:00.000Z");
			return date.getTime();
		}

		// If it's already a valid date, convert to midnight UTC
		const date = new Date(dateString);
		if (!isNaN(date.getTime())) {
			const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
			return utcDate.getTime();
		}

		// Return empty string if date is invalid
		return "";
	}

	async updateStatus(step, progress, message, additionalData = {}) {
		const statusData = {
			statusTrackingId: this.statusTrackingId,
			currentStep: step,
			progress,
			message,
			timestamp: Date.now(),
			completed: step === "completed" || step === "error",
			error: step === "error",
			...additionalData
		};

		try {
			const file = storage.bucket(this.bucketName).file(this.statusObjectName);
			await file.save(JSON.stringify(statusData), {
				metadata: { contentType: "application/json" }
			});
		} catch (error) {
			console.error("Failed to update status:", error);
		}
	}

	validatePayload() {
		const required = ["customerEmail"];
		const missing = required.filter(field => !this.rawData[field]);

		if (missing.length > 0) {
			throw new Error(`Missing required fields: ${missing.join(", ")}`);
		}

		this.cleanPayload = {
			customerEmail: String(this.rawData.customerEmail || ""),
			firstName: String(this.rawData.firstName || ""),
			lastName: String(this.rawData.lastName || ""),
			phoneNumber: this.rawData.phoneNumber || "",
			state: this.rawData.state || "",
			insurance: String(this.rawData.insurance || ""),
			insuranceMemberId: String(this.rawData.insuranceMemberId || ""),
			groupNumber: String(this.rawData.groupNumber || ""),
			dateOfBirth: String(this.rawData.dateOfBirth || ""),
			consent: this.rawData.consent || false,
			testMode: this.rawData.testMode || false,
			mainReasons: this.rawData.mainReasons || [],
			medicalConditions: this.rawData.medicalConditions || []
		};
	}

	determineWorkflowPath() {
		const { insurance, insuranceMemberId, firstName, lastName } = this.cleanPayload;

		// Full workflow: Has insurance info, needs eligibility check
		if (insurance && insuranceMemberId && firstName && lastName) {
			return "full_workflow_with_insurance";
		}

		// Simple workflow: No insurance info, skip eligibility
		return "simple_workflow_no_insurance";
	}

	async callService(url, payload, timeout = 90000) {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeout);

		try {
			const response = await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
				signal: controller.signal
			});

			clearTimeout(timeoutId);

			const responseData = await response.json();

			return {
				success: response.ok,
				status: response.status,
				data: responseData
			};
		} catch (error) {
			clearTimeout(timeoutId);
			return {
				success: false,
				error: error.message,
				isTimeout: error.name === "AbortError"
			};
		}
	}

	async checkEligibility() {
		await this.updateStatus("eligibility", 25, "🔍 Checking insurance eligibility...", {
			debug: {
				workflowPath: "full_workflow_with_insurance",
				insuranceInfo: {
					provider: this.cleanPayload.insurance,
					hasMemberId: !!this.cleanPayload.insuranceMemberId,
					hasGroupNumber: !!this.cleanPayload.groupNumber
				}
			}
		});

		const eligibilityPayload = {
			customerEmail: this.cleanPayload.customerEmail,
			firstName: this.cleanPayload.firstName,
			lastName: this.cleanPayload.lastName,
			insurance: this.cleanPayload.insurance,
			insuranceMemberId: this.cleanPayload.insuranceMemberId,
			groupNumber: this.cleanPayload.groupNumber,
			dateOfBirth: this.cleanPayload.dateOfBirth,
			testMode: this.cleanPayload.testMode
		};

		const result = await this.callService(ENDPOINTS.eligibilityChecker, eligibilityPayload);

		if (result.success && result.data && result.data.success) {
			this.eligibilityData = result.data;
			return { success: true };
		} else if (result.status === 500) {
			throw new Error("Critical failure: API configuration error");
		} else {
			// Eligibility check failed, continue without eligibility but mark as failed
			this.eligibilityData = {
				eligibilityData: {
					eligibilityStatus: "ERROR",
					isEligible: false,
					userMessage: "Unable to verify insurance eligibility at this time. You may proceed with account creation.",
					isProcessing: false
				},
				debug: {
					eligibilityCheckFailed: true,
					error: result
				}
			};
			return { success: false, continuable: true };
		}
	}

	async createUser() {
		await this.updateStatus("user_creation", 50, "🛍️ Creating user accounts...", {
			debug: {
				userCreationWorkflowUrl: ENDPOINTS.userCreation,
				eligibilityCompleted: !!this.eligibilityData
			}
		});

		const result = await this.callService(ENDPOINTS.userCreation, this.cleanPayload);

		if (result.success && result.data) {
			this.userCreationData = result.data;
			return { success: true };
		} else {
			// Enhanced error logging
			console.error("User creation failed:", {
				success: result.success,
				status: result.status,
				error: result.error,
				data: result.data
			});

			const errorMessage = result.error || (result.data && result.data.error) || `HTTP ${result.status || "unknown"}`;

			throw new Error(`Critical failure: User account creation failed - ${errorMessage}`);
		}
	}

	async createInsurancePlan() {
		await this.updateStatus("insurance_plan", 75, "🏥 Processing insurance plan details...", {
			debug: {
				insurancePlanWorkflowUrl: ENDPOINTS.insurancePlan,
				userCreationCompleted: true,
				hubspotContactId: this.userCreationData?.hubspotContactId || "unknown"
			}
		});

		const insurancePlanPayload = {
			customerEmail: this.cleanPayload.customerEmail,
			firstName: this.cleanPayload.firstName,
			lastName: this.cleanPayload.lastName,
			phoneNumber: this.cleanPayload.phoneNumber,
			state: this.cleanPayload.state,
			insurance: this.cleanPayload.insurance,
			insuranceMemberId: this.cleanPayload.insuranceMemberId,
			groupNumber: this.cleanPayload.groupNumber,
			dateOfBirth: this.formatDateForHubSpot(this.cleanPayload.dateOfBirth),
			hubspotContactId: this.userCreationData?.hubspotContactId,
			eligibilityData: this.eligibilityData?.eligibilityData || null,
			stediResponse: this.eligibilityData?.debug || null,
			mainReasons: this.cleanPayload.mainReasons,
			medicalConditions: this.cleanPayload.medicalConditions
		};

		const result = await this.callService(ENDPOINTS.insurancePlan, insurancePlanPayload, 180000);

		if (result.success && result.data) {
			this.insurancePlanData = result.data;
			return { success: true };
		} else {
			// Enhanced error logging
			console.error("Insurance plan creation failed:", {
				success: result.success,
				status: result.status,
				error: result.error,
				data: result.data
			});

			const errorMessage = result.error || (result.data && result.data.error) || `HTTP ${result.status || "unknown"}`;

			throw new Error(`Critical failure: Insurance plan creation failed - ${errorMessage}`);
		}
	}

	async executeFullWorkflow() {
		try {
			// 1. Check eligibility
			const eligibilityResult = await this.checkEligibility();

			// 2. Create user (regardless of eligibility result)
			await this.createUser();

			// 3. Create insurance plan
			await this.createInsurancePlan();

			// 4. Complete successfully
			await this.updateStatus("completed", 100, "✅ Account creation completed successfully!", {
				finalData: {
					userCreation: this.userCreationData,
					eligibility: this.eligibilityData,
					insurancePlan: this.insurancePlanData
				},
				debug: {
					workflowPath: "full_workflow_with_insurance",
					totalElapsedTime: Date.now() - this.timestamp,
					completionSummary: {
						eligibilitySuccess: eligibilityResult.success,
						userCreationSuccess: true,
						insurancePlanSuccess: true
					}
				}
			});

			return {
				statusCode: 200,
				body: {
					success: true,
					statusTrackingId: this.statusTrackingId,
					message: "Account creation completed successfully",
					data: {
						userCreation: this.userCreationData,
						eligibility: this.eligibilityData,
						insurancePlan: this.insurancePlanData
					}
				}
			};
		} catch (error) {
			return this.handleError(error);
		}
	}

	async executeSimpleWorkflow() {
		try {
			// 1. Create user (no insurance processing)
			await this.createUser();

			// 2. Complete successfully
			await this.updateStatus("completed", 100, "✅ Account creation completed (no insurance coverage)", {
				finalData: {
					userCreation: this.userCreationData
				},
				debug: {
					workflowPath: "simple_workflow_no_insurance",
					totalElapsedTime: Date.now() - this.timestamp
				}
			});

			return {
				statusCode: 200,
				body: {
					success: true,
					statusTrackingId: this.statusTrackingId,
					message: "Account creation completed (no insurance coverage)",
					data: {
						userCreation: this.userCreationData
					}
				}
			};
		} catch (error) {
			return this.handleError(error);
		}
	}

	async handleError(error) {
		const errorMessage = error.message || "Workflow processing failed";

		await this.updateStatus("error", 0, `❌ ${errorMessage}`, {
			errorDetails: errorMessage,
			debug: {
				error: error.stack,
				timestamp: Date.now()
			}
		});

		return {
			statusCode: 500,
			body: {
				success: false,
				statusTrackingId: this.statusTrackingId,
				error: errorMessage
			}
		};
	}

	async execute() {
		try {
			// Initialize status
			await this.updateStatus("initializing", 0, "🚀 Starting user creation process...", {
				debug: {
					workflowStartTime: this.timestamp,
					customerEmail: this.rawData.customerEmail || "unknown",
					hasInsurance: !!this.rawData.insurance,
					hasMemberId: !!this.rawData.insuranceMemberId
				}
			});

			// Validate payload
			await this.updateStatus("validating", 10, "📋 Validating information...");
			this.validatePayload();

			// Determine and execute workflow path
			const workflowPath = this.determineWorkflowPath();

			if (workflowPath === "full_workflow_with_insurance") {
				return await this.executeFullWorkflow();
			} else {
				return await this.executeSimpleWorkflow();
			}
		} catch (error) {
			if (error.message.includes("Missing required fields")) {
				return {
					statusCode: 400,
					body: {
						success: false,
						statusTrackingId: this.statusTrackingId,
						error: error.message
					}
				};
			}
			return this.handleError(error);
		}
	}
}

// Main function
functions.http("workflowOrchestratorV2", async (req, res) => {
	// Handle CORS preflight
	if (req.method === "OPTIONS") {
		res.set(CORS_HEADERS);
		res.status(204).send("");
		return;
	}

	// Set CORS headers
	res.set(CORS_HEADERS);

	try {
		const orchestrator = new WorkflowOrchestrator(req.body || {});
		const result = await orchestrator.execute();

		res.status(result.statusCode).json(result.body);
	} catch (error) {
		console.error("Orchestrator error:", error);
		res.status(500).json({
			success: false,
			error: "Internal server error",
			message: error.message
		});
	}
});

module.exports = { WorkflowOrchestrator };
