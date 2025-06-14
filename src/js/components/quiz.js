const ELEMENT_SELECTORS = {
	MAIN_CONTAINER: "#quiz-container",
	QUESTIONS: ".quiz-questions",
	RESULTS: ".quiz-results",
	ERROR: ".quiz-error",
	LOADING: ".quiz-loading",
	STATUS_CHECK: ".quiz-status-check",
	PROGRESS_BAR: ".quiz-progress-bar",
	QUESTION_CONTAINER: ".quiz-question-container",
	NAVIGATION_BUTTONS: ".quiz-navigation",
	NEXT_BUTTON: "#quiz-next-button"
};

class ModularQuiz {
	constructor(options = {}) {
		this._initializeDOMElements();
		if (!this._isInitialized) return;

		if (!this._validateEssentialElements()) return;

		// State
		this.quizData = null;
		this.config = null;
		this.currentStepIndex = 0;
		this.currentQuestionIndex = 0;
		this.responses = [];
		this.submitting = false;
		this.loadingInterval = null; // Used for comprehensive loading sequence steps

		// New state for background processing orchestration and polling
		this.statusTrackingId = null;
		this.pollingAttempts = 0;
		this.maxPollingAttempts = 20; // 40 seconds max (2 sec interval * 20 attempts)
		this.statusPollingInterval = null;
		this.pollingTimeout = null; // Overall timeout for the polling process
		this.workflowCompletionResolve = null; // To resolve the promise returned by _startOrchestratorWorkflow
		this.workflowCompletionReject = null; // To reject the promise returned by _startOrchestratorWorkflow
		this._lastStatusMessage = ""; // To prevent duplicate notifications for same status

		// Initialize the modular notification system and Stedi error mappings asynchronously
		Promise.all([this._initializeNotificationManager(), this._initializeStediErrorMappings()]).then(() => {
			this.init();
		});
	}

	async _initializeNotificationManager() {
		try {
			// Get the notifications.js URL from the data attribute set by Liquid
			const notificationsUrl = this.container.getAttribute("data-notifications-url");

			if (!notificationsUrl) {
				throw new Error("Notifications asset URL not found");
			}

			console.log("🔗 Loading notification system from:", notificationsUrl);

			// Dynamic import of the NotificationManager using the asset URL
			const { NotificationManager } = await import(notificationsUrl);

			// Configure the notification manager for quiz component using generic classes
			this.notificationManager = new NotificationManager({
				containerSelector: ".notification-container",
				position: "top-right",
				autoCollapse: false, // Disabled auto-collapse for better user control
				maxNotifications: 50,
				defaultDuration: 0, // Don't auto-remove notifications by default
				enableFiltering: true,
				enableCopy: true
				// Using generic notification classes - no custom mapping needed
			});

			console.log("✅ Notification system loaded successfully");
			return true;
		} catch (error) {
			console.error("❌ Failed to load notification system:", error);

			// Fallback: Create a simple notification function
			this.notificationManager = {
				show: (text, type = "info", priority = null) => {
					console.log(`📢 Notification (${type}):`, text);
					return null;
				},
				clear: () => console.log("🧹 Clear notifications"),
				exportNotifications: () => console.log("📤 Export notifications")
			};

			return false;
		}
	}

	async _initializeStediErrorMappings() {
		try {
			// Get the stedi error mappings URL from the data attribute set by Liquid
			const stediErrorMappingsUrl = this.container.getAttribute("data-stedi-mappings-url");

			if (!stediErrorMappingsUrl) {
				console.warn("Stedi error mappings URL not found, using fallback error handling");
				return false;
			}

			console.log("🔗 Loading Stedi error mappings from:", stediErrorMappingsUrl);

			// Dynamic import of the Stedi error mappings
			const { getStediErrorMapping, createStediErrorEligibilityData, getErrorTitle, isUserCorrectableError } = await import(stediErrorMappingsUrl);

			this.stediErrorMappings = {
				getMapping: getStediErrorMapping,
				createEligibilityData: createStediErrorEligibilityData,
				getTitle: getErrorTitle,
				isUserCorrectable: isUserCorrectableError
			};

			console.log("✅ Stedi error mappings loaded successfully");
			return true;
		} catch (error) {
			console.error("❌ Failed to load Stedi error mappings:", error);
			this.stediErrorMappings = null;
			return false;
		}
	}

	_initializeDOMElements() {
		this.container = document.querySelector(ELEMENT_SELECTORS.MAIN_CONTAINER);
		if (!this.container) {
			console.error("ModularQuiz: Main container not found. Quiz cannot start.");
			this._isInitialized = false;
			return;
		}

		this.dataUrl = this.container.getAttribute("data-quiz-url") || "/apps/quiz/data.json";

		Object.keys(ELEMENT_SELECTORS).forEach(key => {
			if (key !== "MAIN_CONTAINER") {
				const selector = ELEMENT_SELECTORS[key];
				this[this._selectorToProperty(key)] = this.container.querySelector(selector);
			}
		});

		this.navHeader = this.container.querySelector("#quiz-nav-header");
		this.progressSection = this.container.querySelector("#quiz-progress-section");
		this._isInitialized = true;
	}

	_selectorToProperty(selectorKey) {
		return selectorKey
			.toLowerCase()
			.split("_")
			.map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
			.join("");
	}

	_validateEssentialElements() {
		const essentialElements = ["questions", "results", "error", "loading", "progressBar", "questionContainer", "navigationButtons", "nextButton"];

		for (const element of essentialElements) {
			if (!this[element]) {
				this._displayCriticalError(`Essential element "${element}" is missing`);
				return false;
			}
		}
		return true;
	}

	_displayCriticalError(message) {
		this.container.innerHTML = `
            <div class="quiz-error quiz-critical-error">
                <h3 class="quiz-subtitle quiz-error-text">Quiz Error</h3>
                <p class="quiz-text">${message}. Please refresh or contact support.</p>
            </div>
        `;
		this._isInitialized = false;
	}

	async init() {
		if (!this._isInitialized) return;

		this._attachBackButtonListener();
		this._attachNextButtonListener();
		this._loadAndDisplayFirstStep();
	}

	_attachBackButtonListener() {
		if (!this.navHeader) return;

		const backButton = this.navHeader.querySelector("#quiz-back-button");
		if (backButton) {
			backButton.addEventListener("click", () => {
				// If we're showing results, go back to the last step
				if (this.questionContainer.querySelector(".quiz-results-container")) {
					this.currentStepIndex = this.quizData.steps.length - 1;
					this.currentQuestionIndex = 0;
					this.renderCurrentStep();
					this.updateNavigation();
				} else if (this.currentStepIndex === 0) {
					window.location.href = "/pages/telemedicine";
				} else {
					this.goToPreviousStep();
				}
			});
		}
	}

	_attachNextButtonListener() {
		if (!this.nextButton) return;

		this.nextButtonHandler = e => {
			if (!this.nextButton.disabled) {
				this.goToNextStep();
			}
		};

		this.nextButton.addEventListener("click", this.nextButtonHandler);
	}

	async _loadAndDisplayFirstStep() {
		this._toggleElement(this.questions, false);
		this._toggleElement(this.loading, true);

		try {
			await this.loadQuizData();
			this._initializeResponses();
			this._applyTestDataIfEnabled();

			this._toggleElement(this.loading, false);
			this._toggleElement(this.questions, true);
			this._toggleElement(this.navHeader, true);
			this._toggleElement(this.progressSection, true);

			this.renderCurrentStep();
			this.updateNavigation();
		} catch (error) {
			console.error("Failed to load quiz:", error);
			this._toggleElement(this.loading, false);
			this._toggleElement(this.error, true);
		}
	}

	async loadQuizData() {
		const response = await fetch(this.dataUrl);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const text = await response.text();
		this.quizData = JSON.parse(text);
		this.config = this.quizData.config || {};

		return this.quizData;
	}

	_initializeResponses() {
		this.responses = this.quizData.steps.flatMap(step =>
			step.questions ? step.questions.map(question => ({ stepId: step.id, questionId: question.id, answer: null })) : [{ stepId: step.id, questionId: step.id, answer: null }]
		);
	}

	_applyTestDataIfEnabled() {
		const testMode = new URLSearchParams(window.location.search).get("test");

		if (testMode && this.quizData.testData) {
			let testDataKey = "default";
			let displayName = testMode;

			// Support different test scenarios
			if (testMode === "true") {
				testDataKey = "default";
				displayName = "TEST API - UHC Test Data";
			} else if (testMode === "not-covered") {
				testDataKey = "notCovered";
				displayName = "TEST API - Not Covered Test";
			} else if (this.quizData.testData[testMode]) {
				testDataKey = testMode;
				// Create display names for better UX
				const displayNames = {
					default: "TEST API - UHC Test Data",
					notCovered: "TEST API - Not Covered Test",
					aetna_dependent: "TEST API - Aetna Test Data",
					anthem_dependent: "TEST API - Anthem Test Data",
					bcbstx_dependent: "TEST API - BCBS TX Test Data",
					cigna_dependent: "TEST API - Cigna Test Data",
					oscar_dependent: "TEST API - Oscar Test Data",
					error_42: "TEST API - Error 42 Test Data",
					error_43: "TEST API - Error 43 Test Data",
					error_72: "TEST API - Error 72 Test Data",
					error_73: "TEST API - Error 73 Test Data",
					error_75: "TEST API - Error 75 Test Data",
					error_79: "TEST API - Error 79 Test Data"
				};
				displayName = displayNames[testMode] || `TEST API - ${testMode.toUpperCase()}`;
			}

			const testData = this.quizData.testData[testDataKey] || this.quizData.testData.default || this.quizData.testData;

			if (testData) {
				Object.keys(testData).forEach(questionId => {
					const responseIndex = this.responses.findIndex(r => r.questionId === questionId);
					if (responseIndex !== -1) {
						this.responses[responseIndex].answer = testData[questionId];
					}
				});
				this._addTestModeIndicator(`🔬 ${displayName}`);
			}
		}
	}

	_addTestModeIndicator(text = "🧪 TEST MODE") {
		if (document.querySelector(".quiz-test-mode-indicator")) return;

		const indicator = document.createElement("div");
		indicator.className = "quiz-test-mode-indicator";
		indicator.innerHTML = text;
		indicator.style.cssText = `
            position: fixed; top: 10px; right: 10px; background: #4CAF50;
            color: white; padding: 8px 12px; border-radius: 4px; font-weight: bold;
            font-size: 12px; z-index: 9999; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
		document.body.appendChild(indicator);
		setTimeout(() => indicator.remove(), 5000);
	}

	// HIPAA COMPLIANCE: This method has been removed to prevent PHI data from being sent directly to eligibility workflow from browser
	// Eligibility checking is now handled server-side within the user creation workflow
	_triggerEligibilityWorkflow() {
		console.warn("⚠️ HIPAA COMPLIANCE: Direct eligibility workflow calls from browser are disabled. Eligibility will be checked server-side.");
		// Show user-friendly notification
		this._showBackgroundProcessNotification("🔒 Insurance verification will be processed securely server-side", "info");
	}

	async finishQuiz() {
		const resultUrl = this.container.getAttribute("data-result-url") || this.container.getAttribute("data-booking-url") || "/quiz-complete";

		try {
			this.submitting = true;
			this.nextButton.disabled = true;

			this._toggleElement(this.navigationButtons, false);
			this._toggleElement(this.progressSection, false);

			// Start the comprehensive loading sequence (UI only)
			this._showComprehensiveLoadingSequence();

			// Trigger the orchestrator workflow and await its *final* completion (including polling)
			const orchestratorResult = await this._startOrchestratorWorkflow();

			// Process the final result from the orchestrator
			const finalResult = this._processWebhookResult(orchestratorResult);
			console.log("Processed final result:", finalResult);

			// Test mode comprehensive finish notification
			if (this.isTestMode) {
				const workflowStatus = orchestratorResult ? "✅ Completed" : "❌ Failed"; // Simplistic based on success of awaited promise

				this._showBackgroundProcessNotification(
					`
					🧪 TEST MODE - Quiz Completion Status<br>
					• Orchestrator Workflow: ${workflowStatus}<br>
					• Final Status: ${finalResult?.eligibilityStatus || "Unknown"}<br>
					• Is Eligible: ${finalResult?.isEligible}<br>
					• Result URL: ${resultUrl}<br>
					• Total Responses: ${this.responses?.length || 0}
				`,
					"info"
				);
			}

			console.log("Calling showResults with:", { resultUrl, finalResult });

			// Add debugging to see if showResults is actually being called
			try {
				console.log("About to call showResults...");
				this.showResults(resultUrl, true, finalResult);
				console.log("showResults called successfully");
			} catch (showResultsError) {
				console.error("Error in showResults:", showResultsError);
				throw showResultsError;
			}
		} catch (error) {
			console.error("Error finishing quiz:", error);

			// Test mode error notification
			if (this.isTestMode) {
				this._showBackgroundProcessNotification(
					`
					🧪 TEST MODE - Quiz Finish Error<br>
					❌ ${error.message}<br>
					• Check console for details
				`,
					"error"
				);
			}

			// Use _handleWorkflowError to ensure loading is stopped and proper error results are shown
			this._handleWorkflowError(error);
		} finally {
			this.submitting = false;
			this.nextButton.disabled = false;
			// Note: Don't stop polling here as it should continue until workflow completes
			// Polling will be stopped by the workflow completion or error handlers
		}
	}

	// Comprehensive loading sequence with animated status updates
	async _showComprehensiveLoadingSequence() {
		// Show the loading screen with initial state
		this._showLoadingScreen();

		const loadingSteps = [
			{ title: "Processing Your Answers", description: "Analyzing your health information..." },
			{ title: "Checking Insurance Coverage", description: "Verifying your benefits..." },
			{ title: "Finding Your Dietitian", description: "Matching you with the right expert..." },
			{ title: "Preparing Your Results", description: "Finalizing your personalized plan..." }
		];

		// This loop primarily provides initial animation.
		// Real updates will come from _updateWorkflowStatus during polling.
		// Keep it simple and let polling handle the main flow.
		let stepIndex = 0;
		this._updateLoadingStep(loadingSteps[stepIndex]); // Initial step

		// Animate through initial steps if no real status comes through fast
		this.loadingInterval = setInterval(() => {
			stepIndex = (stepIndex + 1) % loadingSteps.length;
			this._updateLoadingStep(loadingSteps[stepIndex]);
		}, 1800); // Slower interval for initial animation
	}

	_showLoadingScreen() {
		// Hide quiz content and show loading screen
		this._toggleElement(this.questions, false);
		this._toggleElement(this.results, false);
		this._toggleElement(this.error, false);

		// Show loading container (using the correct property name 'loading')
		if (this.loading) {
			this.loading.innerHTML = `
				<div class="quiz-comprehensive-loading">
					<div class="quiz-loading-content">
						<div class="quiz-loading-icon">
							<div class="quiz-loading-spinner-large"></div>
						</div>
						<div class="quiz-loading-step">
							<h3 class="quiz-loading-step-title">Starting...</h3>
							<p class="quiz-loading-step-description">Preparing to process your information</p>
						</div>
					</div>
				</div>
			`;
			this._toggleElement(this.loading, true);
		} else {
			// Fallback: update next button
			this.nextButton.innerHTML = `<div class="quiz-spinner"></div>Processing...`;
		}
	}

	_updateLoadingStep(step) {
		const titleElement = document.querySelector(".quiz-loading-step-title");
		const descriptionElement = document.querySelector(".quiz-loading-step-description");

		if (titleElement && descriptionElement) {
			// Animate out
			titleElement.style.opacity = "0";
			descriptionElement.style.opacity = "0";

			setTimeout(() => {
				// Update content
				titleElement.textContent = step.title;
				descriptionElement.textContent = step.description;

				// Animate in
				titleElement.style.opacity = "1";
				descriptionElement.style.opacity = "1";
			}, 300);
		}
	}

	_triggerUserCreationWorkflow() {
		// This is now redundant as orchestrator is directly called in finishQuiz
		console.warn("⚠️ _triggerUserCreationWorkflow is deprecated. Orchestrator is now triggered in finishQuiz.");
	}

	// =======================================================================
	// Orchestrator Workflow Methods (HIPAA Compliant)
	// =======================================================================

	/**
	 * Starts the orchestrator workflow and polls for its completion.
	 * This method triggers the orchestrator cloud function which coordinates
	 * all workflows while maintaining HIPAA compliance.
	 * Returns a Promise that resolves with the final workflow result.
	 */
	_startOrchestratorWorkflow() {
		const orchestratorUrl = this._getOrchestratorUrl();
		const payload = this._extractResponseData();

		// Store for emergency fallback
		this._lastOrchestratorUrl = orchestratorUrl;
		this._lastOrchestratorPayload = payload;

		// Report workflow initialization
		this._reportWorkflowStage("WORKFLOW_INIT", "Starting eligibility and user creation workflow", {
			url: orchestratorUrl,
			hasInsurance: this._hasInsurance(),
			payloadSize: JSON.stringify(payload).length
		});

		// Ensure any previous workflow state is cleaned up
		this._stopStatusPolling();
		this._stopFallbackChecking();

		// Return a new Promise that will resolve when the workflow truly completes
		return new Promise(async (resolve, reject) => {
			// Clear any existing resolvers before setting new ones
			if (this.workflowCompletionResolve || this.workflowCompletionReject) {
				console.warn("Replacing existing workflow completion resolvers");
			}

			this.workflowCompletionResolve = resolve;
			this.workflowCompletionReject = reject;

			try {
				// Report payload preparation
				this._reportWorkflowStage("PAYLOAD_BUILT", "Request data prepared and validated", {
					fields: Object.keys(payload),
					hasInsurance: payload.insurance ? "Yes" : "No"
				});

				// Report orchestrator call
				this._reportWorkflowStage("ORCHESTRATOR_CALL", "Initiating workflow orchestrator", {
					url: orchestratorUrl,
					method: "POST"
				});

				// 1. Initial call to the orchestrator to kick off the process
				const startTime = Date.now();
				const initialResponse = await fetch(orchestratorUrl, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload)
				});

				const duration = `${Date.now() - startTime}ms`;

				if (!initialResponse.ok) {
					const errorText = await initialResponse.text();
					const error = new Error(`Orchestrator initial call failed: HTTP ${initialResponse.status} - ${errorText}`);
					error.status = initialResponse.status;
					error.url = orchestratorUrl;
					this._reportWorkflowError(error, {
						stage: "ORCHESTRATOR_CALL",
						duration,
						responseText: errorText
					});
					throw error;
				}

				// Report successful connection
				this._reportWorkflowStage("ORCHESTRATOR_SUCCESS", "Connected to workflow service successfully", {
					status: initialResponse.status,
					duration
				});

				const initialResult = await initialResponse.json();

				// 2. Check for a statusTrackingId to begin polling, or if final data is immediately available
				if (initialResult.success && initialResult.statusTrackingId) {
					this._reportWorkflowStage("POLLING_START", "Status tracking initiated", {
						trackingId: initialResult.statusTrackingId,
						mode: "Standard Polling"
					});
					this._startStatusPolling(initialResult.statusTrackingId);
				} else if (initialResult.success && initialResult.data) {
					// If orchestrator immediately returns final data (e.g., for simple, fast workflows)
					this._reportWorkflowStage("WORKFLOW_COMPLETE", "Workflow completed immediately", {
						type: "Fast Track",
						hasData: "Yes"
					});
					this._stopLoadingMessages(); // Dismiss loading as it's truly done
					resolve(initialResult.data); // Resolve the promise with the final data
				} else if (initialResult.success) {
					// Workflow started but no immediate data - set up polling with fallback
					this._reportWorkflowStage("POLLING_START", "Status tracking initiated with fallback", {
						trackingId: initialResult.statusTrackingId,
						mode: "Polling + Fallback"
					});

					// Start polling as usual
					this._startStatusPolling(initialResult.statusTrackingId);

					// BUT ALSO set up a fallback check to periodically test if the orchestrator completed
					this._setupOrchestrationFallback(orchestratorUrl, payload, initialResult.statusTrackingId);
				} else {
					// Initial call failed or didn't provide tracking ID/data
					const error = new Error(initialResult.error || "Orchestrator did not provide status tracking ID or final data.");
					this._reportWorkflowError(error, {
						stage: "ORCHESTRATOR_RESPONSE",
						result: initialResult
					});
					throw error;
				}
			} catch (error) {
				console.error("Error initiating orchestrator workflow:", error);
				this._reportWorkflowError(error, {
					stage: "WORKFLOW_INIT",
					url: orchestratorUrl
				});
				this._stopLoadingMessages(); // Ensure loading is dismissed on immediate error
				reject(error); // Reject the promise
			}
		});
	}

	/**
	 * Handles workflow errors
	 */
	_handleWorkflowError(error) {
		console.error("Handling workflow error:", error);

		// Report the workflow failure with detailed context
		this._reportWorkflowError(error, {
			stage: "WORKFLOW_ERROR_HANDLER",
			pollingAttempts: this.pollingAttempts,
			statusTrackingId: this.statusTrackingId,
			workflowType: this._hasInsurance() ? "Full Workflow" : "Simple Workflow"
		});

		// Stop loading messages and status polling
		this._stopLoadingMessages();
		this._stopStatusPolling();
		this._stopFallbackChecking();

		// Reject the workflow promise if it's still pending
		if (this.workflowCompletionReject) {
			this.workflowCompletionReject(error);
			this.workflowCompletionReject = null;
			this.workflowCompletionResolve = null;
		}

		// Create proper error result data
		const errorResultData = {
			eligibilityStatus: "ERROR",
			isEligible: false,
			userMessage: error.message || error.error || "There was an error processing your request.",
			error: error
		};

		// Report final workflow failure
		this._reportWorkflowStage("WORKFLOW_FAILED", "Workflow terminated due to error", {
			errorType: error.name || "UnknownError",
			errorMessage: error.message || "Unknown error",
			errorCode: error.code,
			statusCode: error.status
		});

		// Show error results
		this.showResults(
			this.config.resultUrl,
			false, // webhookSuccess
			errorResultData,
			error.message || error.error || "There was an error processing your request."
		);
	}

	/**
	 * Gets the orchestrator URL
	 */
	_getOrchestratorUrl() {
		const container = document.getElementById("quiz-container");
		return container?.dataset?.orchestratorUrl || "https://us-central1-telemedicine-458913.cloudfunctions.net/workflow_orchestrator";
	}

	// =======================================================================
	// Orchestrator Fallback Methods
	// =======================================================================

	/**
	 * Set up a fallback mechanism to directly check orchestrator completion
	 * This handles cases where status polling fails but the workflow completes
	 */
	_setupOrchestrationFallback(orchestratorUrl, payload, statusTrackingId) {
		// Check every 10 seconds starting after 20 seconds (sooner due to stale status issues)
		this._reportWorkflowStage("FALLBACK_TRIGGERED", "Setting up fallback mechanism", {
			delay: "20 seconds",
			interval: "10 seconds",
			maxAttempts: 6
		});

		this.fallbackTimeout = setTimeout(() => {
			this._startFallbackChecking(orchestratorUrl, payload, statusTrackingId);
		}, 20000);
	}

	_startFallbackChecking(orchestratorUrl, payload, statusTrackingId) {
		let fallbackAttempts = 0;
		const maxFallbackAttempts = 6; // 6 attempts = 1 minute of checking

		this._reportWorkflowStage("FALLBACK_TRIGGERED", "Starting fallback polling", {
			url: orchestratorUrl,
			maxAttempts: maxFallbackAttempts,
			trackingId: statusTrackingId
		});

		this.fallbackInterval = setInterval(async () => {
			fallbackAttempts++;

			try {
				this._reportWorkflowStage("FALLBACK_TRIGGERED", `Fallback check attempt ${fallbackAttempts}`, {
					attempt: fallbackAttempts,
					maxAttempts: maxFallbackAttempts,
					url: orchestratorUrl
				});

				// Try calling the orchestrator again to see if it's completed
				const startTime = Date.now();
				const response = await fetch(orchestratorUrl, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ ...payload, fallbackCheck: true, statusTrackingId })
				});
				const duration = `${Date.now() - startTime}ms`;

				if (response.ok) {
					const result = await response.json();

					// If we get final data, resolve the workflow
					if (result.success && result.data) {
						this._reportWorkflowStage("WORKFLOW_COMPLETE", "Workflow completed via fallback", {
							attempt: fallbackAttempts,
							duration,
							method: "Fallback Polling"
						});

						this._stopFallbackChecking();
						this._stopStatusPolling();
						this._stopLoadingMessages();

						if (this.workflowCompletionResolve) {
							this.workflowCompletionResolve(result.data);
							this.workflowCompletionResolve = null;
						}
						return;
					}
				} else {
					this._reportWorkflowStage("FALLBACK_TRIGGERED", `Fallback check failed`, {
						attempt: fallbackAttempts,
						status: response.status,
						duration
					});
				}
			} catch (error) {
				this._reportWorkflowError(error, {
					stage: "FALLBACK_CHECK",
					attempt: fallbackAttempts,
					maxAttempts: maxFallbackAttempts
				});
			}

			// Stop fallback checking after max attempts
			if (fallbackAttempts >= maxFallbackAttempts) {
				this._reportWorkflowStage("FALLBACK_TRIGGERED", "Fallback attempts exhausted", {
					attempts: fallbackAttempts,
					status: "Max attempts reached"
				});
				this._stopFallbackChecking();
			}
		}, 10000); // Check every 10 seconds
	}

	_stopFallbackChecking() {
		if (this.fallbackInterval) {
			clearInterval(this.fallbackInterval);
			this.fallbackInterval = null;
		}
		if (this.fallbackTimeout) {
			clearTimeout(this.fallbackTimeout);
			this.fallbackTimeout = null;
			this._reportWorkflowStage("FALLBACK_TRIGGERED", "Fallback mechanism stopped", {
				reason: "Cleanup or completion"
			});
		}
	}

	/**
	 * Emergency fallback when stale status is detected
	 */
	_triggerEmergencyFallback() {
		// Use the stored orchestrator data from the initial call
		if (this._lastOrchestratorUrl && this._lastOrchestratorPayload) {
			this._reportWorkflowStage("EMERGENCY_FALLBACK", "Triggering emergency fallback due to stale status", {
				url: this._lastOrchestratorUrl,
				hasPayload: !!this._lastOrchestratorPayload,
				trackingId: this.statusTrackingId
			});
			this._startFallbackChecking(this._lastOrchestratorUrl, this._lastOrchestratorPayload, this.statusTrackingId);
		} else {
			this._reportWorkflowStage("EMERGENCY_FALLBACK", "Emergency fallback failed - missing data", {
				hasUrl: !!this._lastOrchestratorUrl,
				hasPayload: !!this._lastOrchestratorPayload,
				trackingId: this.statusTrackingId
			});

			// Fallback to timeout error
			setTimeout(() => {
				if (this.workflowCompletionReject) {
					const error = new Error("Status polling failed and emergency fallback unavailable");
					this._reportWorkflowError(error, {
						stage: "EMERGENCY_FALLBACK_FAILURE"
					});
					this.workflowCompletionReject(error);
				}
			}, 1000);
		}
	}

	// =======================================================================
	// Status Polling Methods
	// =======================================================================

	/**
	 * Start status polling for enhanced user experience and final workflow completion.
	 * This function will eventually resolve the workflowCompletionPromise.
	 */
	_startStatusPolling(statusTrackingId) {
		// Clear any existing polling interval to prevent duplicates (but preserve statusTrackingId)
		if (this.statusPollingInterval) {
			console.log("Clearing existing polling interval");
			clearInterval(this.statusPollingInterval);
			this.statusPollingInterval = null;
		}
		if (this.pollingTimeout) {
			console.log("Clearing existing polling timeout");
			clearTimeout(this.pollingTimeout);
			this.pollingTimeout = null;
		}

		// Set tracking variables AFTER clearing intervals but WITHOUT calling _stopStatusPolling
		this.statusTrackingId = statusTrackingId;
		this.pollingAttempts = 0;
		this.maxPollingAttempts = 60; // 120 seconds max (2 sec interval * 60 attempts)
		this._lastStatusMessage = "";

		// Start with an immediate poll, then continue every 2 seconds
		this._pollWorkflowStatus();

		this.statusPollingInterval = setInterval(() => {
			this._pollWorkflowStatus();
		}, 2000);

		// Set a overall timeout for the polling
		this.pollingTimeout = setTimeout(
			() => {
				this._stopStatusPolling();
				this._stopLoadingMessages(); // Stop loading on timeout
				console.warn("Polling timed out. Workflow status unknown or took too long.");
				const timeoutError = new Error("Workflow processing took too long. Please contact support.");
				// Reject the original workflow promise if it hasn't been resolved/rejected yet
				if (this.workflowCompletionReject) {
					this.workflowCompletionReject(timeoutError);
					this.workflowCompletionReject = null; // Prevent multiple rejections
				} else {
					console.error("WorkflowCompletionReject not set, cannot reject promise on timeout.");
				}
			},
			this.maxPollingAttempts * 2000 + 10000
		); // Max attempts * interval + a buffer (130 seconds total)
	}

	/**
	 * Polls for workflow status and updates UI.
	 * This function will eventually resolve the workflowCompletionPromise.
	 */
	async _pollWorkflowStatus() {
		if (!this.statusTrackingId) {
			this._stopStatusPolling();
			return;
		}

		if (this.pollingAttempts >= this.maxPollingAttempts) {
			this._reportWorkflowStage("POLLING_ERROR", "Maximum polling attempts reached", {
				attempts: this.pollingAttempts,
				maxAttempts: this.maxPollingAttempts,
				trackingId: this.statusTrackingId
			});
			this._stopStatusPolling(); // Stop polling, overall timeout will handle the promise
			return;
		}

		this.pollingAttempts++;

		try {
			const statusUrl = this._getStatusPollingUrl();
			const payload = { statusTrackingId: this.statusTrackingId };

			const startTime = Date.now();
			const response = await fetch(statusUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			});
			const pollDuration = `${Date.now() - startTime}ms`;

			if (response.ok) {
				const statusData = await response.json();

				// Check for important warnings
				if (statusData.statusData?.debug?.eligibilityTimeout) {
					this._reportWorkflowStage("ELIGIBILITY_TIMEOUT", "Insurance check timed out, workflow continuing", {
						timeout: statusData.statusData.debug.eligibilityTimeout,
						step: statusData.statusData.currentStep
					});
				}

				if (statusData.statusData?.debug?.warnings) {
					statusData.statusData.debug.warnings.forEach(warning => {
						this._reportWorkflowStage("POLLING_WARNING", `Workflow warning: ${warning}`, {
							attempt: this.pollingAttempts,
							step: statusData.statusData.currentStep
						});
					});
				}

				if (statusData.success && statusData.statusData) {
					// Report progress update
					this._reportWorkflowStage("POLLING_UPDATE", `Progress: ${statusData.statusData.progress || 0}%`, {
						step: statusData.statusData.currentStep,
						status: statusData.statusData.currentStatus,
						progress: statusData.statusData.progress,
						attempt: this.pollingAttempts,
						duration: pollDuration
					});

					this._updateWorkflowStatus(statusData.statusData);

					// Track stale status but don't trigger emergency fallback (causes duplicate workflows)
					if (statusData.statusData.currentStep === "processing" && statusData.statusData.progress === 25 && this.pollingAttempts > 15) {
						this._reportWorkflowStage("STALE_STATUS", "Potentially stale status detected", {
							step: statusData.statusData.currentStep,
							progress: statusData.statusData.progress,
							attempts: this.pollingAttempts,
							duration: `${this.pollingAttempts * 2}s`
						});
					}

					if (statusData.statusData.completed) {
						// Extract the final result data properly
						const finalResult = statusData.statusData.finalData || statusData.statusData.finalResult || statusData.statusData;

						// Store the result for debugging
						this.workflowResult = finalResult;

						// Report completion
						this._reportWorkflowStage("WORKFLOW_COMPLETE", "Workflow completed successfully via polling", {
							attempts: this.pollingAttempts,
							totalTime: `${this.pollingAttempts * 2}s`,
							finalStatus: statusData.statusData.currentStatus,
							hasData: finalResult ? "Yes" : "No"
						});

						// Resolve the original workflow promise with the final result from polling BEFORE stopping polling
						if (this.workflowCompletionResolve) {
							this.workflowCompletionResolve(finalResult);
						} else {
							console.warn("WorkflowCompletionResolve not set - workflow may have already completed or been reset.");
						}

						// Now stop polling and cleanup (this will clear the resolvers)
						this._stopStatusPolling();
						this._stopFallbackChecking(); // Stop fallback since polling succeeded
						this._stopLoadingMessages(); // Stop loading since workflow is complete
					}
				} else {
					this._reportWorkflowStage("POLLING_ERROR", "Invalid response from status service", {
						success: statusData.success,
						hasData: !!statusData.statusData,
						error: statusData.error,
						attempt: this.pollingAttempts
					});

					// Non-critical, continue polling unless it's a hard error
					if (statusData.error) {
						this._showBackgroundProcessNotification(`Polling error: ${statusData.error}`, "error", "info");
					}
				}
			} else {
				const errorText = await response.text();
				this._reportWorkflowStage("POLLING_ERROR", `HTTP error during status check`, {
					status: response.status,
					statusText: response.statusText,
					responseText: errorText.substring(0, 200),
					attempt: this.pollingAttempts,
					duration: pollDuration
				});

				// Non-critical, continue polling on network/HTTP errors
				this._showBackgroundProcessNotification(`Network error during status check (${response.status}). Retrying...`, "warning", "info");
			}
		} catch (error) {
			this._reportWorkflowError(error, {
				stage: "STATUS_POLLING",
				attempt: this.pollingAttempts,
				trackingId: this.statusTrackingId
			});

			// Non-critical, continue polling on JS errors
			this._showBackgroundProcessNotification(`An error occurred during status check. Retrying...`, "warning", "info");
		}
	}

	/**
	 * Update UI with real status information from polling
	 */
	_updateWorkflowStatus(statusData) {
		if (!statusData) return;

		const loadingStepsMap = {
			INITIATED: { title: "Processing Your Answers", description: "Analyzing your health information..." },
			ELIGIBILITY_CHECK_STARTED: { title: "Checking Insurance Coverage", description: "Verifying your benefits..." },
			ELIGIBILITY_CHECK_COMPLETED: { title: "Insurance Checked!", description: "Eligibility verification complete." },
			USER_CREATION_STARTED: { title: "Creating Your Account", description: "Setting up your personalized profile..." },
			USER_CREATION_COMPLETED: { title: "Account Created!", description: "Your profile is ready." },
			SCHEDULING_STARTED: { title: "Finding Your Dietitian", description: "Matching you with the right expert..." },
			COMPLETED: { title: "Almost Ready!", description: "Preparing your personalized results..." }, // Final state for success
			FAILED: { title: "Something Went Wrong!", description: "We encountered an issue. Please contact support." } // Final state for failure
		};

		const currentStepInfo = loadingStepsMap[statusData.currentStatus] || {
			title: "Processing...",
			description: statusData.message || "Please wait while we process your request."
		};

		this._updateLoadingStep(currentStepInfo);

		// Show enhanced status notifications with proper types
		if (statusData.message && statusData.message !== this._lastStatusMessage) {
			let notificationType = "info";
			let priority = "info";

			// Determine notification type based on status
			if (statusData.currentStatus?.includes("COMPLETED") || statusData.currentStatus?.includes("SUCCESS")) {
				notificationType = "success";
				priority = "success";
			} else if (statusData.currentStatus?.includes("FAILED") || statusData.currentStatus?.includes("ERROR")) {
				notificationType = "error";
				priority = "error";
			} else if (statusData.currentStatus?.includes("STARTED") || statusData.currentStatus?.includes("PROGRESS")) {
				notificationType = "info";
				priority = "info";
			}

			// Map specific statuses to workflow stages
			const statusToStageMap = {
				INITIATED: "WORKFLOW_INIT",
				ELIGIBILITY_CHECK_STARTED: "ELIGIBILITY_START",
				ELIGIBILITY_CHECK_COMPLETED: "ELIGIBILITY_SUCCESS",
				USER_CREATION_STARTED: "USER_CREATION_START",
				USER_CREATION_COMPLETED: "USER_CREATION_SUCCESS",
				SCHEDULING_STARTED: "SCHEDULING_START",
				COMPLETED: "WORKFLOW_COMPLETE",
				FAILED: "WORKFLOW_FAILED"
			};

			const stage = statusToStageMap[statusData.currentStatus] || "POLLING_UPDATE";

			this._reportWorkflowStage(stage, statusData.message, {
				currentStep: statusData.currentStep,
				progress: statusData.progress,
				elapsedTime: statusData.debug?.elapsedTime,
				workflowPath: statusData.debug?.workflowPath
			});

			this._lastStatusMessage = statusData.message;
		}

		// Update progress bar
		if (statusData.progress !== undefined) {
			this._updateLoadingProgress(statusData.progress);
		}
	}

	/**
	 * Stop status polling
	 */
	_stopStatusPolling() {
		if (this.statusPollingInterval) {
			clearInterval(this.statusPollingInterval);
			this.statusPollingInterval = null;
		}
		if (this.pollingTimeout) {
			clearTimeout(this.pollingTimeout);
			this.pollingTimeout = null;
		}
		// Reset tracking variables
		this.statusTrackingId = null;
		this.pollingAttempts = 0;
		this._lastStatusMessage = "";

		// Clear workflow completion resolvers to prevent memory leaks and errors
		// Note: These should already be null if the workflow completed successfully
		if (this.workflowCompletionResolve || this.workflowCompletionReject) {
			this.workflowCompletionResolve = null;
			this.workflowCompletionReject = null;
		}
	}

	/**
	 * Get the status polling URL
	 */
	_getStatusPollingUrl() {
		const container = document.getElementById("quiz-container");
		// Ensure this points to your actual backend status polling endpoint
		return container?.dataset?.statusPollingUrl || "https://us-central1-telemedicine-458913.cloudfunctions.net/workflow_status_polling";
	}

	/**
	 * Update loading progress indicator
	 */
	_updateLoadingProgress(progress) {
		// Find progress elements and update them
		const progressBars = document.querySelectorAll(".loading-progress-bar, .progress-bar");
		const progressTexts = document.querySelectorAll(".loading-progress-text, .progress-text");

		progressBars.forEach(bar => {
			bar.style.width = `${progress}%`;
		});

		progressTexts.forEach(text => {
			text.textContent = `${progress}%`;
		});
	}

	// =======================================================================
	// Orchestrator Helper Methods
	// =======================================================================

	_extractResponseData(showNotifications = false) {
		const fieldMapping = {
			q9: "customerEmail",
			q7: "firstName",
			q8: "lastName",
			q10: "phoneNumber",
			q5: "state",
			q3: ["insurance", "insurancePrimaryPayerId"],
			q4: "insuranceMemberId",
			q4_group: "groupNumber",
			q1: "mainReasons",
			q2: "medicalConditions",
			// New address fields for Beluga scheduling
			q11: "address",
			q12: "city",
			q13: "zip",
			q14: "sex"
		};

		const data = {
			customerEmail: "",
			firstName: "",
			lastName: "",
			phoneNumber: "",
			state: "",
			insurance: "",
			insurancePrimaryPayerId: "",
			insuranceMemberId: "",
			groupNumber: "",
			mainReasons: [],
			medicalConditions: [],
			dateOfBirth: "",
			consent: true,
			// New address fields for Beluga scheduling
			address: "",
			city: "",
			zip: "",
			sex: ""
		};

		const dobParts = {};

		console.log("Extracting response data from responses:", this.responses);

		// Test mode detailed extraction notification - only show if requested
		if (this.isTestMode && showNotifications) {
			const responsesSummary = this.responses?.map(r => `${r.questionId}: ${Array.isArray(r.answer) ? r.answer.join(",") : r.answer}`).join("<br>• ") || "None";

			this._showBackgroundProcessNotification(
				`
				🧪 TEST MODE - Data Extraction<br>
				• Total responses: ${this.responses?.length || 0}<br>
				• Expected questions: ${Object.keys(fieldMapping).join(", ")}<br>
				• Responses:<br>• ${responsesSummary}
			`,
				"info"
			);
		}

		// Process responses
		if (this.responses && Array.isArray(this.responses)) {
			for (const response of this.responses) {
				const questionId = response.questionId;
				const answer = response.answer;

				// Handle date of birth parts
				if (questionId && (questionId.startsWith("q6_") || questionId.startsWith("q11_") || questionId.includes("birth") || questionId.includes("dob"))) {
					if (questionId.includes("month")) dobParts.month = answer;
					if (questionId.includes("day")) dobParts.day = answer;
					if (questionId.includes("year")) dobParts.year = answer;
					continue;
				}

				// Handle mapped fields
				const fieldName = fieldMapping[questionId];
				if (fieldName) {
					if (Array.isArray(fieldName)) {
						// Handle payer search (q3) mapping to both insurance and insurancePrimaryPayerId
						data[fieldName[0]] = answer;
						data[fieldName[1]] = answer;
					} else {
						data[fieldName] = answer;
					}
				}
			}
		}

		// Construct date of birth
		if (dobParts.month && dobParts.day && dobParts.year) {
			const month = String(dobParts.month).padStart(2, "0");
			const day = String(dobParts.day).padStart(2, "0");
			data.dateOfBirth = `${dobParts.year}${month}${day}`;
		}

		console.log("Extracted response data:", data);

		// Test mode extraction result notification - only show if requested
		if (this.isTestMode && showNotifications) {
			// groupNumber is optional, so exclude it from required field checks
			const missingFields = Object.entries(data)
				.filter(([key, value]) => !value && !["mainReasons", "medicalConditions", "consent", "groupNumber"].includes(key))
				.map(([key]) => key);

			const optionalFields = [];
			if (!data.groupNumber) {
				optionalFields.push("groupNumber");
			}

			this._showBackgroundProcessNotification(
				`
				🧪 TEST MODE - Extraction Result<br>
				• Email: ${data.customerEmail || "❌ Missing"}<br>
				• Name: ${data.firstName} ${data.lastName}<br>
				• Insurance: ${data.insurance || "❌ Missing"}<br>
				• Member ID: ${data.insuranceMemberId || "❌ Missing"}<br>
				• Missing required: ${missingFields.length ? missingFields.join(", ") : "None"}<br>
				• Optional fields: ${optionalFields.length ? optionalFields.join(", ") : "All present"}
			`,
				missingFields.length > 0 ? "error" : "success"
			);
		}

		return data;
	}

	/**
	 * Build payload for the orchestrator workflow
	 */
	_buildWorkflowPayload() {
		const payload = {
			timestamp: Date.now(),
			hasInsurance: this._hasInsurance(),
			customerEmail: this._getResponseValue("customer_email"),
			responses: this.responses || []
		};

		// Add form data if available
		const formData = this._collectFormData();
		if (formData && Object.keys(formData).length > 0) {
			payload.formData = formData;
		}

		// Add insurance data if user has insurance
		if (payload.hasInsurance) {
			const insuranceData = this._collectInsuranceData();
			if (insuranceData) {
				payload.insuranceData = insuranceData;
			}
		}

		console.log("Built workflow payload:", payload);
		return payload;
	}

	/**
	 * Submit orchestrator payload to webhook
	 */
	async _submitOrchestratorToWebhook(url, payload) {
		try {
			console.log("Submitting to orchestrator:", { url, payload });

			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const result = await response.json();
			console.log("Orchestrator response:", result);

			return result;
		} catch (error) {
			console.error("Orchestrator submission failed:", error);
			throw error;
		}
	}

	/**
	 * Check if user has insurance
	 */
	_hasInsurance() {
		const insuranceResponse = this._getResponseValue("has_insurance");
		return insuranceResponse === "yes" || insuranceResponse === true || insuranceResponse === "Yes";
	}

	/**
	 * Get response value by question ID
	 */
	_getResponseValue(questionId) {
		const response = this.responses.find(r => r.questionId === questionId);
		return response ? response.answer : null;
	}

	/**
	 * Collect form data from responses
	 */
	_collectFormData() {
		const formData = {};

		// Map common form fields
		const fieldMappings = {
			customer_first_name: "firstName",
			customer_last_name: "lastName",
			customer_email: "email",
			customer_phone: "phone",
			customer_address: "address",
			customer_city: "city",
			customer_state: "state",
			customer_zip: "zipCode",
			date_of_birth_month: "birthMonth",
			date_of_birth_day: "birthDay",
			date_of_birth_year: "birthYear"
		};

		this.responses.forEach(response => {
			const mappedField = fieldMappings[response.questionId];
			if (mappedField) {
				formData[mappedField] = response.answer;
			}
		});

		return formData;
	}

	/**
	 * Collect insurance data from responses
	 */
	_collectInsuranceData() {
		const insuranceData = {};

		// Map insurance fields
		const insuranceFieldMappings = {
			insurance_provider: "provider",
			form_member_id: "memberId",
			subscriber_group_id: "groupId",
			plan_group_id: "planGroupId"
		};

		this.responses.forEach(response => {
			const mappedField = insuranceFieldMappings[response.questionId];
			if (mappedField) {
				insuranceData[mappedField] = response.answer;
			}
		});

		return Object.keys(insuranceData).length > 0 ? insuranceData : null;
	}

	_showBackgroundProcessNotification(text, type = "info", priority = null) {
		console.log("📢 Creating notification:", { text: text.substring(0, 50) + "...", type, priority });

		// Only show notifications if we have a container
		if (!this.questionContainer) {
			console.log("❌ No questionContainer found, skipping notification");
			return;
		}

		// Delegate completely to the modular notification system
		return this.notificationManager.show(text, type, priority);
	}

	clearNotifications() {
		return this.notificationManager.clear();
	}

	exportNotifications(format = "text", filter = "all") {
		return this.notificationManager.exportNotifications(format, filter);
	}

	getCurrentStep() {
		return this.quizData?.steps?.[this.currentStepIndex] || null;
	}

	getCurrentQuestion() {
		const step = this.getCurrentStep();
		return step?.questions?.[this.currentQuestionIndex] || null;
	}

	getResponseForCurrentQuestion() {
		const step = this.getCurrentStep();
		const questionId = step.questions ? step.questions[this.currentQuestionIndex].id : step.id;

		return (
			this.responses.find(r => r.questionId === questionId) || {
				stepId: step.id,
				questionId: questionId,
				answer: null
			}
		);
	}

	isFormStep(stepId) {
		return this.config.formSteps?.includes(stepId) || false;
	}

	renderCurrentStep() {
		const step = this.getCurrentStep();
		if (!step) return;

		this.questionContainer.className = "quiz-question-container";
		this.questionContainer.classList.add(`quiz-step-${this.currentStepIndex + 1}`);
		this.questionContainer.classList.add(`quiz-step-${step.id}`);

		this._updateProgressBar();

		const stepHTML = this._generateStepHTML(step);
		this.questionContainer.innerHTML = stepHTML;

		this._handleStepAcknowledgment(step);
		this._attachStepEventListeners(step);
		this.updateNavigation();

		if (step.legal && !this.isFormStep(step.id)) {
			this._addLegalTextAfterNavigation(step.legal);
		}

		window.scrollTo({ top: 0, behavior: "smooth" });
	}

	_updateProgressBar() {
		const progress = ((this.currentStepIndex + 1) / this.quizData.steps.length) * 100;
		if (this.progressBar) {
			this.progressBar.classList.add("quiz-progress-bar-animated");
			this.progressBar.style.setProperty("--progress-width", `${progress}%`);

			const progressIndicator = this.container.querySelector(".quiz-progress-indicator");
			if (progressIndicator) {
				const progressContainer = this.container.querySelector(".quiz-progress-container");
				const containerWidth = progressContainer?.offsetWidth || 480;
				const isMobile = window.innerWidth <= 768;
				const indicatorHalfWidth = isMobile ? 16 : 26;
				const indicatorPosition = (progress / 100) * containerWidth - indicatorHalfWidth;

				progressIndicator.style.left = `${indicatorPosition}px`;
				progressIndicator.classList.toggle("visible", progress > 0);
			}
		}
	}

	_generateStepHTML(step) {
		let stepHTML = `<div class="animate-fade-in">`;
		stepHTML += this._generateStepInfoHTML(step);

		if (step.questions?.length > 0) {
			stepHTML += this.isFormStep(step.id) ? this._generateFormStepHTML(step) : this._generateWizardStepHTML(step);
		} else if (!step.info) {
			stepHTML += `<p class="quiz-error-text">Step configuration error. Please contact support.</p>`;
		}

		stepHTML += "</div>";
		return stepHTML;
	}

	_generateStepInfoHTML(step) {
		if (!step.info) return "";

		return `
            <h3 class="quiz-title">${step.info.heading}</h3>
            <p class="quiz-text">${step.info.text}</p>
            ${step.info.subtext ? `<p class="quiz-subtext">${step.info.subtext}</p>` : ""}
        `;
	}

	_generateFormStepHTML(step) {
		const isLastStep = this.currentStepIndex === this.quizData.steps.length - 1;
		const buttonText = isLastStep ? step.ctaText || "Finish Quiz" : step.ctaText || "Continue";

		return `
            ${step.info?.formSubHeading ? `<h4 class="quiz-heading quiz-heading-mobile-outside">${step.info.formSubHeading}</h4>` : ""}
			<div class="quiz-form-container">
                ${step.info?.formSubHeading ? `<h4 class="quiz-heading quiz-heading-desktop-inside">${step.info.formSubHeading}</h4>` : ""}
				<div class="quiz-space-y-6">
					${this._processFormQuestions(step.questions)}
				</div>
				<button class="quiz-nav-button quiz-nav-button--primary quiz-form-button" id="quiz-form-next-button">
					${buttonText}
				</button>
				${step.legal ? `<p class="quiz-legal-form">${step.legal}</p>` : ""}
			</div>
		`;
	}

	_processFormQuestions(questions) {
		let html = "";
		let i = 0;

		while (i < questions.length) {
			const processed = this._tryProcessQuestionGroup(questions, i);
			if (processed.html) {
				html += processed.html;
				i += processed.skip;
			} else {
				html += this._generateSingleFormQuestion(questions[i]);
				i++;
			}
		}

		return html;
	}

	_tryProcessQuestionGroup(questions, index) {
		const question = questions[index];
		const pairs = this.config.questionPairs || {};
		const getResponse = q => this.responses.find(r => r.questionId === q.id) || { answer: null };

		// Check for paired fields
		const pairChecks = [
			{ fields: pairs.memberIdFields, skip: 2 },
			{ fields: pairs.nameFields, skip: 2 },
			{ fields: pairs.contactFields, skip: 2 }
		];

		for (const pair of pairChecks) {
			if (question.id === pair.fields?.[0] && questions[index + 1]?.id === pair.fields[1]) {
				return {
					html: this._generateFormFieldPair(question, questions[index + 1], getResponse(question), getResponse(questions[index + 1])),
					skip: pair.skip
				};
			}
		}

		// Check for date group
		if (question.type === "date-part" && question.part === "month") {
			const [dayQ, yearQ] = [questions[index + 1], questions[index + 2]];
			if (dayQ?.type === "date-part" && dayQ.part === "day" && yearQ?.type === "date-part" && yearQ.part === "year") {
				return {
					html: this._generateDateGroup(question, dayQ, yearQ),
					skip: 3
				};
			}
		}

		return { html: null, skip: 0 };
	}

	_generateSingleFormQuestion(question) {
		const response = this.responses.find(r => r.questionId === question.id) || { answer: null };
		const helpIcon = this._getHelpIcon(question.id);

		return `
            <div class="quiz-question-section">
                <label class="quiz-label" for="question-${question.id}">
                    ${question.text}${helpIcon}
                </label>
                ${question.helpText ? `<p class="quiz-text-sm">${question.helpText}</p>` : ""}
                ${this._renderQuestionByType(question, response)}
            </div>
        `;
	}

	_generateFormFieldPair(leftQuestion, rightQuestion, leftResponse, rightResponse) {
		const generateField = (question, response) => ({
			input: this._renderQuestionByType(question, response),
			helpIcon: this._getHelpIcon(question.id),
			label: question.text,
			id: question.id
		});

		const [left, right] = [generateField(leftQuestion, leftResponse), generateField(rightQuestion, rightResponse)];

		return `
            <div class="quiz-grid-2-form">
                ${[left, right]
									.map(
										field => `
                    <div>
                        <label class="quiz-label" for="question-${field.id}">
                            ${field.label}${field.helpIcon}
                        </label>
                        ${field.input}
                    </div>
                `
									)
									.join("")}
            </div>
        `;
	}

	_getHelpIcon(questionId) {
		const tooltip = this.quizData.validation?.tooltips?.[questionId];
		return tooltip ? this._generateHelpIcon(questionId, tooltip) : "";
	}

	_generateDateGroup(monthQ, dayQ, yearQ) {
		const monthResponse = this.responses.find(r => r.questionId === monthQ.id) || { answer: null };
		const dayResponse = this.responses.find(r => r.questionId === dayQ.id) || { answer: null };
		const yearResponse = this.responses.find(r => r.questionId === yearQ.id) || { answer: null };

		return `
            <div class="quiz-question-section">
                <label class="quiz-label">${monthQ.text}</label>
                <div class="quiz-grid-3">
                    ${this.renderDatePart(monthQ, monthResponse)}
                    ${this.renderDatePart(dayQ, dayResponse)}
                    ${this.renderDatePart(yearQ, yearResponse)}
                </div>
            </div>
        `;
	}

	_generateHelpIcon(questionId, tooltipContent) {
		const escapedTooltip = tooltipContent.replace(/"/g, "&quot;");
		return `<span class="quiz-help-icon-container" data-tooltip="${escapedTooltip}">
            <svg class="quiz-help-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M14.6668 8.00004C14.6668 4.31814 11.682 1.33337 8.00016 1.33337C4.31826 1.33337 1.3335 4.31814 1.3335 8.00004C1.3335 11.6819 4.31826 14.6667 8.00016 14.6667C11.682 14.6667 14.6668 11.6819 14.6668 8.00004Z" stroke="#121212"/>
                <path d="M8.1613 11.3334V8.00004C8.1613 7.68577 8.1613 7.52864 8.06363 7.43097C7.96603 7.33337 7.8089 7.33337 7.49463 7.33337" stroke="#121212" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M7.99463 5.33337H8.00063" stroke="#121212" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </span>`;
	}

	_generateWizardStepHTML(step) {
		const question = step.questions[this.currentQuestionIndex];
		const response = this.getResponseForCurrentQuestion();

		if (!question) {
			return `<p class="quiz-error-text">Question not found. Please try again.</p>`;
		}

		let html = "";

		if (!step.info) {
			html += `
				<h3 class="quiz-title">${question.text}</h3>
				${question.helpText ? `<p class="quiz-text">${question.helpText}</p>` : ""}
			`;
		} else {
			html += `
				<div class="quiz-divider">
					<h4 class="quiz-heading">${question.text}</h4>
					${question.helpText ? `<p class="quiz-text-sm">${question.helpText}</p>` : ""}
				</div>
			`;
		}

		html += this._renderQuestionByType(question, response);
		return html;
	}

	_toggleElement(element, show) {
		element?.classList.toggle("hidden", !show);
	}

	_setNavigationVisibility(visible) {
		if (!this.navigationButtons) return;

		if (visible) {
			this.navigationButtons.classList.remove("quiz-navigation-hidden", "hidden");
			this.navigationButtons.classList.add("quiz-navigation-visible");
		} else {
			this.navigationButtons.classList.add("quiz-navigation-hidden", "hidden");
			this.navigationButtons.classList.remove("quiz-navigation-visible");
		}
	}

	_renderQuestionByType(question, response) {
		switch (question.type) {
			case "multiple-choice":
				return this.renderMultipleChoice(question, response);
			case "checkbox":
				return this.renderCheckbox(question, response);
			case "dropdown":
				return this.renderDropdown(question, response);
			case "payer-search":
				return this.renderPayerSearch(question, response);
			case "text":
				return this.renderTextInput(question, response);
			case "date":
				return this.renderDateInput(question, response);
			case "date-part":
				return this.renderDatePart(question, response);
			case "textarea":
				return this.renderTextarea(question, response);
			case "rating":
				return this.renderRating(question, response);
			default:
				return `<p class="quiz-error-text">Unsupported field type: ${question.type}</p>`;
		}
	}

	renderMultipleChoice(question, response) {
		return this._renderCardOptions(question, response, "radio");
	}

	renderCheckbox(question, response) {
		const selectedOptions = Array.isArray(response.answer) ? response.answer : [];

		if (question.id === "consent") {
			return this._renderSimpleCheckboxes(question, selectedOptions);
		}
		return this._renderCardOptions(question, response, "checkbox");
	}

	_renderCardOptions(question, response, inputType) {
		const selectedOptions = inputType === "checkbox" ? (Array.isArray(response.answer) ? response.answer : []) : null;
		const isSelected = option => (inputType === "checkbox" ? selectedOptions.includes(option.id) : response.answer === option.id);

		let html = '<div class="quiz-grid-2">';
		question.options.forEach(option => {
			const selected = isSelected(option);
			html += `
				<label for="${option.id}" class="quiz-option-card">
					<input type="${inputType}" id="${option.id}" name="question-${question.id}" value="${option.id}" class="quiz-sr-only" ${selected ? "checked" : ""}>
					<div class="quiz-option-button ${selected ? "selected" : ""}">
						<div class="quiz-option-text">
							<div class="quiz-option-text-content">${option.text}</div>
				</div>
						${selected ? this._getCheckmarkSVG() : ""}
				</div>
				</label>
			`;
		});
		return html + "</div>";
	}

	_renderSimpleCheckboxes(question, selectedOptions) {
		let html = '<div class="quiz-space-y-3 quiz-spacing-container">';
		question.options.forEach(option => {
			html += `
				<div class="quiz-checkbox-container">
					<input type="checkbox" id="${option.id}" name="question-${question.id}" value="${option.id}" class="quiz-checkbox-input" ${selectedOptions.includes(option.id) ? "checked" : ""}>
					<label class="quiz-checkbox-label" for="${option.id}">${option.text}</label>
			</div>
		`;
		});
		return html + "</div>";
	}

	renderDropdown(question, response) {
		const options = question.options || [];
		const placeholder = question.placeholder || "Select an option";
		const optionsHTML = options.map(option => `<option value="${option.id}" ${response.answer === option.id ? "selected" : ""}>${option.text}</option>`).join("");

		return `
			<div>
				<select id="question-${question.id}" class="quiz-select">
					<option value="">${placeholder}</option>
					${optionsHTML}
				</select>
				${this._getErrorElement(question.id)}
			</div>
        `;
	}

	renderTextInput(question, response) {
		return `
			<div>
				<input type="text" id="question-${question.id}" class="quiz-input"
					placeholder="${question.placeholder || "Type your answer here..."}"
					value="${response.answer || ""}"
					aria-describedby="error-${question.id}">
				${this._getErrorElement(question.id)}
				</div>
		`;
	}

	_getErrorElement(questionId) {
		return `<p id="error-${questionId}" class="quiz-error-text quiz-error-hidden"></p>`;
	}

	renderDatePart(question, response) {
		const part = question.part;
		let options = this._getDatePartOptions(part);
		const placeholder = question.placeholder || `Select ${part}`;

		return `
            <div>
                <select id="question-${question.id}" class="quiz-select">
                    <option value="">${placeholder}</option>
                    ${options.map(option => `<option value="${option.id}" ${response.answer === option.id ? "selected" : ""}>${option.text}</option>`).join("")}
                </select>
			</div>
		`;
	}

	_getDatePartOptions(part) {
		if (part === "month") {
			return [
				{ id: "01", text: "January" },
				{ id: "02", text: "February" },
				{ id: "03", text: "March" },
				{ id: "04", text: "April" },
				{ id: "05", text: "May" },
				{ id: "06", text: "June" },
				{ id: "07", text: "July" },
				{ id: "08", text: "August" },
				{ id: "09", text: "September" },
				{ id: "10", text: "October" },
				{ id: "11", text: "November" },
				{ id: "12", text: "December" }
			];
		} else if (part === "day") {
			return Array.from({ length: 31 }, (_, i) => {
				const day = String(i + 1).padStart(2, "0");
				return { id: day, text: day };
			});
		} else if (part === "year") {
			const endYear = 2007;
			const startYear = 1920;
			const yearCount = endYear - startYear + 1;
			return Array.from({ length: yearCount }, (_, i) => {
				const year = String(endYear - i);
				return { id: year, text: year };
			});
		}
		return [];
	}

	renderTextarea(question, response) {
		return `
			<div class="quiz-question-section">
				<textarea id="question-${question.id}" class="quiz-textarea" rows="4"
					placeholder="${question.placeholder || "Type your answer here..."}">${response.answer || ""}</textarea>
				</div>
		`;
	}

	renderRating(question, response) {
		return `
			<div class="quiz-spacing-container">
				<input type="range" id="question-${question.id}" class="quiz-range"
					min="1" max="10" step="1" value="${response.answer || 5}">
				<div class="quiz-range-labels">
                    <span>1</span><span>5</span><span>10</span>
							</div>
							</div>
		`;
	}

	renderDateInput(question, response) {
		return `
            <div class="quiz-question-section">
                <input type="date" id="question-${question.id}" class="quiz-input"
                    placeholder="${question.helpText || "MM/DD/YYYY"}"
                    value="${response.answer || ""}"
                    aria-describedby="error-${question.id}">
                ${this._getErrorElement(question.id)}
                ${question.helpText ? `<p class="quiz-text-sm">${question.helpText}</p>` : ""}
			</div>
		`;
	}

	renderPayerSearch(question, response) {
		const selectedPayer = response.answer;
		const placeholder = question.placeholder || "Start typing to search for your insurance plan...";
		let selectedDisplayName = "";

		if (selectedPayer && typeof selectedPayer === "string") {
			selectedDisplayName = this._resolvePayerDisplayName(selectedPayer) || "";
		}

		return `
			<div class="quiz-payer-search-container">
                <div class="quiz-payer-search-input-wrapper">
                    <input type="text" id="question-${question.id}" class="quiz-payer-search-input"
                           placeholder="${placeholder}"
                           value="${selectedDisplayName}"
                           autocomplete="off"
                           aria-describedby="error-${question.id}">
                    <svg class="quiz-payer-search-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
  <path d="M13.1667 13.1667L16.5 16.5M14.8333 8.16667C14.8333 4.48477 11.8486 1.5 8.16667 1.5C4.48477 1.5 1.5 4.48477 1.5 8.16667C1.5 11.8486 4.48477 14.8333 8.16667 14.8333C11.8486 14.8333 14.8333 11.8486 14.8333 8.16667Z" stroke="#121212" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
                </div>
				<div class="quiz-payer-search-dropdown" id="search-dropdown-${question.id}" style="display: none;">
                    <div class="quiz-payer-search-dropdown-header">
                        <span class="quiz-payer-search-dropdown-title">Suggestions</span>
                        <button class="quiz-payer-search-close-btn" type="button" aria-label="Close dropdown">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 4L4 12M4 4L12 12" stroke="#6B7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                    </div>
                    <div class="quiz-payer-search-results"></div>
				</div>
				<p id="error-${question.id}" class="quiz-error-text quiz-error-hidden"></p>
            </div>
        `;
	}

	_renderCommonPayers(question) {
		const commonPayers = this.quizData.commonPayers || [];
		return commonPayers
			.map(
				payer => `
			<button
				type="button"
				class="quiz-option-card quiz-payer-common-button"
				data-payer-id="${payer.stediId}"
				data-payer-name="${payer.displayName}"
				data-question-id="${question.id}"
			>
				<div class="quiz-option-button">
					<div class="quiz-option-text">
						<div class="quiz-option-text-content">${payer.displayName}</div>
					</div>
				</div>
			</button>
		`
			)
			.join("");
	}

	_getCheckmarkSVG() {
		return `<div class="quiz-checkmark">
            <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M9.79158 18.75C4.84404 18.75 0.833252 14.7393 0.833252 9.79168C0.833252 4.84413 4.84404 0.833344 9.79158 0.833344C14.7392 0.833344 18.7499 4.84413 18.7499 9.79168C18.7499 14.7393 14.7392 18.75 9.79158 18.75ZM13.7651 7.82516C14.0598 7.47159 14.012 6.94613 13.6584 6.65148C13.3048 6.35685 12.7793 6.40462 12.4848 6.75818L8.90225 11.0572L7.04751 9.20243C6.72207 8.87701 6.19444 8.87701 5.86899 9.20243C5.54356 9.52784 5.54356 10.0555 5.86899 10.3809L8.369 12.8809C8.53458 13.0465 8.76208 13.1348 8.996 13.1242C9.22992 13.1135 9.44858 13.005 9.59842 12.8252L13.7651 7.82516Z" fill="#418865"/>
            </svg>
        </div>`;
	}

	goToPreviousStep() {
		if (this.currentStepIndex <= 0) return;

		this.currentStepIndex--;
		this.currentQuestionIndex = 0;
		this.renderCurrentStep();
		this.updateNavigation();
	}

	goToNextStep() {
		const currentStep = this.getCurrentStep();
		if (!currentStep) return;

		this.nextButton.disabled = false;

		if (currentStep.info && (!currentStep.questions || currentStep.questions.length === 0)) {
			if (this.currentStepIndex < this.quizData.steps.length - 1) {
				this.currentStepIndex++;
				this.currentQuestionIndex = 0;
				this.renderCurrentStep();
				this.updateNavigation();
			} else {
				this.finishQuiz();
			}
			return;
		}

		if (this.isFormStep(currentStep.id)) {
			if (!this._validateFormStep(currentStep)) return;

			// Check if this is the insurance step completion
			if (currentStep.id === "step-insurance") {
				// HIPAA COMPLIANT: No longer calling eligibility workflow directly from browser
				// Eligibility will be checked server-side by the user creation workflow
				console.log("📋 Insurance information collected - will be processed server-side for HIPAA compliance");
			}

			// Check if this is the contact step completion
			if (currentStep.id === "step-contact") {
				// HIPAA COMPLIANT: Only call user creation workflow
				// This will handle eligibility checking server-side to keep PHI data secure
				console.log("👤 Starting HIPAA-compliant user creation workflow (includes server-side eligibility check)");
				// Removed direct _triggerUserCreationWorkflow call here, as it's now handled by finishQuiz
				// The orchestrator is initiated by finishQuiz, which then waits for its completion.
				this.finishQuiz();
				return;
			}

			if (this.currentStepIndex < this.quizData.steps.length - 1) {
				this.currentStepIndex++;
				this.currentQuestionIndex = 0;
				this.renderCurrentStep();
				this.updateNavigation();
			} else {
				this.finishQuiz();
			}
			return;
		}

		if (currentStep.questions && this.currentQuestionIndex < currentStep.questions.length - 1) {
			this.currentQuestionIndex++;
			this.renderCurrentStep();
			this.updateNavigation();
			return;
		}

		if (this.currentStepIndex === this.quizData.steps.length - 1) {
			this.finishQuiz();
		} else {
			this.currentStepIndex++;
			this.currentQuestionIndex = 0;
			this.renderCurrentStep();
			this.updateNavigation();
		}
	}

	updateNavigation() {
		const step = this.getCurrentStep();
		if (!step) {
			this.nextButton.disabled = true;
			return;
		}

		const isFormStep = this.isFormStep(step.id);
		const currentQuestion = step.questions?.[this.currentQuestionIndex];

		// Always show navigation for non-required multiple choice questions
		const isNonRequiredMultipleChoice = currentQuestion?.type === "multiple-choice" && !currentQuestion.required;
		const isCurrentQuestionAutoAdvance = currentQuestion && this._shouldAutoAdvance(currentQuestion);

		const shouldShowNavigation = isNonRequiredMultipleChoice || !isCurrentQuestionAutoAdvance || isFormStep;
		this._setNavigationVisibility(shouldShowNavigation);

		if (!shouldShowNavigation) return;

		const isLastStep = this.currentStepIndex === this.quizData.steps.length - 1;
		const isLastQuestionInStep = isFormStep ? true : step.questions ? this.currentQuestionIndex === step.questions.length - 1 : true;

		if (isLastStep && isLastQuestionInStep) {
			this.nextButton.innerHTML = step.ctaText || "Finish Quiz";
		} else {
			this.nextButton.innerHTML = this._getStepButtonText(step);
		}

		if (isFormStep && step.questions) {
			this._setNavigationVisibility(false);
			const formButton = this.questionContainer.querySelector("#quiz-form-next-button");
			if (formButton) {
				formButton.disabled = this.submitting;
			}
			return;
		}

		const hasAnswer = this._hasValidAnswer(step);
		this.nextButton.disabled = !hasAnswer || this.submitting;
	}

	_getStepButtonText(step) {
		const question = step.questions[this.currentQuestionIndex];

		// Handle multiple choice questions that are not required
		if (question?.type === "multiple-choice" && !question.required) {
			const response = this.responses.find(r => r.questionId === question.id);
			const hasSelection = response && response.answer;
			return hasSelection ? step.ctaText || "Continue" : "Skip";
		}

		// Handle checkbox questions (like medical step)
		if (question?.type === "checkbox") {
			const response = this.responses.find(r => r.questionId === question.id);
			const hasSelection = response && Array.isArray(response.answer) && response.answer.length > 0;
			return hasSelection ? step.ctaText || "Continue" : "Skip";
		}

		return step.ctaText || "Continue";
	}

	_hasValidAnswer(step) {
		if (step.info && (!step.questions || step.questions.length === 0)) {
			return true;
		}

		if (step.questions?.length > 0) {
			const question = step.questions[this.currentQuestionIndex];
			if (!question) return false;

			if (!question.required) return true;

			const response = this.responses.find(r => r.questionId === question.id);
			if (!response || response.answer === null || response.answer === undefined) {
				return false;
			}

			if (question.type === "checkbox") {
				return Array.isArray(response.answer) && response.answer.length > 0;
			}

			if (typeof response.answer === "string") {
				return response.answer.trim() !== "";
			}

			return true;
		}

		return false;
	}

	_shouldAutoAdvance(question) {
		// Don't auto-advance multiple choice if it's not required
		if (question.type === "multiple-choice" && !question.required) {
			return false;
		}
		return question.type === "multiple-choice" || question.type === "dropdown";
	}

	handleAnswer(answer) {
		if (!this.quizData) return;

		const step = this.getCurrentStep();
		if (!step) return;

		if (step.questions?.length > 0) {
			const question = step.questions[this.currentQuestionIndex];
			if (!question) return;

			this._updateResponse(question.id, answer, step.id);

			if (this._shouldAutoAdvance(question)) {
				this._handleAutoAdvance(answer);
			} else if (question.type === "checkbox") {
				this._updateCheckboxVisualState(question, answer);
			} else {
				this.renderCurrentStep();
			}
		} else if (step.info) {
			this._updateResponse(step.id, answer || "info-acknowledged", step.id);
			this.nextButton.disabled = false;
		}

		this.updateNavigation();
	}

	handleFormAnswer(questionId, answer) {
		const step = this.getCurrentStep();
		if (step?.questions) {
			this._updateResponse(questionId, answer, step.id);
		}
	}

	_updateResponse(questionId, answer, stepId) {
		const responseIndex = this.responses.findIndex(r => r.questionId === questionId);
		if (responseIndex !== -1) {
			this.responses[responseIndex].answer = answer;
		} else {
			this.responses.push({ stepId, questionId, answer });
		}
	}

	_handleAutoAdvance(answer) {
		const allOptionButtons = this.questionContainer.querySelectorAll(".quiz-option-button");
		allOptionButtons.forEach(button => {
			button.classList.remove("selected", "processing", "auto-advance-feedback");
			const existingCheckmark = button.querySelector(".quiz-checkmark");
			if (existingCheckmark) {
				existingCheckmark.remove();
			}
		});

		const selectedElement = this.questionContainer.querySelector(`input[value="${answer}"]:checked`);
		if (selectedElement) {
			const optionButton = selectedElement.closest(".quiz-option-card")?.querySelector(".quiz-option-button");
			if (optionButton) {
				optionButton.classList.add("selected", "processing");
				optionButton.innerHTML += this._getCheckmarkSVG();
				optionButton.classList.add("auto-advance-feedback");
			}
		}

		setTimeout(() => {
			this.goToNextStep();
		}, this.config.autoAdvanceDelay || 600);
	}

	_updateCheckboxVisualState(question, answer) {
		if (!Array.isArray(answer)) return;

		const allCheckboxes = this.questionContainer.querySelectorAll(`input[name="question-${question.id}"]`);
		allCheckboxes.forEach(checkbox => {
			const optionCard = checkbox.closest(".quiz-option-card");
			const optionButton = optionCard?.querySelector(".quiz-option-button");

			if (optionButton) {
				const shouldBeSelected = answer.includes(checkbox.value);
				const isCurrentlySelected = optionButton.classList.contains("selected");

				if (shouldBeSelected !== isCurrentlySelected) {
					if (shouldBeSelected) {
						optionButton.classList.add("selected");
						checkbox.checked = true;
						if (!optionButton.querySelector(".quiz-checkmark")) {
							optionButton.innerHTML += this._getCheckmarkSVG();
						}
					} else {
						optionButton.classList.remove("selected");
						checkbox.checked = false;
						const checkmark = optionButton.querySelector(".quiz-checkmark");
						if (checkmark) {
							checkmark.remove();
						}
					}
				}
			}
		});

		this.updateNavigation();
	}

	_handleStepAcknowledgment(step) {
		if (!step.info) return;

		const infoResponse = this.responses.find(r => r.stepId === step.id && r.questionId === step.id);
		if (infoResponse) {
			infoResponse.answer = "info-acknowledged";
		} else {
			this.responses.push({
				stepId: step.id,
				questionId: step.id,
				answer: "info-acknowledged"
			});
		}

		if (!step.questions || step.questions.length === 0) {
			setTimeout(() => {
				this.nextButton.disabled = false;
			}, 0);
		}
	}

	_attachStepEventListeners(step) {
		if (!step.questions || step.questions.length === 0) return;

		if (this.isFormStep(step.id)) {
			step.questions.forEach(question => {
				this._attachFormQuestionListener(question);
			});

			const formButton = this.questionContainer.querySelector("#quiz-form-next-button");
			if (formButton) {
				formButton.removeEventListener("click", this.formButtonHandler);
				this.formButtonHandler = () => {
					if (!formButton.disabled) {
						this.goToNextStep();
					}
				};
				formButton.addEventListener("click", this.formButtonHandler);
			}
		} else {
			const currentQuestion = step.questions[this.currentQuestionIndex];
			if (currentQuestion) {
				this._attachQuestionEventListeners(currentQuestion);
			}
		}
	}

	_attachQuestionEventListeners(question) {
		if (!question) return;

		const handlers = {
			"multiple-choice": () => this._attachInputGroupListeners(question, "change", input => this.handleAnswer(input.value)),
			checkbox: () => this._attachCheckboxListeners(question),
			dropdown: () => this._attachDropdownListeners(question),
			"date-part": () => this._attachDropdownListeners(question),
			text: () => this._attachTextInputListeners(question),
			date: () => this._attachTextInputListeners(question),
			textarea: () => this._attachSingleInputListener(question, "input", input => this.handleAnswer(input.value)),
			rating: () => this._attachSingleInputListener(question, "input", input => this.handleAnswer(parseInt(input.value, 10))),
			"payer-search": () => this._attachPayerSearchListeners(question)
		};

		handlers[question.type]?.();
	}

	_attachInputGroupListeners(question, eventType, callback) {
		const inputs = this.questionContainer.querySelectorAll(`input[name="question-${question.id}"]`);
		inputs.forEach(input => input.addEventListener(eventType, () => callback(input)));
	}

	_attachSingleInputListener(question, eventType, callback) {
		const input = this.questionContainer.querySelector(`#question-${question.id}`);
		if (input) input.addEventListener(eventType, () => callback(input));
	}

	_attachCheckboxListeners(question) {
		const checkboxInputs = this.questionContainer.querySelectorAll(`input[name="question-${question.id}"]`);
		const getSelectedValues = () =>
			Array.from(checkboxInputs)
				.filter(cb => cb.checked)
				.map(cb => cb.value);

		checkboxInputs.forEach(input => {
			input.removeEventListener("change", input._changeHandler);
			input._changeHandler = () => this.handleAnswer(getSelectedValues());
			input.addEventListener("change", input._changeHandler);
		});
	}

	_attachDropdownListeners(question) {
		const dropdown = this.questionContainer.querySelector(`#question-${question.id}`);
		if (!dropdown) return;

		dropdown.addEventListener("change", () => {
			this.handleFormAnswer(question.id, dropdown.value);
			this._updateDropdownColor(dropdown);
			this._clearFieldError(question.id, dropdown);
		});
		this._updateDropdownColor(dropdown);
	}

	_attachTextInputListeners(question) {
		const textInput = this.questionContainer.querySelector(`#question-${question.id}`);
		if (!textInput) return;

		const validate = () => {
			const validationResult = this._validateFieldValue(question, textInput.value);
			this._updateFieldValidationState(textInput, question, validationResult);
		};

		this._removeExistingHandlers(textInput, ["input", "blur", "change"]);

		textInput._inputHandler = () => this.handleFormAnswer(question.id, textInput.value);
		textInput._blurHandler = validate;
		textInput._changeHandler = validate;

		["input", "blur", "change"].forEach((event, i) => {
			const handler = [textInput._inputHandler, textInput._blurHandler, textInput._changeHandler][i];
			textInput.addEventListener(event, handler);
		});
	}

	_removeExistingHandlers(element, events) {
		events.forEach(event => element.removeEventListener(event, element[`_${event}Handler`]));
	}

	_attachPayerSearchListeners(question) {
		const searchInput = this.questionContainer.querySelector(`#question-${question.id}`);
		const dropdown = this.questionContainer.querySelector(`#search-dropdown-${question.id}`);

		if (searchInput && dropdown) {
			this._setupPayerSearchBehavior(question, searchInput, dropdown, selectedPayer => {
				this.handleAnswer(selectedPayer);
			});
		}
	}

	_attachPayerSearchFormListeners(question) {
		setTimeout(() => {
			const searchInput = this.questionContainer.querySelector(`#question-${question.id}`);
			const dropdown = this.questionContainer.querySelector(`#search-dropdown-${question.id}`);

			if (searchInput && dropdown) {
				this._setupPayerSearchBehavior(question, searchInput, dropdown, selectedPayer => {
					this.handleFormAnswer(question.id, selectedPayer);
					this.updateNavigation();
				});
			}
		}, 100);
	}

	_setupPayerSearchBehavior(question, searchInput, dropdown, onSelectCallback) {
		let isOpen = false;
		let searchTimeout = null;
		const container = searchInput.closest(".quiz-payer-search-container");

		searchInput.addEventListener("focus", () => {
			if (!isOpen) {
				this._openPayerSearchDropdown(dropdown, container, searchInput);
				isOpen = true;
				this._showInitialPayerList(dropdown, onSelectCallback);
			}
		});

		searchInput.addEventListener("click", () => {
			if (!isOpen) {
				this._openPayerSearchDropdown(dropdown, container, searchInput);
				isOpen = true;
				this._showInitialPayerList(dropdown, onSelectCallback);
			}
		});

		searchInput.addEventListener("input", () => {
			if (!isOpen) {
				this._openPayerSearchDropdown(dropdown, container, searchInput);
				isOpen = true;
			}

			const query = searchInput.value.trim();

			if (searchTimeout) {
				clearTimeout(searchTimeout);
			}

			if (query.length > 0) {
				searchTimeout = setTimeout(() => {
					const currentQuery = searchInput.value.trim();
					this._searchPayers(currentQuery, dropdown, onSelectCallback);
				}, 300);
			} else {
				this._showInitialPayerList(dropdown, onSelectCallback);
			}
		});

		// Handle close button click
		const closeButton = dropdown.querySelector(".quiz-payer-search-close-btn");
		if (closeButton) {
			closeButton.addEventListener("click", e => {
				e.preventDefault();
				e.stopPropagation();
				this._closePayerSearchDropdown(dropdown, container, searchInput);
				isOpen = false;
			});
		}

		// Close dropdown when clicking outside
		document.addEventListener("click", e => {
			if (!container.contains(e.target)) {
				this._closePayerSearchDropdown(dropdown, container, searchInput);
				isOpen = false;
			}
		});
	}

	_showInitialPayerList(dropdown, onSelectCallback) {
		const commonPayers = this.quizData.commonPayers || [];
		const results = commonPayers.map(payer => ({ payer }));
		this._renderSearchResults(results, "", dropdown, onSelectCallback);
	}

	async _searchPayers(query, dropdown, onSelectCallback) {
		const resultsContainer = dropdown.querySelector(".quiz-payer-search-results");
		if (!resultsContainer) return;

		// Show loading state
		resultsContainer.innerHTML = `
			<div class="quiz-payer-search-loading">
				<div class="quiz-payer-search-loading-spinner"></div>
				Searching insurance plans...
			</div>
		`;

		try {
			const apiResults = await this._searchPayersAPI(query);
			if (apiResults && apiResults.length > 0) {
				this._renderSearchResults(apiResults, query, dropdown, onSelectCallback);
				return;
			}
		} catch (error) {
			console.warn("API search failed, falling back to local search:", error);
		}

		try {
			const localResults = this._filterCommonPayers(query);
			this._renderSearchResults(localResults, query, dropdown, onSelectCallback);
		} catch (error) {
			console.error("Payer search error:", error);
			resultsContainer.innerHTML = `<div class="quiz-payer-search-error">Error searching. Please try again.</div>`;
		}
	}

	async _searchPayersAPI(query) {
		const config = this.quizData.config?.apiConfig || {};
		const apiKey = config.stediApiKey;

		if (!apiKey || apiKey.trim() === "") {
			console.warn("Stedi API key not configured or empty, using local search only");
			return null;
		}

		const baseUrl = "https://healthcare.us.stedi.com/2024-04-01/payers/search";
		const params = new URLSearchParams({
			query: query,
			pageSize: "10",
			eligibilityCheck: "SUPPORTED"
		});

		const url = `${baseUrl}?${params}`;

		const response = await fetch(url, {
			method: "GET",
			headers: {
				Authorization: apiKey,
				Accept: "application/json"
			}
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`API request failed: ${response.status} - ${errorText}`);
		}

		const data = await response.json();

		const transformedResults =
			data.items?.map(item => ({
				payer: {
					stediId: item.payer.stediId,
					displayName: item.payer.displayName,
					primaryPayerId: item.payer.primaryPayerId,
					aliases: item.payer.aliases || [],
					score: item.score
				}
			})) || [];

		return transformedResults;
	}

	_filterCommonPayers(query) {
		const commonPayers = this.quizData.commonPayers || [];
		if (!query || query.length === 0) {
			return commonPayers.map(payer => ({ payer }));
		}

		const lowerQuery = query.toLowerCase();
		const filtered = commonPayers.filter(payer => payer.displayName.toLowerCase().includes(lowerQuery) || (payer.aliases && payer.aliases.some(alias => alias.toLowerCase().includes(lowerQuery))));

		return filtered.map(payer => ({ payer }));
	}

	_renderSearchResults(results, query, dropdown, onSelectCallback) {
		const resultsContainer = dropdown.querySelector(".quiz-payer-search-results");
		if (!resultsContainer) return;

		if (results.length === 0) {
			resultsContainer.innerHTML = `<div class="quiz-payer-search-no-results">No insurance plans found. Try a different search term.</div>`;
		} else {
			const resultsHTML = results
				.map((item, index) => {
					const payer = item.payer;
					const highlightedName = this._highlightSearchTerm(payer.displayName, query);
					const isApiResult = payer.score !== undefined;

					return `
					<div class="quiz-payer-search-item" data-index="${index}">
                        <div class="quiz-payer-search-item-name">
							${highlightedName}
						</div>
						<div class="quiz-payer-search-item-details">
							<span class="quiz-payer-search-item-id">${payer.stediId}</span>
                            ${payer.aliases?.length > 0 ? `• ${payer.aliases.slice(0, 2).join(", ")}` : ""}
							${isApiResult && payer.score ? `• Score: ${payer.score.toFixed(1)}` : ""}
						</div>
					</div>
				`;
				})
				.join("");

			resultsContainer.innerHTML = resultsHTML;

			const resultItems = resultsContainer.querySelectorAll(".quiz-payer-search-item");
			const container = dropdown.closest(".quiz-payer-search-container");
			const searchInput = container.querySelector(".quiz-payer-search-input");

			resultItems.forEach((item, index) => {
				item.addEventListener("click", () => {
					this._selectPayer(results[index].payer, searchInput, dropdown, onSelectCallback);
				});
			});
		}

		dropdown.classList.add("visible");
		dropdown.style.display = "block";
	}

	_selectPayer(payer, searchInput, dropdown, onSelectCallback) {
		// Update the search input with the selected payer name
		searchInput.value = payer.displayName;
		searchInput.classList.add("quiz-input-valid");

		const container = searchInput.closest(".quiz-payer-search-container");
		this._closePayerSearchDropdown(dropdown, container, searchInput);

		onSelectCallback(payer.primaryPayerId);
	}

	_openPayerSearchDropdown(dropdown, container, searchInput) {
		dropdown.classList.add("visible");
		dropdown.style.display = "block";
		container.classList.add("open");

		const isMobile = window.innerWidth <= 768;
		if (isMobile) {
			setTimeout(() => {
				const inputRect = searchInput.getBoundingClientRect();
				const offset = 20;
				const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
				const targetScrollY = currentScrollY + inputRect.top - offset;

				window.scrollTo({
					top: Math.max(0, targetScrollY),
					behavior: "smooth"
				});
			}, 100);
		}
	}

	_closePayerSearchDropdown(dropdown, container, searchInput) {
		dropdown.classList.remove("visible");
		dropdown.style.display = "none";
		container.classList.remove("open");
	}

	_highlightSearchTerm(text, searchTerm) {
		if (!searchTerm || !text) return text;
		const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
		return text.replace(regex, '<span class="quiz-payer-search-highlight">$1</span>');
	}

	_resolvePayerDisplayName(primaryPayerId) {
		const commonPayers = this.quizData.commonPayers || [];
		const matchingPayer = commonPayers.find(payer => payer.primaryPayerId === primaryPayerId);
		return matchingPayer?.displayName || null;
	}

	_attachFormQuestionListener(question) {
		const formHandlers = {
			dropdown: () => this._attachDropdownListeners(question),
			"date-part": () => this._attachDropdownListeners(question),
			text: () => this._attachTextInputListeners(question),
			date: () => this._attachTextInputListeners(question),
			checkbox: () => this._attachFormCheckboxListeners(question),
			"payer-search": () => this._attachPayerSearchFormListeners(question)
		};

		formHandlers[question.type]?.();
	}

	_attachFormCheckboxListeners(question) {
		const checkboxInputs = this.questionContainer.querySelectorAll(`input[name="question-${question.id}"]`);
		const getFormValue = input =>
			question.options.length === 1
				? input.checked
					? [input.value]
					: []
				: Array.from(checkboxInputs)
						.filter(cb => cb.checked)
						.map(cb => cb.value);

		checkboxInputs.forEach(input => {
			input.onclick = () => this.handleFormAnswer(question.id, getFormValue(input));
		});
	}

	_validateFormStep(step) {
		const validationErrors = step.questions.map(question => this._validateQuestionInForm(question)).filter(error => error);

		if (validationErrors.length > 0) {
			this._displayValidationErrors(validationErrors);
			return false;
		}
		return true;
	}

	_validateQuestionInForm(question) {
		const response = this.responses.find(r => r.questionId === question.id);
		const currentValue = response?.answer;

		if (question.required && this._isEmptyValue(currentValue, question.type)) {
			return {
				questionId: question.id,
				message: this.quizData.ui?.errorMessages?.validationRequired || "This field is required"
			};
		}

		if (currentValue && question.type !== "payer-search") {
			const validationResult = this._validateFieldValue(question, currentValue);
			if (!validationResult.isValid) {
				return {
					questionId: question.id,
					message: validationResult.errorMessage
				};
			}
		}

		return null;
	}

	_isEmptyValue(value, questionType) {
		if (!value) return true;
		if (questionType === "checkbox") return !Array.isArray(value) || value.length === 0;
		if (typeof value === "string") return value.trim() === "";
		return false;
	}

	_displayValidationErrors(validationErrors) {
		let firstInvalidField = null;

		validationErrors.forEach((error, index) => {
			const { input, errorEl } = this._getValidationElements(error.questionId);

			if (input) {
				input.classList.add("quiz-input-error");
				input.classList.remove("quiz-input-valid");
				if (index === 0) firstInvalidField = input;
			}

			if (errorEl) {
				errorEl.textContent = error.message;
				errorEl.classList.remove("quiz-error-hidden");
				errorEl.classList.add("quiz-error-visible");
			}
		});

		if (firstInvalidField) {
			this._scrollToInvalidField(firstInvalidField);
		}
	}

	_getValidationElements(questionId) {
		return {
			input: this.questionContainer.querySelector(`#question-${questionId}`),
			errorEl: this.questionContainer.querySelector(`#error-${questionId}`)
		};
	}

	_validateFieldValue(question, value) {
		const errorMessages = this.quizData.ui?.errorMessages || {};

		if (question.type === "payer-search") {
			return this._validateRequired(question, value) ? { isValid: true, errorMessage: null } : { isValid: false, errorMessage: errorMessages.validationInsurance || "Please select an insurance plan" };
		}

		if (question.required && !this._hasValue(value)) {
			return { isValid: false, errorMessage: errorMessages.validationRequired || "This field is required" };
		}

		if (!this._hasValue(value)) {
			return { isValid: true, errorMessage: null };
		}

		return this._validateFieldFormat(question, value.trim(), errorMessages);
	}

	_hasValue(value) {
		return value && (typeof value !== "string" || value.trim() !== "");
	}

	_validateRequired(question, value) {
		return !question.required || this._hasValue(value);
	}

	_validateFieldFormat(question, trimmedValue, errorMessages) {
		const patterns = this.quizData.validation?.patterns || {};
		const validations = {
			q4: { pattern: patterns.memberId || "^.{6,20}$", message: errorMessages.validationMemberId || "Minimum 6 characters" },
			q4_group: { pattern: patterns.groupNumber || "^$|^.{5,15}$", message: errorMessages.validationGroupNumber || "Minimum 5 characters" },
			q7: { pattern: patterns.name || "^[A-Za-z\\s]{1,100}$", message: errorMessages.validationName || "Use only A–Z letters and spaces" },
			q8: { pattern: patterns.name || "^[A-Za-z\\s]{1,100}$", message: errorMessages.validationName || "Use only A–Z letters and spaces" },
			q9: { pattern: patterns.email || "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$", message: errorMessages.validationEmail || "Enter valid email" },
			q10: { custom: () => this._validatePhoneNumber(trimmedValue), message: errorMessages.validationPhone || "Enter valid phone" }
		};

		const validation = validations[question.id];
		if (validation) {
			const isValid = validation.custom ? validation.custom() : new RegExp(validation.pattern).test(trimmedValue);
			return isValid ? { isValid: true, errorMessage: null } : { isValid: false, errorMessage: validation.message };
		}

		if (question.validation?.pattern) {
			const isValid = new RegExp(question.validation.pattern).test(trimmedValue);
			return isValid ? { isValid: true, errorMessage: null } : { isValid: false, errorMessage: question.validation.message || "Invalid format" };
		}

		return { isValid: true, errorMessage: null };
	}

	_validatePhoneNumber(phone) {
		const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, "");

		const patterns = [
			/^[0-9]{10}$/,
			/^1[0-9]{10}$/,
			/^\+1[0-9]{10}$/,
			/^\+[1-9][0-9]{7,14}$/,
			/^\+[0-9]{8,15}$/,
			/^[0-9]{3}-[0-9]{3}-[0-9]{4}$/,
			/^\([0-9]{3}\)\s[0-9]{3}-[0-9]{4}$/,
			/^[0-9]{3}\.[0-9]{3}\.[0-9]{4}$/,
			/^[0-9]{3}\s[0-9]{3}\s[0-9]{4}$/,
			/^\+1\s[0-9]{3}-[0-9]{3}-[0-9]{4}$/,
			/^1-[0-9]{3}-[0-9]{3}-[0-9]{4}$/
		];

		return patterns.some(pattern => pattern.test(cleanPhone)) || patterns.some(pattern => pattern.test(phone));
	}

	_updateFieldValidationState(input, question, validationResult) {
		const errorEl = this.questionContainer.querySelector(`#error-${question.id}`);
		const isValid = validationResult.isValid;

		input.classList.toggle("quiz-input-error", !isValid);
		input.classList.toggle("quiz-input-valid", isValid);

		if (errorEl) {
			if (isValid) {
				errorEl.classList.add("quiz-error-hidden");
				errorEl.classList.remove("quiz-error-visible");
			} else if (validationResult.errorMessage) {
				errorEl.textContent = validationResult.errorMessage;
				errorEl.classList.remove("quiz-error-hidden");
				errorEl.classList.add("quiz-error-visible");
			}
		}

		return isValid;
	}

	_clearFieldError(questionId, input) {
		if (input.value && input.value !== "") {
			const errorEl = this.questionContainer.querySelector(`#error-${questionId}`);
			if (errorEl) {
				input.classList.remove("quiz-input-error");
				input.classList.add("quiz-input-valid");
				errorEl.classList.add("quiz-error-hidden");
				errorEl.classList.remove("quiz-error-visible");
			}
		}
	}

	_updateDropdownColor(dropdown) {
		const hasSelection = dropdown.value && dropdown.value !== dropdown.options[0].value;
		dropdown.style.color = hasSelection ? "var(--quiz-text-primary)" : "#B0B0B0";
		dropdown.classList.toggle("quiz-dropdown-selected", hasSelection);
	}

	_scrollToInvalidField(fieldElement) {
		if (!fieldElement) return;

		const isMobile = window.innerWidth <= 768;
		if (isMobile) {
			const fieldRect = fieldElement.getBoundingClientRect();
			const offset = 100;
			const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
			const targetScrollY = currentScrollY + fieldRect.top - offset;

			window.scrollTo({
				top: Math.max(0, targetScrollY),
				behavior: "smooth"
			});

			setTimeout(() => {
				if (fieldElement.focus) {
					fieldElement.focus();
				}
			}, 300);
		}
	}

	_showSchedulingResults(result) {
		const schedulingData = result?.schedulingData;

		if (result?.success && schedulingData?.scheduleLink) {
			// Success - show scheduling success page when we have a schedule link
			const successHTML = this._generateSchedulingSuccessHTML(schedulingData);
			this.questionContainer.innerHTML = successHTML;
		} else {
			// Error - show scheduling error page
			const errorMessage = schedulingData?.message || result?.error || "Unknown scheduling error";
			this._showSchedulingError(errorMessage, schedulingData);
		}
	}

	_showSchedulingError(errorMessage, schedulingData = null) {
		const errorHTML = this._generateSchedulingErrorHTML(errorMessage, schedulingData);
		this.questionContainer.innerHTML = errorHTML;
	}

	_generateSchedulingSuccessHTML(schedulingData) {
		// Fallback for ES5 compatibility - using regular variables and string concatenation
		var scheduleLink = schedulingData && schedulingData.scheduleLink ? schedulingData.scheduleLink : "#";
		var masterId = schedulingData && schedulingData.masterId ? schedulingData.masterId : "";
		var referenceHtml = masterId ? '<p class="quiz-text-xs" style="margin-top: 16px; color: #666; font-family: monospace;">Reference ID: ' + masterId + "</p>" : "";

		var html = "";
		html += '<div class="quiz-results-container">';
		html += '<div class="quiz-results-header">';
		html += '<h2 class="quiz-results-title">🎉 Appointment Request Submitted!</h2>';
		html += '<p class="quiz-results-subtitle">Great news! Your request has been successfully processed and your dietitian appointment is ready to be scheduled.</p>';
		html += "</div>";
		html += '<div class="quiz-action-section">';
		html += '<div class="quiz-action-content">';
		html += '<div class="quiz-action-header">';
		html += '<h3 class="quiz-action-title">Next: Choose Your Appointment Time</h3>';
		html += "</div>";
		html += '<div class="quiz-action-details">';
		html += '<div class="quiz-action-info">';
		html += '<div class="quiz-action-info-text">';
		html += "Click below to access your personalized scheduling portal where you can select from available appointment times that work best for your schedule.";
		html += "</div>";
		html += "</div>";
		html += '<a href="' + scheduleLink + '" target="_blank" class="quiz-booking-button">';
		html += '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">';
		html +=
			'<path d="M6.66666 2.5V5.83333M13.3333 2.5V5.83333M2.5 9.16667H17.5M4.16666 3.33333H15.8333C16.7538 3.33333 17.5 4.07952 17.5 5V16.6667C17.5 17.5871 16.7538 18.3333 15.8333 18.3333H4.16666C3.24619 18.3333 2.5 17.5871 2.5 16.6667V5C2.5 4.07952 3.24619 3.33333 4.16666 3.33333Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
		html += "</svg>";
		html += "Schedule Your Appointment";
		html += "</a>";
		html += referenceHtml;
		html += "</div>";
		html += "</div>";
		html += "</div>";
		html += '<div class="quiz-coverage-card">';
		html += '<div class="quiz-coverage-card-title">What to Expect</div>';
		html += '<div class="quiz-coverage-benefits">';
		html += '<div class="quiz-coverage-benefit">';
		html += '<div class="quiz-coverage-benefit-icon">';
		html += '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">';
		html += '<path d="M12 8V12L15 15" stroke="#306E51" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
		html += '<circle cx="12" cy="12" r="9" stroke="#306E51" stroke-width="2"/>';
		html += "</svg>";
		html += "</div>";
		html += '<div class="quiz-coverage-benefit-text">';
		html += "<strong>30-60 Minutes</strong><br/>";
		html += "Comprehensive nutrition consultation tailored to your specific health goals";
		html += "</div>";
		html += "</div>";
		html += '<div class="quiz-coverage-benefit">';
		html += '<div class="quiz-coverage-benefit-icon">';
		html += '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">';
		html +=
			'<path d="M17 3V0M12 3V0M7 3V0M3 7H21M5 21H19C20.1046 21 21 20.1046 21 19V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V19C3 20.1046 3.89543 21 5 21Z" stroke="#306E51" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
		html += "</svg>";
		html += "</div>";
		html += '<div class="quiz-coverage-benefit-text">';
		html += "<strong>Flexible Scheduling</strong><br/>";
		html += "Choose from morning, afternoon, or evening slots that fit your lifestyle";
		html += "</div>";
		html += "</div>";
		html += '<div class="quiz-coverage-benefit">';
		html += '<div class="quiz-coverage-benefit-icon">';
		html += '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">';
		html +=
			'<path d="M9 12L11 14L22 3M21 12V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3.89543 3 5 3 5 3H16" stroke="#306E51" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
		html += "</svg>";
		html += "</div>";
		html += '<div class="quiz-coverage-benefit-text">';
		html += "<strong>Personalized Plan</strong><br/>";
		html += "Receive a custom nutrition plan based on your quiz responses and health profile";
		html += "</div>";
		html += "</div>";
		html += '<div class="quiz-coverage-benefit">';
		html += '<div class="quiz-coverage-benefit-icon">';
		html += '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">';
		html +=
			'<path d="M18.3333 14.1667C18.3333 15.0871 17.5871 15.8333 16.6667 15.8333H5.83333L1.66666 20V3.33333C1.66666 2.41286 2.41285 1.66667 3.33333 1.66667H16.6667C17.5871 1.66667 18.3333 2.41286 18.3333 3.33333V14.1667Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
		html += "</svg>";
		html += "</div>";
		html += '<div class="quiz-coverage-benefit-text">';
		html += "<strong>Ongoing Support</strong><br/>";
		html += "Follow-up resources and support to help you achieve your health goals";
		html += "</div>";
		html += "</div>";
		html += "</div>";
		html += "</div>";
		html += '<div class="quiz-action-section" style="background-color: #f8f9fa;">';
		html += '<div class="quiz-action-content">';
		html += '<div class="quiz-action-header">';
		html += '<h3 class="quiz-action-title">Need Assistance?</h3>';
		html += "</div>";
		html += '<div class="quiz-action-details">';
		html += '<div class="quiz-action-info">';
		html += '<div class="quiz-action-info-text">';
		html += "Our support team is here to help if you have any questions about scheduling or preparing for your appointment.";
		html += "</div>";
		html += "</div>";
		html += '<div class="quiz-action-feature">';
		html += '<svg class="quiz-action-feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">';
		html += '<path d="M18.3333 5.83333L10 11.6667L1.66666 5.83333" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
		html +=
			'<path d="M1.66666 5.83333H18.3333V15C18.3333 15.442 18.1577 15.866 17.8452 16.1785C17.5327 16.491 17.1087 16.6667 16.6667 16.6667H3.33333C2.89131 16.6667 2.46738 16.491 2.15482 16.1785C1.84226 15.866 1.66666 15.442 1.66666 15V5.83333Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
		html += "</svg>";
		html += '<div class="quiz-action-feature-text">Email: support@curalife.com</div>';
		html += "</div>";
		html += '<div class="quiz-action-feature">';
		html += '<svg class="quiz-action-feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">';
		html +=
			'<path d="M18.3081 14.2233C17.1569 14.2233 16.0346 14.0397 14.9845 13.6971C14.6449 13.5878 14.2705 13.6971 14.0579 13.9427L12.8372 15.6772C10.3023 14.4477 8.55814 12.7138 7.32326 10.1581L9.10465 8.89535C9.34884 8.68372 9.45814 8.30233 9.34884 7.96279C9.00581 6.91628 8.82209 5.79186 8.82209 4.64535C8.82209 4.28953 8.53256 4 8.17674 4H4.64535C4.28953 4 4 4.28953 4 4.64535C4 12.1715 10.1831 18.3953 17.6628 18.3953C18.0186 18.3953 18.3081 18.1058 18.3081 17.75V14.2233Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
		html += "</svg>";
		html += '<div class="quiz-action-feature-text">Phone: 1-800-CURALIFE</div>';
		html += "</div>";
		html += "</div>";
		html += "</div>";
		html += "</div>";
		html += "</div>";
		html += "</div>";
		html += "</div>";
		html += "</div>";
		html += "</div>";
		html += "</div>";
		html += "</div>";
		html += '<div class="quiz-action-section" style="background-color: #f8f9fa;">';
		html += '<div class="quiz-action-content">';
		html += '<div class="quiz-action-header">';
		html += '<h3 class="quiz-action-title">Need Assistance?</h3>';
		html += "</div>";
		html += '<div class="quiz-action-details">';
		html += '<div class="quiz-action-info">';
		html += '<div class="quiz-action-info-text">';
		html += "Our support team is here to help if you have any questions about scheduling or preparing for your appointment.";
		html += "</div>";
		html += "</div>";
		html += '<div class="quiz-action-feature">';
		html += '<svg class="quiz-action-feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">';
		html += '<path d="M18.3333 5.83333L10 11.6667L1.66666 5.83333" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
		html +=
			'<path d="M1.66666 5.83333H18.3333V15C18.3333 15.442 18.1577 15.866 17.8452 16.1785C17.5327 16.491 17.1087 16.6667 16.6667 16.6667H3.33333C2.89131 16.6667 2.46738 16.491 2.15482 16.1785C1.84226 15.866 1.66666 15.442 1.66666 15V5.83333Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
		html += "</svg>";
		html += '<div class="quiz-action-feature-text">Email: support@curalife.com</div>';
		html += "</div>";
		html += '<div class="quiz-action-feature">';
		html += '<svg class="quiz-action-feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">';
		html +=
			'<path d="M18.3081 14.2233C17.1569 14.2233 16.0346 14.0397 14.9845 13.6971C14.6449 13.5878 14.2705 13.6971 14.0579 13.9427L12.8372 15.6772C10.3023 14.4477 8.55814 12.7138 7.32326 10.1581L9.10465 8.89535C9.34884 8.68372 9.45814 8.30233 9.34884 7.96279C9.00581 6.91628 8.82209 5.79186 8.82209 4.64535C8.82209 4.28953 8.53256 4 8.17674 4H4.64535C4.28953 4 4 4.28953 4 4.64535C4 12.1715 10.1831 18.3953 17.6628 18.3953C18.0186 18.3953 18.3081 18.1058 18.3081 17.75V14.2233Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
		html += "</svg>";
		html += '<div class="quiz-action-feature-text">Phone: 1-800-CURALIFE</div>';
		html += "</div>";

		return html; // Proper return statement
	}

	_generateSchedulingErrorHTML(errorMessage, schedulingData = null) {
		const errorStatus = schedulingData?.status || "ERROR";
		const isValidationError = errorStatus === "VALIDATION_ERROR";
		const isDuplicateError = errorStatus === "DUPLICATE_ERROR";
		const isAuthError = errorStatus === "AUTH_ERROR";
		const isServerError = errorStatus === "SERVER_ERROR";
		const isConfigError = errorStatus === "CONFIG_ERROR";

		if (isDuplicateError) {
			return `
				<div class="quiz-results-container">
					<div class="quiz-results-header">
						<h2 class="quiz-results-title">⚠️ Appointment Already Exists</h2>
						<p class="quiz-results-subtitle">Good news! You already have an appointment scheduled with our dietitian.</p>
					</div>

					<div class="quiz-coverage-card">
						<div class="quiz-coverage-card-title">What's Next?</div>
						<div class="quiz-coverage-benefits">
							<div class="quiz-coverage-benefit">
								<div class="quiz-coverage-benefit-icon">
									<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path d="M18 5.83333L10 11.6667L2 5.83333" stroke="#306E51" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
										<path d="M2 5.83333H18V15C18 15.442 17.824 15.866 17.512 16.1785C17.199 16.491 16.775 16.6667 16.333 16.6667H3.667C3.225 16.6667 2.801 16.491 2.488 16.1785C2.176 15.866 2 15.442 2 15V5.83333Z" stroke="#306E51" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
									</svg>
								</div>
								<div class="quiz-coverage-benefit-text">
									<strong>Check Your Email</strong><br/>
									Your appointment confirmation and scheduling details have been sent to your email address
								</div>
							</div>
							<div class="quiz-coverage-benefit">
								<div class="quiz-coverage-benefit-icon">
									<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path d="M8 2V6M16 2V6M3.5 10H20.5M5 4H19C20.105 4 21 4.895 21 6V20C21 21.105 20.105 22 19 22H5C3.895 22 3 21.105 3 20V6C3 4.895 3.895 4 5 4Z" stroke="#306E51" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
									</svg>
								</div>
								<div class="quiz-coverage-benefit-text">
									<strong>Reschedule if Needed</strong><br/>
									If you need to change your appointment time, use the link in your confirmation email
								</div>
							</div>
						</div>
					</div>

					<div class="quiz-action-section" style="background-color: #f8f9fa;">
						<div class="quiz-action-content">
							<div class="quiz-action-header">
								<h3 class="quiz-action-title">Need Help?</h3>
							</div>
							<div class="quiz-action-details">
								<div class="quiz-action-feature">
									<svg class="quiz-action-feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path d="M18.3333 5.83333L10 11.6667L1.66666 5.83333" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
										<path d="M1.66666 5.83333H18.3333V15C18.3333 15.442 18.1577 15.866 17.8452 16.1785C17.5327 16.491 17.1087 16.6667 16.6667 16.6667H3.33333C2.89131 16.6667 2.46738 16.491 2.15482 16.1785C1.84226 15.866 1.66666 15.442 1.66666 15V5.83333Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
									</svg>
									<div class="quiz-action-feature-text">Email: support@curalife.com</div>
								</div>
								<div class="quiz-action-feature">
									<svg class="quiz-action-feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path d="M18.3081 14.2233C17.1569 14.2233 16.0346 14.0397 14.9845 13.6971C14.6449 13.5878 14.2705 13.6971 14.0579 13.9427L12.8372 15.6772C10.3023 14.4477 8.55814 12.7138 7.32326 10.1581L9.10465 8.89535C9.34884 8.68372 9.45814 8.30233 9.34884 7.96279C9.00581 6.91628 8.82209 5.79186 8.82209 4.64535C8.82209 4.28953 8.53256 4 8.17674 4H4.64535C4.28953 4 4 4.28953 4 4.64535C4 12.1715 10.1831 18.3953 17.6628 18.3953C18.0186 18.3953 18.3081 18.1058 18.3081 17.75V14.2233Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
									</svg>
									<div class="quiz-action-feature-text">Phone: 1-800-CURALIFE</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			`;
		}

		if (isValidationError) {
			return `
				<div class="quiz-results-container">
					<div class="quiz-results-header">
						<h2 class="quiz-results-title">❌ Information Needs Review</h2>
						<p class="quiz-results-subtitle">${errorMessage}</p>
					</div>

					<div class="quiz-coverage-card">
						<div class="quiz-coverage-card-title">Common Issues & Solutions</div>
						<div class="quiz-coverage-benefits">
							<div class="quiz-coverage-benefit">
								<div class="quiz-coverage-benefit-icon">📞</div>
								<div class="quiz-coverage-benefit-text">
									<strong>Phone Number:</strong> Use 10-digit format (e.g., 5551234567)
								</div>
							</div>
							<div class="quiz-coverage-benefit">
								<div class="quiz-coverage-benefit-icon">📅</div>
								<div class="quiz-coverage-benefit-text">
									<strong>Date of Birth:</strong> Ensure month/day/year are correct
								</div>
							</div>
							<div class="quiz-coverage-benefit">
								<div class="quiz-coverage-benefit-icon">🏠</div>
								<div class="quiz-coverage-benefit-text">
									<strong>Address:</strong> Include street number and name
								</div>
							</div>
							<div class="quiz-coverage-benefit">
								<div class="quiz-coverage-benefit-icon">📍</div>
								<div class="quiz-coverage-benefit-text">
									<strong>ZIP Code:</strong> Use 5-digit format (e.g., 12345)
								</div>
							</div>
						</div>
					</div>

					<div class="quiz-action-section">
						<div class="quiz-action-content">
							<div class="quiz-action-header">
								<h3 class="quiz-action-title">Try Again</h3>
							</div>
							<div class="quiz-action-details">
								<div class="quiz-action-info">
									<div class="quiz-action-info-text">
										Go back and double-check your information, then submit again.
									</div>
								</div>
								<button onclick="window.location.reload()" class="quiz-booking-button">
									<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path d="M1.66666 10H5L3.33333 8.33333M3.33333 8.33333L1.66666 6.66667M3.33333 8.33333C4.09938 6.54467 5.40818 5.06585 7.07084 4.10926C8.7335 3.15266 10.6668 2.76579 12.5729 3.00632C14.479 3.24685 16.2671 4.10239 17.6527 5.43174C19.0382 6.76109 19.9501 8.50173 20.2612 10.3889C20.5723 12.2761 20.2661 14.2137 19.3884 15.9271C18.5107 17.6405 17.1075 19.0471 15.3804 19.9429C13.6533 20.8388 11.6875 21.1795 9.76666 20.9204C7.84586 20.6613 6.06666 19.8167 4.66666 18.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
									</svg>
									Try Again
								</button>
							</div>
						</div>
					</div>

					<div class="quiz-action-section" style="background-color: #f8f9fa;">
						<div class="quiz-action-content">
							<div class="quiz-action-header">
								<h3 class="quiz-action-title">Still Having Issues?</h3>
							</div>
							<div class="quiz-action-details">
								<div class="quiz-action-feature">
									<svg class="quiz-action-feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path d="M18.3333 5.83333L10 11.6667L1.66666 5.83333" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
										<path d="M1.66666 5.83333H18.3333V15C18.3333 15.442 18.1577 15.866 17.8452 16.1785C17.5327 16.491 17.1087 16.6667 16.6667 16.6667H3.33333C2.89131 16.6667 2.46738 16.491 2.15482 16.1785C1.84226 15.866 1.66666 15.442 1.66666 15V5.83333Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
									</svg>
									<div class="quiz-action-feature-text">Email: support@curalife.com</div>
								</div>
								<div class="quiz-action-feature">
									<svg class="quiz-action-feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path d="M18.3081 14.2233C17.1569 14.2233 16.0346 14.0397 14.9845 13.6971C14.6449 13.5878 14.2705 13.6971 14.0579 13.9427L12.8372 15.6772C10.3023 14.4477 8.55814 12.7138 7.32326 10.1581L9.10465 8.89535C9.34884 8.68372 9.45814 8.30233 9.34884 7.96279C9.00581 6.91628 8.82209 5.79186 8.82209 4.64535C8.82209 4.28953 8.53256 4 8.17674 4H4.64535C4.28953 4 4 4.28953 4 4.64535C4 12.1715 10.1831 18.3953 17.6628 18.3953C18.0186 18.3953 18.3081 18.1058 18.3081 17.75V14.2233Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
									</svg>
									<div class="quiz-action-feature-text">Phone: 1-800-CURALIFE</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			`;
		}

		// Service/Auth errors or general errors
		const isServiceError = isAuthError || isConfigError;
		const errorTitle = isServiceError ? "🔧 Service Temporarily Unavailable" : "⚠️ Scheduling Assistance Needed";
		const errorDescription = isServiceError ? "We're experiencing a temporary issue with our scheduling system." : "We encountered an unexpected issue, but we're here to help.";

		return `
			<div class="quiz-results-container">
				<div class="quiz-results-header">
					<h2 class="quiz-results-title">${errorTitle}</h2>
					<p class="quiz-results-subtitle">${errorDescription}</p>
				</div>

				<div class="quiz-action-section">
					<div class="quiz-action-content">
						<div class="quiz-action-header">
							<h3 class="quiz-action-title">We've Got You Covered</h3>
						</div>
						<div class="quiz-action-details">
							<div class="quiz-action-info">
								<div class="quiz-action-info-text">
									Your request has been recorded and our team will personally contact you within <strong>24 hours</strong> to schedule your appointment.
								</div>
							</div>
						</div>
					</div>
				</div>

				<div class="quiz-coverage-card">
					<div class="quiz-coverage-card-title">What Happens Next</div>
					<div class="quiz-coverage-benefits">
						<div class="quiz-coverage-benefit">
							<div class="quiz-coverage-benefit-icon">
								<div style="background: #306e51; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px;">1</div>
							</div>
							<div class="quiz-coverage-benefit-text">
								<strong>Within 4 Hours:</strong> You'll receive a confirmation email with your request details
							</div>
						</div>
						<div class="quiz-coverage-benefit">
							<div class="quiz-coverage-benefit-icon">
								<div style="background: #306e51; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px;">2</div>
							</div>
							<div class="quiz-coverage-benefit-text">
								<strong>Within 24 Hours:</strong> A team member will call to schedule your appointment
							</div>
						</div>
						<div class="quiz-coverage-benefit">
							<div class="quiz-coverage-benefit-icon">
								<div style="background: #306e51; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px;">3</div>
							</div>
							<div class="quiz-coverage-benefit-text">
								<strong>Your Appointment:</strong> Meet with your registered dietitian at the scheduled time
							</div>
						</div>
					</div>
				</div>

				<div class="quiz-action-section" style="background-color: #f8f9fa;">
					<div class="quiz-action-content">
						<div class="quiz-action-header">
							<h3 class="quiz-action-title">Questions? We're Here to Help</h3>
						</div>
						<div class="quiz-action-details">
							<div class="quiz-action-info">
								<div class="quiz-action-info-text">
									Our support team is available Monday-Friday, 9 AM - 6 PM EST
								</div>
							</div>
							<div class="quiz-action-feature">
								<svg class="quiz-action-feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M18.3333 5.83333L10 11.6667L1.66666 5.83333" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
									<path d="M1.66666 5.83333H18.3333V15C18.3333 15.442 18.1577 15.866 17.8452 16.1785C17.5327 16.491 17.1087 16.6667 16.6667 16.6667H3.33333C2.89131 16.6667 2.46738 16.491 2.15482 16.1785C1.84226 15.866 1.66666 15.442 1.66666 15V5.83333Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<div class="quiz-action-feature-text">Email: support@curalife.com</div>
							</div>
							<div class="quiz-action-feature">
								<svg class="quiz-action-feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M18.3081 14.2233C17.1569 14.2233 16.0346 14.0397 14.9845 13.6971C14.6449 13.5878 14.2705 13.6971 14.0579 13.9427L12.8372 15.6772C10.3023 14.4477 8.55814 12.7138 7.32326 10.1581L9.10465 8.89535C9.34884 8.68372 9.45814 8.30233 9.34884 7.96279C9.00581 6.91628 8.82209 5.79186 8.82209 4.64535C8.82209 4.28953 8.53256 4 8.17674 4H4.64535C4.28953 4 4 4.28953 4 4.64535C4 12.1715 10.1831 18.3953 17.6628 18.3953C18.0186 18.3953 18.3081 18.1058 18.3081 17.75V14.2233Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<div class="quiz-action-feature-text">Phone: 1-800-CURALIFE</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		`;
	}

	showError(title, message) {
		this._stopLoadingMessages();
		this._toggleElement(this.questions, false);
		this._toggleElement(this.error, true);

		const errorTitle = this.error.querySelector("h3");
		const errorMessage = this.error.querySelector("p");

		if (errorTitle) errorTitle.textContent = title;
		if (errorMessage) errorMessage.textContent = message;
	}

	_processWebhookResult(result) {
		console.log("Processing webhook result:", {
			result,
			hasSuccess: "success" in result,
			hasBody: "body" in result,
			hasEligibilityData: result?.eligibilityData || result?.body?.eligibilityData,
			hasEligibility: result?.eligibility,
			resultKeys: Object.keys(result || {}),
			bodyKeys: result?.body ? Object.keys(result.body) : "no body"
		});

		// Handle new workflow orchestrator format with eligibility, insurancePlan, userCreation
		if (result?.eligibility && typeof result.eligibility === "object") {
			console.log("Processing new workflow orchestrator format");
			const eligibilityResult = result.eligibility;

			if (eligibilityResult?.success === true && eligibilityResult.eligibilityData) {
				const eligibilityData = eligibilityResult.eligibilityData;
				console.log("Extracted eligibility data from orchestrator result:", eligibilityData);

				// Handle generic ERROR status first
				if (eligibilityData.eligibilityStatus === "ERROR") {
					const errorMessage =
						eligibilityData.userMessage || eligibilityData.error?.message || eligibilityData.error || "There was an error checking your eligibility. Please contact customer support.";
					console.log("Processing generic ERROR status with message:", errorMessage);
					return this._createErrorEligibilityData(errorMessage);
				}

				// Handle AAA_ERROR status from workflow
				if (eligibilityData.eligibilityStatus === "AAA_ERROR") {
					// Try multiple ways to extract the error code
					const errorCode = eligibilityData.error?.code || eligibilityData.aaaErrorCode || eligibilityData.error?.allErrors?.[0]?.code || "Unknown";

					console.log("Processing AAA_ERROR with code:", errorCode, "from eligibilityData:", eligibilityData);
					return this._createStediErrorEligibilityData(errorCode, eligibilityData.userMessage);
				}

				// Handle STEDI_ERROR status from workflow
				if (eligibilityData.eligibilityStatus === "STEDI_ERROR") {
					// Extract the Stedi error code
					const errorCode = eligibilityData.error?.code || eligibilityData.stediErrorCode || "Unknown";

					console.log("Processing STEDI_ERROR with code:", errorCode, "from eligibilityData:", eligibilityData);
					return this._createStediErrorEligibilityData(errorCode, eligibilityData.userMessage);
				}

				return eligibilityData;
			}
		}

		// Handle nested response format (like from Google Cloud Function)
		if (result?.body && typeof result.body === "object") {
			console.log("Processing nested response format with body");
			const bodyResult = result.body;

			if (bodyResult?.success === true && bodyResult.eligibilityData) {
				const eligibilityData = bodyResult.eligibilityData;

				// Handle generic ERROR status first
				if (eligibilityData.eligibilityStatus === "ERROR") {
					const errorMessage =
						eligibilityData.userMessage || eligibilityData.error?.message || eligibilityData.error || "There was an error checking your eligibility. Please contact customer support.";
					console.log("Processing generic ERROR status with message:", errorMessage);
					return this._createErrorEligibilityData(errorMessage);
				}

				// Handle AAA_ERROR status from workflow
				if (eligibilityData.eligibilityStatus === "AAA_ERROR") {
					// Try multiple ways to extract the error code
					const errorCode = eligibilityData.error?.code || eligibilityData.aaaErrorCode || eligibilityData.error?.allErrors?.[0]?.code || "Unknown";

					console.log("Processing AAA_ERROR with code:", errorCode, "from eligibilityData:", eligibilityData);
					return this._createStediErrorEligibilityData(errorCode, eligibilityData.userMessage);
				}

				// Handle STEDI_ERROR status from workflow
				if (eligibilityData.eligibilityStatus === "STEDI_ERROR") {
					// Extract the Stedi error code
					const errorCode = eligibilityData.error?.code || eligibilityData.stediErrorCode || "Unknown";

					console.log("Processing STEDI_ERROR with code:", errorCode, "from eligibilityData:", eligibilityData);
					return this._createStediErrorEligibilityData(errorCode, eligibilityData.userMessage);
				}

				return eligibilityData;
			}
		}

		// Handle direct response format
		if (result?.success === true && result.eligibilityData) {
			// Check if this is an AAA error from the workflow response
			const eligibilityData = result.eligibilityData;

			// Handle generic ERROR status first
			if (eligibilityData.eligibilityStatus === "ERROR") {
				const errorMessage = eligibilityData.userMessage || eligibilityData.error?.message || eligibilityData.error || "There was an error checking your eligibility. Please contact customer support.";
				console.log("Processing generic ERROR status with message:", errorMessage);
				return this._createErrorEligibilityData(errorMessage);
			}

			// Handle AAA_ERROR status from workflow
			if (eligibilityData.eligibilityStatus === "AAA_ERROR") {
				// Try multiple ways to extract the error code
				const errorCode = eligibilityData.error?.code || eligibilityData.aaaErrorCode || eligibilityData.error?.allErrors?.[0]?.code || "Unknown";

				console.log("Processing AAA_ERROR with code:", errorCode, "from eligibilityData:", eligibilityData);
				return this._createStediErrorEligibilityData(errorCode, eligibilityData.userMessage);
			}

			// Handle STEDI_ERROR status from workflow
			if (eligibilityData.eligibilityStatus === "STEDI_ERROR") {
				// Extract the Stedi error code
				const errorCode = eligibilityData.error?.code || eligibilityData.stediErrorCode || "Unknown";

				console.log("Processing STEDI_ERROR with code:", errorCode, "from eligibilityData:", eligibilityData);
				return this._createStediErrorEligibilityData(errorCode, eligibilityData.userMessage);
			}

			return eligibilityData;
		}

		// Handle error cases
		if (result?.success === false) {
			const errorMessage = result.error || result.message || "Unknown error from eligibility service";
			return this._createErrorEligibilityData(errorMessage);
		}

		// Fallback for unknown formats
		console.warn("Unknown webhook result format:", result);
		return this._createProcessingEligibilityData();
	}

	_createErrorEligibilityData(message) {
		return {
			isEligible: false,
			sessionsCovered: 0,
			deductible: { individual: 0 },
			eligibilityStatus: "ERROR",
			userMessage: message || "There was an error checking your eligibility. Please contact customer support.",
			planBegin: "",
			planEnd: ""
		};
	}

	_createAAAErrorEligibilityData(aaaError, errorMessage) {
		const aaaErrorMappings = {
			42: {
				title: "Service Temporarily Unavailable",
				message: "Your insurance company's system is temporarily unavailable. Please try again in a few minutes, or we can manually verify your coverage.",
				actionTitle: "Alternative Options",
				actionText: "Our team can verify your coverage manually while the system is down."
			},
			43: {
				title: "Provider Registration Issue",
				message: "Your insurance plan requires additional provider verification. Our team will contact you to complete the eligibility check.",
				actionTitle: "Manual Verification Required",
				actionText: "We'll verify your provider status and coverage details manually."
			},
			72: {
				title: "Member ID Not Found",
				message: "The member ID provided does not match our records. Please verify your member ID and try again.",
				actionTitle: "ID Verification Required",
				actionText: "Double-check your member ID matches exactly what's on your insurance card."
			},
			73: {
				title: "Name Mismatch",
				message: "The name provided doesn't match our records. Please verify the name matches exactly as shown on your insurance card.",
				actionTitle: "Name Verification Required",
				actionText: "Ensure the name matches exactly as it appears on your insurance card."
			},
			75: {
				title: "Member Not Found",
				message: "We couldn't find your insurance information in our system. This might be due to a recent plan change.",
				actionTitle: "Manual Verification Required",
				actionText: "Our team will manually verify your current insurance status."
			},
			76: {
				title: "Duplicate Member ID",
				message: "We found a duplicate member ID in the insurance database. This might be due to multiple plan records.",
				actionTitle: "Account Verification Required",
				actionText: "Our team will verify your current coverage status and resolve any account duplicates."
			},
			79: {
				title: "System Connection Issue",
				message: "There's a technical issue connecting with your insurance provider. Our team will manually verify your coverage.",
				actionTitle: "Manual Verification",
				actionText: "We'll process your eligibility manually and contact you with results."
			}
		};

		// Convert error code to number for lookup
		const numericErrorCode = parseInt(aaaError) || aaaError;
		const errorInfo = aaaErrorMappings[numericErrorCode] || aaaErrorMappings[String(numericErrorCode)];

		const finalMessage = errorMessage || errorInfo?.message || "There was an issue verifying your insurance coverage automatically. Our team will manually verify your coverage.";

		return {
			isEligible: false,
			sessionsCovered: 0,
			deductible: { individual: 0 },
			eligibilityStatus: "AAA_ERROR",
			userMessage: finalMessage,
			planBegin: "",
			planEnd: "",
			aaaErrorCode: String(aaaError),
			error: {
				code: String(aaaError),
				message: finalMessage,
				isAAAError: true,
				...errorInfo
			}
		};
	}

	_createProcessingEligibilityData() {
		const processingMessages = this.quizData?.ui?.statusMessages?.processing || {};

		return {
			isEligible: null,
			sessionsCovered: 0,
			deductible: { individual: 0 },
			eligibilityStatus: "PROCESSING",
			userMessage:
				processingMessages.userMessage ||
				"Your eligibility check and account setup is still processing in the background. This can take up to 3 minutes for complex insurance verifications and account creation. Please proceed with booking - we'll contact you with your coverage details shortly.",
			planBegin: "",
			planEnd: ""
		};
	}

	_createStediErrorEligibilityData(errorCode, customMessage = null) {
		// Use the Stedi error mappings if available, otherwise fall back to generic handling
		if (this.stediErrorMappings?.createEligibilityData) {
			console.log("Using Stedi error mappings for error code:", errorCode);
			return this.stediErrorMappings.createEligibilityData(errorCode, customMessage);
		}

		// Fallback to existing AAA error handling for backward compatibility
		console.log("Falling back to AAA error handling for error code:", errorCode);
		return this._createAAAErrorEligibilityData(errorCode, customMessage);
	}

	showResults(resultUrl, webhookSuccess = true, resultData = null, errorMessage = "") {
		try {
			this._stopLoadingMessages();
			this._stopStatusPolling(); // Ensure polling is stopped

			// Hide loading screen and show results
			this._toggleElement(this.loading, false);
			this._toggleElement(this.questions, true);
			this._toggleElement(this.navigationButtons, false);
			this._toggleElement(this.progressSection, false);

			// Keep nav header visible for back button functionality
			this._toggleElement(this.navHeader, true);

			const quizType = this.quizData?.type || "general";
			const resultsHTML = webhookSuccess ? this._generateResultsHTML(quizType, resultData, resultUrl) : this._generateErrorResultsHTML(resultUrl, errorMessage);

			this.questionContainer.innerHTML = resultsHTML;

			this._attachFAQListeners();
			this._attachBookingButtonListeners();

			// Scroll to top of results
			window.scrollTo({ top: 0, behavior: "smooth" });
		} catch (error) {
			console.error("Error in showResults:", error);
			throw error;
		}
	}

	_stopLoadingMessages() {
		// Clear any comprehensive loading sequence intervals
		if (this.loadingInterval) {
			clearInterval(this.loadingInterval);
			this.loadingInterval = null;
		}
	}

	_generateResultsHTML(quizType, resultData, resultUrl) {
		// Determine if this quiz should show insurance results
		if (this._isEligibilityQuiz(quizType, resultData)) {
			return this._generateInsuranceResultsHTML(resultData, resultUrl);
		}

		// For other quiz types, generate appropriate results
		switch (quizType) {
			case "assessment":
				return this._generateAssessmentResultsHTML(resultData, resultUrl);
			case "recommendation":
				return this._generateRecommendationResultsHTML(resultData, resultUrl);
			default:
				return this._generateGenericResultsHTML(resultData, resultUrl);
		}
	}

	_isEligibilityQuiz(quizType, resultData) {
		// Check if this quiz has eligibility data or is specifically an eligibility quiz
		return !!(resultData?.eligibilityStatus || resultData?.isEligible !== undefined || quizType === "eligibility" || this.quizData?.features?.eligibilityCheck);
	}

	_generateInsuranceResultsHTML(resultData, resultUrl) {
		console.log("_generateInsuranceResultsHTML called with:", {
			resultData,
			isEligible: resultData?.isEligible,
			eligibilityStatus: resultData?.eligibilityStatus,
			hasError: !!resultData?.error
		});

		if (!resultData) {
			console.log("No resultData, using generic results");
			return this._generateGenericResultsHTML(resultData, resultUrl);
		}

		const isEligible = resultData.isEligible === true;
		const eligibilityStatus = resultData.eligibilityStatus || "UNKNOWN";

		console.log("Processing eligibility status:", eligibilityStatus, "isEligible:", isEligible, "raw isEligible:", resultData.isEligible);

		if (isEligible && (eligibilityStatus === "ELIGIBLE" || eligibilityStatus === "ACTIVE")) {
			console.log("Generating eligible insurance results");
			return this._generateEligibleInsuranceResultsHTML(resultData, resultUrl);
		}

		if (eligibilityStatus === "AAA_ERROR") {
			console.log("Generating AAA error results");
			return this._generateAAAErrorResultsHTML(resultData, resultUrl);
		}

		if (eligibilityStatus === "TECHNICAL_PROBLEM") {
			console.log("Generating technical problem results");
			return this._generateTechnicalProblemResultsHTML(resultData, resultUrl);
		}

		if (eligibilityStatus === "INSURANCE_PLANS_ERROR") {
			console.log("Generating insurance plans error results");
			return this._generateInsurancePlansErrorResultsHTML(resultData, resultUrl);
		}

		if (eligibilityStatus === "TEST_DATA_ERROR") {
			console.log("Generating test data error results");
			return this._generateTestDataErrorResultsHTML(resultData, resultUrl);
		}

		if (eligibilityStatus === "PROCESSING") {
			console.log("Generating processing insurance results");
			return this._generateProcessingInsuranceResultsHTML(resultData, resultUrl);
		}

		if (eligibilityStatus === "ERROR") {
			console.log("Generating generic error results");
			return this._generateErrorResultsHTML(resultUrl, resultData.userMessage || resultData.error || "There was an error checking your eligibility. Please contact customer support.");
		}

		if (eligibilityStatus === "NOT_COVERED" || (resultData.isEligible === false && eligibilityStatus === "ELIGIBLE")) {
			console.log("Generating not covered insurance results");
			return this._generateNotCoveredInsuranceResultsHTML(resultData, resultUrl);
		}

		console.log("Generating ineligible insurance results (fallback)");
		return this._generateIneligibleInsuranceResultsHTML(resultData, resultUrl);
	}

	_generateGenericResultsHTML(resultData, resultUrl) {
		return `
			<div class="quiz-results-container">
				<div class="quiz-results-header">
					<h2 class="quiz-results-title">Quiz Complete</h2>
					<p class="quiz-results-subtitle">Thank you for completing the assessment.</p>
				</div>
				<div class="quiz-action-section">
					<div class="quiz-action-content">
						<div class="quiz-action-header">
							<h3 class="quiz-action-title">Next Steps</h3>
						</div>
						<div class="quiz-action-details">
							<div class="quiz-action-info">
								<div class="quiz-action-info-text">We've received your information and will be in touch soon with your personalized recommendations.</div>
							</div>
						</div>
						<a href="${resultUrl}" class="quiz-booking-button">Continue</a>
					</div>
				</div>
			</div>
		`;
	}

	_generateAssessmentResultsHTML(resultData, resultUrl) {
		// Implementation for assessment results
		return this._generateGenericResultsHTML(resultData, resultUrl);
	}

	_generateRecommendationResultsHTML(resultData, resultUrl) {
		// Implementation for recommendation results
		return this._generateGenericResultsHTML(resultData, resultUrl);
	}

	_generateErrorResultsHTML(resultUrl, errorMessage) {
		return `
			<div class="quiz-results-container">
				<div class="quiz-results-header">
					<h2 class="quiz-results-title">Quiz Complete</h2>
					<p class="quiz-results-subtitle">We've received your information.</p>
				</div>
				<div class="quiz-coverage-card" style="border-left: 4px solid #f56565; background-color: #fed7d7;">
                    <h3 class="quiz-coverage-card-title" style="color: #c53030;">⚠️ Eligibility Check Error</h3>
                    <p style="color: #c53030;">There was an error checking your insurance eligibility.</p>
				</div>
				<div class="quiz-action-section">
					<div class="quiz-action-content">
						<div class="quiz-action-header">
							<h3 class="quiz-action-title">Need assistance?</h3>
						</div>
						<div class="quiz-action-details">
							<div class="quiz-action-info">
								<svg class="quiz-action-info-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M10 18.3333C14.6023 18.3333 18.3333 14.6023 18.3333 9.99996C18.3333 5.39759 14.6023 1.66663 10 1.66663C5.39762 1.66663 1.66666 5.39759 1.66666 9.99996C1.66666 14.6023 5.39762 18.3333 10 18.3333Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
									<path d="M7.5 9.99996L9.16667 11.6666L12.5 8.33329" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<div class="quiz-action-info-text">Our support team will manually verify your insurance coverage and help you get connected with the right dietitian.</div>
							</div>
							<div class="quiz-action-feature">
								<svg class="quiz-action-feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M18.3333 14.1667C18.3333 15.0871 17.5871 15.8333 16.6667 15.8333H5.83333L1.66666 20V3.33333C1.66666 2.41286 2.41285 1.66667 3.33333 1.66667H16.6667C17.5871 1.66667 18.3333 2.41286 18.3333 3.33333V14.1667Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<div class="quiz-action-feature-text">Direct support to help resolve any coverage questions</div>
							</div>
							<div class="quiz-action-feature">
								<svg class="quiz-action-feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M6.66666 2.5V5.83333M13.3333 2.5V5.83333M2.5 9.16667H17.5M4.16666 3.33333H15.8333C16.7538 3.33333 17.5 4.07952 17.5 5V16.6667C17.5 17.5871 16.7538 18.3333 15.8333 18.3333H4.16666C3.24619 18.3333 2.5 17.5871 2.5 16.6667V5C2.5 4.07952 3.24619 3.33333 4.16666 3.33333Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<div class="quiz-action-feature-text">Quick resolution to get you scheduled with a dietitian</div>
							</div>
						</div>
						<a href="${resultUrl}" class="quiz-booking-button">Continue to Support</a>
					</div>
				</div>
			</div>
		`;
	}

	_generateEligibleInsuranceResultsHTML(resultData, resultUrl) {
		const sessionsCovered = resultData.sessionsCovered || 5;
		const planEnd = resultData.planEnd || "Dec 31, 2025";

		return `
			<div class="quiz-results-container">
				<div class="quiz-results-header">
					<h2 class="quiz-results-title">Great news! You're covered</h2>
					<p class="quiz-results-subtitle">As of today, your insurance fully covers your online dietitian consultations*</p>
				</div>

				<div class="quiz-coverage-card">
					<div class="quiz-coverage-card-title">Here's Your Offer</div>
					<div class="quiz-coverage-pricing">
						<div class="quiz-coverage-service-item">
							<div class="quiz-coverage-service">Initial consultation – 60 minutes</div>
							<div class="quiz-coverage-cost">
								<div class="quiz-coverage-copay">Co-pay: $0*</div>
								<div class="quiz-coverage-original-price">$100</div>
							</div>
						</div>
						<div class="quiz-coverage-service-item">
							<div class="quiz-coverage-service">Follow-up consultation – 30 minutes</div>
							<div class="quiz-coverage-cost">
								<div class="quiz-coverage-copay">Co-pay: $0*</div>
								<div class="quiz-coverage-original-price">$50</div>
							</div>
						</div>
					</div>

					<div class="quiz-coverage-divider"></div>

					<div class="quiz-coverage-benefits">
						<div class="quiz-coverage-benefit">
							<div class="quiz-coverage-benefit-icon">
								<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M7.08 1.67L3.33 1.67L3.33 18.33L10.83 18.33L10 7.5L16.67 5" stroke="#418865" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
							</div>
							<div class="quiz-coverage-benefit-text">${sessionsCovered} covered sessions remaining</div>
						</div>
						<div class="quiz-coverage-benefit">
							<div class="quiz-coverage-benefit-icon">
								<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M10.83 11.67L6.25 1.67L13.75 3.33L2.5 18.33L17.5 8.33" stroke="#418865" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
							</div>
							<div class="quiz-coverage-benefit-text">Coverage expires ${planEnd}</div>
						</div>
					</div>
				</div>

				<div class="quiz-action-section" style="background-color: #F1F8F4;">
					<div class="quiz-action-content">
						<div class="quiz-action-header">
							<h3 class="quiz-action-title">Schedule your initial online consultation now</h3>
						</div>
						<div class="quiz-action-details">
							<div class="quiz-action-info">
								<div class="quiz-action-info-icon">
									<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path d="M4.58 4.17L15.83 15.42L2.08 1.67L17.83 13.75L8.33 16.25" stroke="#418865" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
									</svg>
								</div>
								<div class="quiz-action-info-text">Our dietitians usually recommend minimum 6 consultations over 6 months, Today, just book your first.</div>
							</div>
							<div class="quiz-action-feature">
								<div class="quiz-action-feature-icon">
									<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path d="M1.67 2.5L18.33 18.17L13.33 1.67L5 5L6.67 10.42" stroke="#418865" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
									</svg>
								</div>
								<div class="quiz-action-feature-text">Free cancellation up to 24h before</div>
							</div>
						</div>
						<a href="${resultUrl}" class="quiz-booking-button">Proceed to booking</a>
					</div>
				</div>

				${this._generateFAQHTML()}
			</div>
		`;
	}

	_generateNotCoveredInsuranceResultsHTML(resultData, resultUrl) {
		const messages = this.quizData.ui?.resultMessages?.notCovered || {};
		const userMessage = resultData.userMessage || "Your insurance plan doesn't cover nutrition counseling, but we have affordable options available.";

		return `
			<div class="quiz-results-container">
				<div class="quiz-results-header">
					<h2 class="quiz-results-title">${messages.title || "Thanks for completing the quiz!"}</h2>
					<p class="quiz-results-subtitle">${messages.subtitle || "We have options for you."}</p>
				</div>
				<div class="quiz-coverage-card" style="border-left: 4px solid #ed8936; background-color: #fffaf0;">
					<h3 class="quiz-coverage-card-title" style="color: #c05621;">💡 Coverage Information</h3>
					<p style="color: #c05621;">${userMessage}</p>
				</div>
				<div class="quiz-action-section">
					<div class="quiz-action-content">
						<div class="quiz-action-header">
							<h3 class="quiz-action-title">Alternative Options</h3>
						</div>
						<div class="quiz-action-details">
							<div class="quiz-action-info">
								<svg class="quiz-action-info-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M10 18.3333C14.6023 18.3333 18.3333 14.6023 18.3333 9.99996C18.3333 5.39759 14.6023 1.66663 10 1.66663C5.39762 1.66663 1.66666 5.39759 1.66666 9.99996C1.66666 14.6023 5.39762 18.3333 10 18.3333Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
									<path d="M7.5 9.99996L9.16667 11.6666L12.5 8.33329" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<div class="quiz-action-info-text">We offer affordable self-pay options and payment plans to make nutrition counseling accessible.</div>
							</div>
							<div class="quiz-action-feature">
								<svg class="quiz-action-feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M18.3333 14.1667C18.3333 15.0871 17.5871 15.8333 16.6667 15.8333H5.83333L1.66666 20V3.33333C1.66666 2.41286 2.41285 1.66667 3.33333 1.66667H16.6667C17.5871 1.66667 18.3333 2.41286 18.3333 3.33333V14.1667Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<div class="quiz-action-feature-text">Competitive rates and flexible payment options</div>
							</div>
							<div class="quiz-action-feature">
								<svg class="quiz-action-feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M6.66666 2.5V5.83333M13.3333 2.5V5.83333M2.5 9.16667H17.5M4.16666 3.33333H15.8333C16.7538 3.33333 17.5 4.07952 17.5 5V16.6667C17.5 17.5871 16.7538 18.3333 15.8333 18.3333H4.16666C3.24619 18.3333 2.5 17.5871 2.5 16.6667V5C2.5 4.07952 3.24619 3.33333 4.16666 3.33333Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<div class="quiz-action-feature-text">Same quality care from registered dietitians</div>
							</div>
						</div>
						<a href="${resultUrl}" class="quiz-booking-button">Explore Options</a>
					</div>
				</div>
			</div>
		`;
	}

	_generateAAAErrorResultsHTML(resultData, resultUrl) {
		const messages = this.quizData.ui?.resultMessages?.aaaError || {};
		const error = resultData.error || {};
		const errorCode = error.code || resultData.aaaErrorCode || "Unknown";
		const userMessage = resultData.userMessage || error.message || "There was an issue verifying your insurance coverage automatically.";
		const errorTitle = error.title || this._getErrorTitle(errorCode);

		return `
			<div class="quiz-results-container">
				<div class="quiz-results-header">
					<h2 class="quiz-results-title">${messages.title || "Thanks for completing the quiz!"}</h2>
					<p class="quiz-results-subtitle">${messages.subtitle || "We're here to help."}</p>
				</div>
				<div class="quiz-coverage-card" style="border-left: 4px solid #f56565; background-color: #fed7d7;">
					<h3 class="quiz-coverage-card-title" style="color: #c53030;">⚠️ ${errorTitle}</h3>
					<p style="color: #c53030;">${userMessage}</p>
					${errorCode !== "Unknown" ? `<p style="color: #c53030; font-size: 0.9em; margin-top: 8px;">Error Code: ${errorCode}</p>` : ""}
				</div>
				<div class="quiz-action-section">
					<div class="quiz-action-content">
						<div class="quiz-action-header">
							<h3 class="quiz-action-title">We'll help resolve this</h3>
						</div>
						<div class="quiz-action-details">
							<div class="quiz-action-info">
								<svg class="quiz-action-info-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M10 18.3333C14.6023 18.3333 18.3333 14.6023 18.3333 9.99996C18.3333 5.39759 14.6023 1.66663 10 1.66663C5.39762 1.66663 1.66666 5.39759 1.66666 9.99996C1.66666 14.6023 5.39762 18.3333 10 18.3333Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
									<path d="M7.5 9.99996L9.16667 11.6666L12.5 8.33329" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<div class="quiz-action-info-text">Our team will manually verify your insurance coverage and resolve any verification issues.</div>
							</div>
							<div class="quiz-action-feature">
								<svg class="quiz-action-feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M18.3333 14.1667C18.3333 15.0871 17.5871 15.8333 16.6667 15.8333H5.83333L1.66666 20V3.33333C1.66666 2.41286 2.41285 1.66667 3.33333 1.66667H16.6667C17.5871 1.66667 18.3333 2.41286 18.3333 3.33333V14.1667Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<div class="quiz-action-feature-text">Direct support to resolve coverage verification</div>
							</div>
							<div class="quiz-action-feature">
								<svg class="quiz-action-feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M6.66666 2.5V5.83333M13.3333 2.5V5.83333M2.5 9.16667H17.5M4.16666 3.33333H15.8333C16.7538 3.33333 17.5 4.07952 17.5 5V16.6667C17.5 17.5871 16.7538 18.3333 15.8333 18.3333H4.16666C3.24619 18.3333 2.5 17.5871 2.5 16.6667V5C2.5 4.07952 3.24619 3.33333 4.16666 3.33333Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<div class="quiz-action-feature-text">Quick resolution to get you connected with a dietitian</div>
							</div>
						</div>
						<a href="${resultUrl}" class="quiz-booking-button">Continue with Support</a>
					</div>
				</div>
			</div>
		`;
	}

	_generateTestDataErrorResultsHTML(resultData, resultUrl) {
		const messages = this.quizData.ui?.resultMessages?.testDataError || {};
		const userMessage = resultData.userMessage || "Test data was detected in your submission. Please use real insurance information for accurate verification.";

		return `
			<div class="quiz-results-container">
				<div class="quiz-results-header">
					<h2 class="quiz-results-title">${messages.title || "Please use real information"}</h2>
					<p class="quiz-results-subtitle">${messages.subtitle || "We need accurate details for verification."}</p>
				</div>
				<div class="quiz-coverage-card" style="border-left: 4px solid #ed8936; background-color: #fffaf0;">
					<h3 class="quiz-coverage-card-title" style="color: #c05621;">⚠️ Test Data Detected</h3>
					<p style="color: #c05621;">${userMessage}</p>
				</div>
				<div class="quiz-action-section">
					<div class="quiz-action-content">
						<div class="quiz-action-header">
							<h3 class="quiz-action-title">Next Steps</h3>
						</div>
						<div class="quiz-action-details">
							<div class="quiz-action-info">
								<svg class="quiz-action-info-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M10 18.3333C14.6023 18.3333 18.3333 14.6023 18.3333 9.99996C18.3333 5.39759 14.6023 1.66663 10 1.66663C5.39762 1.66663 1.66666 5.39759 1.66666 9.99996C1.66666 14.6023 5.39762 18.3333 10 18.3333Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
									<path d="M7.5 9.99996L9.16667 11.6666L12.5 8.33329" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<div class="quiz-action-info-text">Please retake the quiz with your actual insurance information for accurate coverage verification.</div>
							</div>
							<div class="quiz-action-feature">
								<svg class="quiz-action-feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M18.3333 14.1667C18.3333 15.0871 17.5871 15.8333 16.6667 15.8333H5.83333L1.66666 20V3.33333C1.66666 2.41286 2.41285 1.66667 3.33333 1.66667H16.6667C17.5871 1.66667 18.3333 2.41286 18.3333 3.33333V14.1667Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<div class="quiz-action-feature-text">Use information exactly as it appears on your insurance card</div>
							</div>
							<div class="quiz-action-feature">
								<svg class="quiz-action-feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M6.66666 2.5V5.83333M13.3333 2.5V5.83333M2.5 9.16667H17.5M4.16666 3.33333H15.8333C16.7538 3.33333 17.5 4.07952 17.5 5V16.6667C17.5 17.5871 16.7538 18.3333 15.8333 18.3333H4.16666C3.24619 18.3333 2.5 17.5871 2.5 16.6667V5C2.5 4.07952 3.24619 3.33333 4.16666 3.33333Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<div class="quiz-action-feature-text">Get accurate coverage details for your plan</div>
							</div>
						</div>
						<a href="${resultUrl}" class="quiz-booking-button">Continue</a>
					</div>
				</div>
			</div>
		`;
	}

	_generateTechnicalProblemResultsHTML(resultData, resultUrl) {
		const messages = this.quizData.ui?.resultMessages?.technicalProblem || {};
		const error = resultData.error || {};
		const errorCode = error.code || resultData.stediErrorCode || "Unknown";
		const userMessage = resultData.userMessage || error.message || "There was a technical issue processing your insurance verification.";
		const actionTitle = error.actionTitle || "Technical Issue Detected";
		const detailedDescription = error.detailedDescription || "Our systems encountered an unexpected error while processing your request.";

		return `
			<div class="quiz-results-container">
				<div class="quiz-results-header">
					<h2 class="quiz-results-title">${messages.title || "Technical Issue Detected"}</h2>
					<p class="quiz-results-subtitle">${messages.subtitle || "We're resolving this for you."}</p>
				</div>

				<div class="quiz-technical-problem-error">
					<div class="quiz-technical-problem-header">
						<div class="quiz-technical-problem-icon">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M12 8V12M12 16H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
							</svg>
						</div>
						<div class="quiz-technical-problem-content">
							<h3 class="quiz-technical-problem-title">${actionTitle}</h3>
							<p class="quiz-technical-problem-subtitle">System error detected during processing</p>
						</div>
					</div>

					<div class="quiz-technical-problem-message">
						<p class="quiz-technical-problem-primary-text">${userMessage}</p>
						<p class="quiz-technical-problem-secondary-text">${detailedDescription}</p>
					</div>

					<div class="quiz-technical-problem-details">
						<div class="quiz-technical-problem-detail-item">
							<svg class="quiz-technical-problem-detail-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M10 6V10M10 14H10.01M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z" stroke="#dc2626" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
							</svg>
							<div class="quiz-technical-problem-detail-content">
								<p class="quiz-technical-problem-detail-title">Issue Type</p>
								<p class="quiz-technical-problem-detail-text">System processing error</p>
							</div>
						</div>

						<div class="quiz-technical-problem-detail-item">
							<svg class="quiz-technical-problem-detail-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M10 2C14.9706 2 19 6.02944 19 11C19 15.9706 14.9706 20 10 20C5.02944 20 1 15.9706 1 11C1 6.02944 5.02944 2 10 2ZM10 7C9.44772 7 9 7.44772 9 8V12C9 12.5523 9.44772 13 10 13C10.5523 13 11 12.5523 11 12V8C11 7.44772 10.5523 7 10 7ZM10 15.5C10.8284 15.5 11.5 14.8284 11.5 14C11.5 13.1716 10.8284 12.5 10 12.5C9.17157 12.5 8.5 13.1716 8.5 14C8.5 14.8284 9.17157 15.5 10 15.5Z" fill="#dc2626"/>
							</svg>
							<div class="quiz-technical-problem-detail-content">
								<p class="quiz-technical-problem-detail-title">Status</p>
								<p class="quiz-technical-problem-detail-text">Automatically reported to our technical team</p>
							</div>
						</div>

						<div class="quiz-technical-problem-detail-item">
							<svg class="quiz-technical-problem-detail-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M13 2L3 14H12L7 18L17 6H8L13 2Z" stroke="#dc2626" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
							</svg>
							<div class="quiz-technical-problem-detail-content">
								<p class="quiz-technical-problem-detail-title">Resolution</p>
								<p class="quiz-technical-problem-detail-text">Manual processing initiated</p>
							</div>
						</div>
					</div>

					${
						errorCode !== "Unknown"
							? `
						<div class="quiz-technical-problem-error-code">
							<span class="quiz-technical-problem-error-code-label">Error Code</span>
							<span class="quiz-technical-problem-error-code-value">${errorCode}</span>
						</div>
					`
							: ""
					}
				</div>

				<div class="quiz-technical-problem-action">
					<div class="quiz-technical-problem-action-header">
						<div class="quiz-technical-problem-action-icon">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M8.5 3L11.5 3C12.6046 3 13.5 3.89543 13.5 5L13.5 15C13.5 16.1046 12.6046 17 11.5 17L8.5 17C7.39543 17 6.5 16.1046 6.5 15L6.5 5C6.5 3.89543 7.39543 3 8.5 3Z" stroke="#22c55e" stroke-width="1.5"/>
								<path d="M9 6L11 6" stroke="#22c55e" stroke-width="1.5" stroke-linecap="round"/>
								<path d="M9 8L11 8" stroke="#22c55e" stroke-width="1.5" stroke-linecap="round"/>
								<path d="M9 10L11 10" stroke="#22c55e" stroke-width="1.5" stroke-linecap="round"/>
								<path d="M9 12L11 12" stroke="#22c55e" stroke-width="1.5" stroke-linecap="round"/>
								<path d="M10 14.5C10.2761 14.5 10.5 14.2761 10.5 14C10.5 13.7239 10.2761 13.5 10 13.5C9.72386 13.5 9.5 13.7239 9.5 14C9.5 14.2761 9.72386 14.5 10 14.5Z" fill="#22c55e"/>
							</svg>
						</div>
						<h3 class="quiz-technical-problem-action-title">We're handling this</h3>
					</div>

					<div class="quiz-technical-problem-action-content">
						<div class="quiz-technical-problem-action-item">
							<svg class="quiz-technical-problem-action-item-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
								<path d="M9 12L11 14L15 10" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
							</svg>
							<div class="quiz-technical-problem-action-item-content">
								<h4 class="quiz-technical-problem-action-item-title">Automatic Resolution</h4>
								<p class="quiz-technical-problem-action-item-text">Our technical team has been automatically notified and will resolve this issue manually</p>
							</div>
						</div>

						<div class="quiz-technical-problem-action-item">
							<svg class="quiz-technical-problem-action-item-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
							</svg>
							<div class="quiz-technical-problem-action-item-content">
								<h4 class="quiz-technical-problem-action-item-title">Manual Processing</h4>
								<p class="quiz-technical-problem-action-item-text">We'll manually process your eligibility verification and contact you with results</p>
							</div>
						</div>

						<div class="quiz-technical-problem-action-item">
							<svg class="quiz-technical-problem-action-item-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M8 2V5M16 2V5M3.5 9H20.5M5 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3Z" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
							</svg>
							<div class="quiz-technical-problem-action-item-content">
								<h4 class="quiz-technical-problem-action-item-title">Quick Connection</h4>
								<p class="quiz-technical-problem-action-item-text">Get connected with our support team to expedite your dietitian appointment</p>
							</div>
						</div>
					</div>

					<a href="${resultUrl}" class="quiz-technical-problem-action-button">
						<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M17.5 12.5C17.5 13.4205 16.7705 14.1667 15.8333 14.1667H6.25L2.5 17.5V4.16667C2.5 3.24619 3.24619 2.5 4.16667 2.5H15.8333C16.7705 2.5 17.5 3.24619 17.5 4.16667V12.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
						Continue with Support
					</a>
				</div>
			</div>
		`;
	}

	_generateInsurancePlansErrorResultsHTML(resultData, resultUrl) {
		const messages = this.quizData.ui?.resultMessages?.insurancePlansError || {};
		const error = resultData.error || {};
		const errorCode = error.code || resultData.stediErrorCode || "Unknown";
		const userMessage = resultData.userMessage || error.message || "There was an issue with your insurance information.";
		const actionTitle = error.actionTitle || "Insurance Information Review";
		const canRetry = error.canRetry || false;

		return `
			<div class="quiz-results-container">
				<div class="quiz-results-header">
					<h2 class="quiz-results-title">${messages.title || "Insurance Information Review"}</h2>
					<p class="quiz-results-subtitle">${messages.subtitle || "Let's verify your details."}</p>
				</div>
				<div class="quiz-coverage-card" style="border-left: 4px solid #ed8936; background-color: #fffaf0;">
					<h3 class="quiz-coverage-card-title" style="color: #c05621;">📋 ${actionTitle}</h3>
					<p style="color: #c05621;">${userMessage}</p>
					${errorCode !== "Unknown" ? `<p style="color: #c05621; font-size: 0.9em; margin-top: 8px;">Error Code: ${errorCode}</p>` : ""}
					${error.detailedDescription ? `<p style="color: #c05621; font-size: 0.85em; margin-top: 4px;">${error.detailedDescription}</p>` : ""}
				</div>
				<div class="quiz-action-section">
					<div class="quiz-action-content">
						<div class="quiz-action-header">
							<h3 class="quiz-action-title">${canRetry ? "Verification Options" : "Next Steps"}</h3>
						</div>
						<div class="quiz-action-details">
							<div class="quiz-action-info">
								<svg class="quiz-action-info-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M10 18.3333C14.6023 18.3333 18.3333 14.6023 18.3333 9.99996C18.3333 5.39759 14.6023 1.66663 10 1.66663C5.39762 1.66663 1.66666 5.39759 1.66666 9.99996C1.66666 14.6023 5.39762 18.3333 10 18.3333Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
									<path d="M7.5 9.99996L9.16667 11.6666L12.5 8.33329" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<div class="quiz-action-info-text">${error.actionText || "Please verify your insurance details match your card exactly, or our team can help verify your coverage manually."}</div>
							</div>
							<div class="quiz-action-feature">
								<svg class="quiz-action-feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M18.3333 14.1667C18.3333 15.0871 17.5871 15.8333 16.6667 15.8333H5.83333L1.66666 20V3.33333C1.66666 2.41286 2.41285 1.66667 3.33333 1.66667H16.6667C17.5871 1.66667 18.3333 2.41286 18.3333 3.33333V14.1667Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<div class="quiz-action-feature-text">${canRetry ? "Double-check your information matches your insurance card exactly" : "Our team will verify your insurance information manually"}</div>
							</div>
							<div class="quiz-action-feature">
								<svg class="quiz-action-feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M6.66666 2.5V5.83333M13.3333 2.5V5.83333M2.5 9.16667H17.5M4.16666 3.33333H15.8333C16.7538 3.33333 17.5 4.07952 17.5 5V16.6667C17.5 17.5871 16.7538 18.3333 15.8333 18.3333H4.16666C3.24619 18.3333 2.5 17.5871 2.5 16.6667V5C2.5 4.07952 3.24619 3.33333 4.16666 3.33333Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<div class="quiz-action-feature-text">Get accurate coverage details for your plan</div>
							</div>
						</div>
						<a href="${resultUrl}" class="quiz-booking-button">Continue with Verification</a>
					</div>
				</div>
			</div>
		`;
	}

	_generateProcessingInsuranceResultsHTML(resultData, resultUrl) {
		const messages = this.quizData.ui?.resultMessages?.processing || {};
		const userMessage =
			resultData.userMessage ||
			"Your eligibility check and account setup is still processing in the background. This can take up to 3 minutes for complex insurance verifications and account creation. Please proceed with booking - we'll contact you with your coverage details shortly.";

		return `
			<div class="quiz-results-container">
				<div class="quiz-results-header">
					<h2 class="quiz-results-title">${messages.title || "Thanks for completing the quiz!"}</h2>
					<p class="quiz-results-subtitle">${messages.subtitle || "We're processing your information."}</p>
				</div>
				<div class="quiz-coverage-card" style="border-left: 4px solid #3182ce; background-color: #ebf8ff;">
					<h3 class="quiz-coverage-card-title" style="color: #2c5282;">⏳ Processing Your Information</h3>
					<p style="color: #2c5282;">${userMessage}</p>
				</div>
				<div class="quiz-action-section">
					<div class="quiz-action-content">
						<div class="quiz-action-header">
							<h3 class="quiz-action-title">What's happening now?</h3>
						</div>
						<div class="quiz-action-details">
							<div class="quiz-action-info">
								<svg class="quiz-action-info-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M10 18.3333C14.6023 18.3333 18.3333 14.6023 18.3333 9.99996C18.3333 5.39759 14.6023 1.66663 10 1.66663C5.39762 1.66663 1.66666 5.39759 1.66666 9.99996C1.66666 14.6023 5.39762 18.3333 10 18.3333Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
									<path d="M7.5 9.99996L9.16667 11.6666L12.5 8.33329" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<div class="quiz-action-info-text">We're verifying your insurance coverage and setting up your account in the background.</div>
							</div>
							<div class="quiz-action-feature">
								<svg class="quiz-action-feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M18.3333 14.1667C18.3333 15.0871 17.5871 15.8333 16.6667 15.8333H5.83333L1.66666 20V3.33333C1.66666 2.41286 2.41285 1.66667 3.33333 1.66667H16.6667C17.5871 1.66667 18.3333 2.41286 18.3333 3.33333V14.1667Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<div class="quiz-action-feature-text">You'll receive an update with your coverage details shortly</div>
							</div>
							<div class="quiz-action-feature">
								<svg class="quiz-action-feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M6.66666 2.5V5.83333M13.3333 2.5V5.83333M2.5 9.16667H17.5M4.16666 3.33333H15.8333C16.7538 3.33333 17.5 4.07952 17.5 5V16.6667C17.5 17.5871 16.7538 18.3333 15.8333 18.3333H4.16666C3.24619 18.3333 2.5 17.5871 2.5 16.6667V5C2.5 4.07952 3.24619 3.33333 4.16666 3.33333Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<div class="quiz-action-feature-text">You can proceed with booking while we complete the verification</div>
							</div>
						</div>
						<a href="${resultUrl}" class="quiz-booking-button">Continue to Booking</a>
					</div>
				</div>
			</div>
		`;
	}

	_generateIneligibleInsuranceResultsHTML(eligibilityData, resultUrl) {
		const messages = this.quizData.ui?.resultMessages?.notEligible || {};
		const userMessage = eligibilityData.userMessage || "Your eligibility check is complete.";
		const error = eligibilityData.error || {};
		const errorCode = error.code || "Unknown";
		const errorMessage = error.message || "";
		const errorDetails = error.details || "";

		// Check if this is actually an error scenario that needs detailed display
		const hasDetailedError = error.code || error.message || error.details;
		const isErrorScenario = eligibilityData.eligibilityStatus === "PAYER_ERROR" || hasDetailedError;

		// Generate detailed error information if available
		const errorDetailsHTML = hasDetailedError ? this._generateErrorDetailsHTML(error, errorCode, errorMessage, errorDetails, false) : "";

		return `
			<div class="quiz-results-container">
				<div class="quiz-results-header">
                    <h2 class="quiz-results-title">${messages.title || "Thanks for completing the quiz!"}</h2>
                    <p class="quiz-results-subtitle">${messages.subtitle || "We're ready to help you."}</p>
				</div>
                <div class="quiz-coverage-card ${isErrorScenario ? "quiz-error-card" : ""}">
                    <h3 class="quiz-coverage-card-title ${isErrorScenario ? "quiz-error-card-title" : ""}">${isErrorScenario ? "⚠️ " : ""}Insurance Coverage Check${errorCode !== "Unknown" ? ` (Error ${errorCode})` : ""}</h3>

					${
						isErrorScenario && errorMessage
							? `
						<div class="quiz-error-main-message">
							<p class="quiz-error-primary-text">${errorMessage}</p>
							<p class="quiz-error-secondary-text">${userMessage}</p>
						</div>
						${errorDetailsHTML}
					`
							: `<p>${userMessage}</p>`
					}
				</div>
				<div class="quiz-action-section">
					<div class="quiz-action-content">
						<div class="quiz-action-header">
							<h3 class="quiz-action-title">What's next?</h3>
						</div>
						<div class="quiz-action-details">
							<div class="quiz-action-info">
								<svg class="quiz-action-info-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M10 18.3333C14.6023 18.3333 18.3333 14.6023 18.3333 9.99996C18.3333 5.39759 14.6023 1.66663 10 1.66663C5.39762 1.66663 1.66666 5.39759 1.66666 9.99996C1.66666 14.6023 5.39762 18.3333 10 18.3333Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
									<path d="M7.5 9.99996L9.16667 11.6666L12.5 8.33329" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<div class="quiz-action-info-text">We'll help you connect with a registered dietitian and explore your options for coverage and consultation.</div>
							</div>
							<div class="quiz-action-feature">
								<svg class="quiz-action-feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M18.3333 14.1667C18.3333 15.0871 17.5871 15.8333 16.6667 15.8333H5.83333L1.66666 20V3.33333C1.66666 2.41286 2.41285 1.66667 3.33333 1.66667H16.6667C17.5871 1.66667 18.3333 2.41286 18.3333 3.33333V14.1667Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<div class="quiz-action-feature-text">Personal consultation to review your coverage options</div>
							</div>
							<div class="quiz-action-feature">
								<svg class="quiz-action-feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M6.66666 2.5V5.83333M13.3333 2.5V5.83333M2.5 9.16667H17.5M4.16666 3.33333H15.8333C16.7538 3.33333 17.5 4.07952 17.5 5V16.6667C17.5 17.5871 16.7538 18.3333 15.8333 18.3333H4.16666C3.24619 18.3333 2.5 17.5871 2.5 16.6667V5C2.5 4.07952 3.24619 3.33333 4.16666 3.33333Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<div class="quiz-action-feature-text">Flexible scheduling that works with your availability</div>
							</div>
						</div>
						<a href="${resultUrl}" class="quiz-booking-button">Continue with Next Steps</a>
					</div>
				</div>
			</div>
		`;
	}

	_generateErrorDetailsHTML(error, errorCode, errorMessage, errorDetails, hasMultipleErrors) {
		let detailsHTML = "";

		// Add technical details if available
		if (errorDetails && errorDetails !== errorMessage) {
			detailsHTML += `
				<div class="quiz-error-technical-section">
					<p class="quiz-error-section-title"><strong>Technical Details:</strong></p>
					<p class="quiz-error-details-text">${errorDetails}</p>
				</div>
			`;
		}

		// Add error metadata if available
		const metadata = [];
		if (error.isAAAError) metadata.push("Verification Issue");
		if (hasMultipleErrors) metadata.push(`Multiple Issues (${error.totalErrors})`);
		if (errorCode && errorCode !== "Unknown") metadata.push(`Error Code: ${errorCode}`);

		if (metadata.length > 0) {
			detailsHTML += `
				<div class="quiz-error-metadata-section">
					<p class="quiz-error-section-title"><strong>Issue Details:</strong></p>
					<div class="quiz-error-metadata-badges">
						${metadata.map(item => `<span class="quiz-error-badge">${item}</span>`).join("")}
					</div>
				</div>
			`;
		}

		// Add specific guidance based on error code
		const guidance = this._getErrorGuidance(errorCode);
		if (guidance) {
			detailsHTML += `
				<div class="quiz-error-guidance-section">
					<p class="quiz-error-section-title"><strong>What This Means:</strong></p>
					<p class="quiz-error-guidance-text">${guidance}</p>
				</div>
			`;
		}

		return detailsHTML;
	}

	_getErrorTitle(errorCode) {
		const errorTitles = {
			42: "Service Temporarily Unavailable",
			43: "Provider Registration Issue",
			72: "Member ID Verification Needed",
			73: "Name Verification Needed",
			75: "Subscriber Not Found",
			76: "Duplicate Member ID Found",
			79: "System Connection Issue"
		};

		return errorTitles[errorCode] || "Insurance Verification Issue";
	}

	_getErrorGuidance(errorCode) {
		const errorGuidance = {
			42: "Your insurance company's system is temporarily down for maintenance. This is usually resolved within a few hours.",
			43: "Your insurance plan requires our provider to be specifically registered. We'll handle this registration process for you.",
			72: "The member ID entered doesn't match records. Please verify the ID exactly as shown on your insurance card, including any letters or special characters.",
			73: "The name entered doesn't match your insurance records. Make sure the name matches exactly as it appears on your insurance card.",
			75: "Your insurance information wasn't found in the system. This could be due to a recent plan change, new enrollment, or data sync delay.",
			76: "Your member ID appears multiple times in the insurance database. This often happens when you have multiple plan types or recent changes. Our team will identify your current active plan.",
			79: "There's a temporary technical issue connecting with your insurance provider's verification system. This is typically resolved quickly."
		};

		return errorGuidance[errorCode] || null;
	}

	_generateFAQHTML() {
		const defaultFAQData = [
			{
				id: "credit-card",
				question: "Why do I need to provide my credit card?",
				answer:
					"You'll be able to attend your consultation right away, while the co-pay will be charged later, only after your insurance is billed. We require your card for this purpose. If you cancel or reschedule with less than 24 hours' notice, or miss your appointment, your card will be charged the full consultation fee."
			},
			{
				id: "coverage-change",
				question: "Can my coverage or co-pay change after booking?",
				answer:
					"Your coverage details are verified at the time of booking. However, insurance benefits can change due to plan updates, deductible changes, or other factors. We'll always verify your current benefits before each appointment and notify you of any changes."
			}
		];

		const faqData = this.quizData.ui?.faq || defaultFAQData;
		if (faqData.length === 0) return "";

		return `
			<div class="quiz-faq-section">
				<div class="quiz-faq-divider"></div>
                ${faqData
									.map(
										faq => `
                    <div class="quiz-faq-item" data-faq="${faq.id}" tabindex="0" role="button" aria-expanded="false">
					<div class="quiz-faq-content">
                            <div class="quiz-faq-question-collapsed">${faq.question}</div>
                            <div class="quiz-faq-answer">${faq.answer}</div>
					</div>
					<div class="quiz-faq-toggle">
                            <svg class="quiz-faq-toggle-icon" width="32" height="32" viewBox="0 0 32 32" fill="none">
							<path d="M4 16H28" stroke="#4f4f4f" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
							<path d="M16 4V28" stroke="#4f4f4f" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					</div>
				</div>
				<div class="quiz-faq-divider"></div>
                `
									)
									.join("")}
			</div>
		`;
	}

	_attachFAQListeners() {
		const faqItems = this.questionContainer.querySelectorAll(".quiz-faq-item");
		faqItems.forEach(item => {
			item.addEventListener("click", () => {
				const isExpanded = item.classList.contains("expanded");

				// Toggle expanded state immediately for smooth animation
				if (!isExpanded) {
					item.classList.add("expanded");
					const question = item.querySelector(".quiz-faq-question, .quiz-faq-question-collapsed");
					if (question) question.className = "quiz-faq-question";
				} else {
					item.classList.remove("expanded");
					const question = item.querySelector(".quiz-faq-question, .quiz-faq-question-collapsed");
					if (question) question.className = "quiz-faq-question-collapsed";
				}
			});
		});
	}

	_attachBookingButtonListeners() {
		const bookingButtons = this.questionContainer.querySelectorAll(".quiz-booking-button");
		bookingButtons.forEach(button => {
			button.addEventListener("click", this._handleBookingButtonClick.bind(this));
		});
	}

	async _handleBookingButtonClick(event) {
		event.preventDefault();
		const button = event.currentTarget;

		console.log("Booking button clicked");

		// Show loading state
		this._showBookingLoadingState(button);

		try {
			// Debug: Log all data attributes on the container
			console.log("Container data attributes:", {
				orchestratorUrl: this.container.getAttribute("data-orchestrator-url"),
				statusPollingUrl: this.container.getAttribute("data-status-polling-url"),
				schedulingUrl: this.container.getAttribute("data-scheduling-url"),
				resultUrl: this.container.getAttribute("data-result-url"),
				quizUrl: this.container.getAttribute("data-quiz-url")
			});

			// Get scheduling URL with fallback
			const schedulingUrl = this.container.getAttribute("data-scheduling-url") || "https://us-central1-telemedicine-458913.cloudfunctions.net/workflow_scheduling";

			// Handle empty string case
			const finalSchedulingUrl = schedulingUrl.trim() || "https://us-central1-telemedicine-458913.cloudfunctions.net/workflow_scheduling";

			console.log("Using scheduling URL:", finalSchedulingUrl);

			// Trigger scheduling workflow
			const schedulingResult = await this._triggerSchedulingWorkflow(finalSchedulingUrl);

			// Show scheduling results
			this._showSchedulingResults(schedulingResult);
		} catch (error) {
			console.error("Scheduling error:", error);

			// Test mode error notification
			if (this.isTestMode) {
				this._showBackgroundProcessNotification(
					`
					🧪 TEST MODE - Scheduling Error<br>
					❌ ${error.message}<br>
					• Check console for details
				`,
					"error"
				);
			}

			this._showSchedulingError(error.message);
		}
	}

	_showBookingLoadingState(button) {
		// Store original button content
		if (!button.dataset.originalContent) {
			button.dataset.originalContent = button.innerHTML;
		}

		// Show loading state
		button.innerHTML = `
			<div class="quiz-spinner" style="width: 20px; height: 20px; margin-right: 8px;"></div>
			Setting up your appointment...
		`;
		button.disabled = true;
		button.style.cursor = "not-allowed";
	}

	async _triggerSchedulingWorkflow(schedulingUrl) {
		console.log("Triggering scheduling workflow...");

		// Extract all required data
		const extractedData = this._extractResponseData(this.isTestMode);
		const payload = this._buildSchedulingPayload(extractedData);

		console.log("Scheduling payload:", payload);

		// Test mode notification
		if (this.isTestMode) {
			this._showBackgroundProcessNotification(
				`
				🧪 TEST MODE - Scheduling Request<br>
				• URL: ${schedulingUrl}<br>
				• Required fields: ${Object.keys(payload)
					.filter(k => k !== "allResponses")
					.join(", ")}<br>
				• Address: ${payload.address || "❌ Missing"}<br>
				• City: ${payload.city || "❌ Missing"}<br>
				• ZIP: ${payload.zip || "❌ Missing"}<br>
				• Sex: ${payload.sex || "❌ Missing"}
			`,
				"info"
			);
		}

		const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Scheduling request timed out")), 45000));

		const fetchPromise = fetch(schedulingUrl, {
			method: "POST",
			mode: "cors",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				"X-Workflow-Type": "scheduling"
			},
			body: JSON.stringify(payload)
		});

		const response = await Promise.race([fetchPromise, timeoutPromise]);

		console.log("Raw scheduling response:", {
			ok: response.ok,
			status: response.status,
			statusText: response.statusText
		});

		if (response.ok) {
			const result = await response.json();
			console.log("Parsed scheduling response:", result);

			// Test mode response notification
			if (this.isTestMode) {
				const schedulingData = result?.schedulingData;
				const workflowSuccess = result?.success;
				const schedulingSuccess = schedulingData?.success;

				this._showBackgroundProcessNotification(
					`
					🧪 TEST MODE - Scheduling Response<br>
					• HTTP Status: ${response.status} ${response.statusText}<br>
					• Workflow Success: ${workflowSuccess}<br>
					• Scheduling Success: ${schedulingSuccess}<br>
					• Scheduling Status: ${schedulingData?.status || "Unknown"}<br>
					• Has Schedule Link: ${!!schedulingData?.scheduleLink}<br>
					• Message: ${schedulingData?.message || "No message"}<br>
					• Error: ${schedulingData?.error || "None"}
				`,
					schedulingSuccess ? "success" : "error"
				);
			}

			return result;
		} else {
			const errorText = await response.text();
			throw new Error(`HTTP ${response.status}: ${errorText}`);
		}
	}

	_buildSchedulingPayload(extractedData = null) {
		const data = extractedData || this._extractResponseData();

		return {
			// Basic info
			firstName: data.firstName,
			lastName: data.lastName,
			customerEmail: data.customerEmail,
			phoneNumber: data.phoneNumber,
			dateOfBirth: data.dateOfBirth,
			state: data.state,

			// Address fields required by Beluga
			address: data.address,
			city: data.city,
			zip: data.zip,
			sex: data.sex,

			// Quiz responses
			mainReasons: data.mainReasons,
			medicalConditions: data.medicalConditions,
			allResponses: this.responses,

			// Metadata
			workflowType: "scheduling",
			testMode: this.isTestMode,
			triggeredAt: new Date().toISOString(),
			quizId: this.quizData?.id || "dietitian-quiz",
			quizTitle: this.quizData?.title || "Find Your Perfect Dietitian"
		};
	}

	get isTestMode() {
		const testParam = new URLSearchParams(window.location.search).get("test");
		return testParam !== null && testParam !== "false";
	}

	// Debug method to manually test the enhanced notification system
	/**
	 * Test all notification types and colors to ensure proper functionality
	 */
	_testNotificationColors() {
		if (!this.notificationManager) {
			console.error("Notification manager not available for testing");
			return;
		}

		// Test all notification types with clear indicators
		const testNotifications = [
			{
				type: "success",
				priority: "success",
				message: "✅ SUCCESS Test: This should be GREEN",
				delay: 0
			},
			{
				type: "error",
				priority: "error",
				message: "❌ ERROR Test: This should be RED",
				delay: 500
			},
			{
				type: "warning",
				priority: "warning",
				message: "⚠️ WARNING Test: This should be YELLOW/ORANGE",
				delay: 1000
			},
			{
				type: "info",
				priority: "info",
				message: "ℹ️ INFO Test: This should be BLUE",
				delay: 1500
			},
			{
				type: "error",
				priority: "critical",
				message: "🚨 CRITICAL Test: This should be RED and PULSING",
				delay: 2000
			}
		];

		testNotifications.forEach(test => {
			setTimeout(() => {
				console.log(`Testing notification: ${test.type} / ${test.priority}`);
				this.notificationManager.show(test.message, test.type, test.priority);
			}, test.delay);
		});

		// Add a final summary notification
		setTimeout(() => {
			this.notificationManager.show("🎨 Color Test Complete<br><strong>Check above:</strong> Green=Success, Red=Error/Critical, Yellow=Warning, Blue=Info", "info", "info");
		}, 2500);
	}

	_testNotificationSystem() {
		console.log("🎯 Testing SMART notification system...");

		// Force create a questionContainer if it doesn't exist (for testing)
		if (!this.questionContainer) {
			console.log("🔧 Creating temporary questionContainer for testing");
			this.questionContainer = document.createElement("div");
			this.questionContainer.style.display = "none";
			document.body.appendChild(this.questionContainer);
		}

		// Test notifications that demonstrate the smart filtering/collapsing
		// Mix of simple and detailed notifications to show smart behavior

		console.log("📝 Creating test notifications...");

		// Simple notifications (no details to collapse)
		this._showBackgroundProcessNotification("Starting process...", "info");
		this._showBackgroundProcessNotification("Connected successfully", "success");
		this._showBackgroundProcessNotification("Authentication failed", "error");

		setTimeout(() => {
			// Detailed notifications (can be auto-collapsed)
			this._showBackgroundProcessNotification("Extraction Result<br>• Email: jane.humana@example.com<br>• Name: Jane Doe<br>• Missing fields: groupNumber", "info", "WARNING");

			this._showBackgroundProcessNotification("Processing Result<br>• Final status: ELIGIBLE<br>• Is eligible: true<br>• Has error: false", "info");

			this._showBackgroundProcessNotification(
				"Eligibility Result<br>✅ Status: ELIGIBLE<br>• Eligible: true<br>• Sessions: 10<br>• Message: Good news! Based on your insurance information, you are eligible for dietitian sessions.",
				"success"
			);
		}, 500);

		setTimeout(() => {
			// Critical notification (always stays expanded)
			this._showBackgroundProcessNotification("Critical system failure detected!<br>• Database: Offline<br>• Immediate action required<br>• Contact IT support", "error", "CRITICAL");
		}, 1000);

		setTimeout(() => {
			console.log("✅ Test complete! Enhanced notification system features:");
			console.log("   🔍 Filter buttons: Show only relevant notification types");
			console.log("   📦 Show All: Restores ALL notifications (even auto-removed ones)");
			console.log("   📱 Auto-collapse: Only affects detailed notifications");
			console.log("   ⚡ Simple notifications: Always visible (no collapse needed)");
			console.log("   🚨 Critical/Error: Always stay expanded");
			console.log("   🛡️ Smart prevention: Auto-removal disabled when 'Show All' is active");
			console.log("");
			console.log("🧪 Try filtering to 'Show All' to see all notifications restored!");
			console.log("   testNotifications() - Run this test again");
		}, 1500);
	}

	// =======================================================================
	// Enhanced Notification System for Workflow Reporting
	// =======================================================================

	/**
	 * Enhanced notification system for better workflow reporting
	 */
	_showWorkflowNotification(message, type = "info", priority = null, details = null) {
		if (!this.notificationManager) {
			console.warn("Notification manager not available");
			return;
		}

		// Build detailed message with context
		let fullMessage = message;
		if (details) {
			if (typeof details === "object") {
				// Create structured details
				const detailParts = [];
				if (details.step) detailParts.push(`Step: ${details.step}`);
				if (details.duration) detailParts.push(`Duration: ${details.duration}`);
				if (details.status) detailParts.push(`Status: ${details.status}`);
				if (details.data) detailParts.push(`Data: ${JSON.stringify(details.data, null, 2)}`);
				if (details.error) detailParts.push(`Error: ${details.error}`);
				if (details.url) detailParts.push(`URL: ${details.url}`);

				if (detailParts.length > 0) {
					fullMessage += `<br><strong>Details:</strong><br>${detailParts.join("<br>")}`;
				}
			} else {
				fullMessage += `<br><strong>Details:</strong> ${details}`;
			}
		}

		return this.notificationManager.show(fullMessage, type, priority);
	}

	/**
	 * Show workflow stage notification with proper colors and context
	 */
	_reportWorkflowStage(stage, status, details = null) {
		const stageConfig = {
			// Initialization stages
			WORKFLOW_INIT: {
				type: "info",
				priority: "info",
				emoji: "🚀",
				title: "Workflow Initialized"
			},
			PAYLOAD_BUILT: {
				type: "info",
				priority: "info",
				emoji: "📦",
				title: "Request Data Prepared"
			},

			// Network stages
			ORCHESTRATOR_CALL: {
				type: "info",
				priority: "info",
				emoji: "📡",
				title: "Contacting Workflow Service"
			},
			ORCHESTRATOR_SUCCESS: {
				type: "success",
				priority: "success",
				emoji: "✓",
				title: "Workflow Service Connected"
			},
			ORCHESTRATOR_ERROR: {
				type: "error",
				priority: "error",
				emoji: "❌",
				title: "Workflow Service Connection Failed"
			},

			// Status polling stages
			POLLING_START: {
				type: "info",
				priority: "info",
				emoji: "⏱️",
				title: "Status Tracking Started"
			},
			POLLING_UPDATE: {
				type: "info",
				priority: "info",
				emoji: "🔄",
				title: "Progress Update"
			},
			POLLING_WARNING: {
				type: "warning",
				priority: "warning",
				emoji: "⚠️",
				title: "Polling Warning"
			},
			POLLING_ERROR: {
				type: "error",
				priority: "error",
				emoji: "🚨",
				title: "Status Polling Error"
			},

			// Eligibility stages
			ELIGIBILITY_START: {
				type: "info",
				priority: "info",
				emoji: "🏥",
				title: "Insurance Check Starting"
			},
			ELIGIBILITY_SUCCESS: {
				type: "success",
				priority: "success",
				emoji: "✅",
				title: "Insurance Verified Successfully"
			},
			ELIGIBILITY_ERROR: {
				type: "error",
				priority: "error",
				emoji: "⛔",
				title: "Insurance Verification Failed"
			},
			ELIGIBILITY_TIMEOUT: {
				type: "warning",
				priority: "warning",
				emoji: "⏰",
				title: "Insurance Check Timeout"
			},

			// User creation stages
			USER_CREATION_START: {
				type: "info",
				priority: "info",
				emoji: "👤",
				title: "Creating User Account"
			},
			USER_CREATION_SUCCESS: {
				type: "success",
				priority: "success",
				emoji: "👍",
				title: "User Account Created"
			},
			USER_CREATION_ERROR: {
				type: "error",
				priority: "error",
				emoji: "👎",
				title: "User Account Creation Failed"
			},

			// Scheduling stages
			SCHEDULING_START: {
				type: "info",
				priority: "info",
				emoji: "📅",
				title: "Appointment Scheduling Starting"
			},
			SCHEDULING_SUCCESS: {
				type: "success",
				priority: "success",
				emoji: "🎯",
				title: "Appointment Scheduled Successfully"
			},
			SCHEDULING_ERROR: {
				type: "error",
				priority: "error",
				emoji: "📅❌",
				title: "Appointment Scheduling Failed"
			},

			// Fallback and emergency stages
			FALLBACK_TRIGGERED: {
				type: "warning",
				priority: "warning",
				emoji: "🔄",
				title: "Fallback Check Triggered"
			},
			EMERGENCY_FALLBACK: {
				type: "warning",
				priority: "critical",
				emoji: "🚨",
				title: "Emergency Fallback Activated"
			},
			STALE_STATUS: {
				type: "warning",
				priority: "warning",
				emoji: "⚡",
				title: "Stale Status Detected"
			},

			// Completion stages
			WORKFLOW_COMPLETE: {
				type: "success",
				priority: "success",
				emoji: "🎉",
				title: "Workflow Completed Successfully"
			},
			WORKFLOW_FAILED: {
				type: "error",
				priority: "critical",
				emoji: "💥",
				title: "Workflow Failed"
			}
		};

		const config = stageConfig[stage] || {
			type: "info",
			priority: "info",
			emoji: "📋",
			title: "Workflow Update"
		};

		const message = `${config.emoji} ${config.title}: ${status}`;

		return this._showWorkflowNotification(message, config.type, config.priority, details);
	}

	/**
	 * Enhanced error reporting with proper types and detailed context
	 */
	_reportWorkflowError(error, context = {}) {
		let errorType = "error";
		let priority = "error";
		let emoji = "❌";
		let title = "Workflow Error";

		// Determine error severity and type
		if (error.message?.includes("timeout") || error.code === "ECONNABORTED") {
			errorType = "warning";
			priority = "warning";
			emoji = "⏰";
			title = "Request Timeout";
		} else if (error.message?.includes("network") || error.message?.includes("fetch")) {
			errorType = "error";
			priority = "error";
			emoji = "🌐";
			title = "Network Error";
		} else if (error.status >= 500) {
			errorType = "error";
			priority = "critical";
			emoji = "🚨";
			title = "Server Error";
		} else if (error.status >= 400 && error.status < 500) {
			errorType = "warning";
			priority = "warning";
			emoji = "⚠️";
			title = "Request Error";
		}

		const errorMessage = error.message || error.error || "Unknown error occurred";
		const message = `${emoji} ${title}: ${errorMessage}`;

		const details = {
			...context,
			status: error.status,
			code: error.code,
			url: error.url,
			timestamp: new Date().toISOString()
		};

		return this._showWorkflowNotification(message, errorType, priority, details);
	}

	_showBackgroundProcessNotification(text, type = "info", priority = null) {
		console.log("📢 Creating notification:", { text: text.substring(0, 50) + "...", type, priority });

		// Only show notifications if we have a container
		if (!this.questionContainer) {
			console.log("❌ No questionContainer found, skipping notification");
			return;
		}

		// Delegate completely to the modular notification system
		return this.notificationManager.show(text, type, priority);
	}
}

document.addEventListener("DOMContentLoaded", () => {
	const quiz = new ModularQuiz();
	window.productQuiz = quiz;

	// Global test function for debugging notifications
	window.testNotifications = () => {
		if (window.productQuiz && window.productQuiz._testNotificationSystem) {
			window.productQuiz._testNotificationSystem();
		} else {
			console.error("Quiz not initialized or test method not available");
		}
	};
});
