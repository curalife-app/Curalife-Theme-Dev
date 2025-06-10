/**
 * Modular Quiz System for Shopify
 */

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
		this.loadingInterval = null;

		// New state for background processing
		this.eligibilityWorkflowPromise = null;
		this.eligibilityWorkflowResult = null;
		this.eligibilityWorkflowError = null;
		this.userCreationWorkflowPromise = null;

		this.init();
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

	_showBackgroundProcessNotification(text, type = "info") {
		// Only show notifications if we have a container
		if (!this.questionContainer) return;

		// Create or get notification container
		let notificationContainer = document.querySelector(".quiz-background-notifications");
		if (!notificationContainer) {
			notificationContainer = document.createElement("div");
			notificationContainer.className = "quiz-background-notifications";
			notificationContainer.style.cssText = `
				position: fixed;
				top: 20px;
				right: 20px;
				z-index: 1000;
				max-width: 400px;
				pointer-events: none;
			`;
			document.body.appendChild(notificationContainer);
		}

		// Create notification element
		const notification = document.createElement("div");
		notification.className = `quiz-notification quiz-notification-${type}`;
		notification.style.cssText = `
			background: ${type === "success" ? "#10b981" : type === "error" ? "#ef4444" : "#3b82f6"};
			color: white;
			padding: 12px 16px;
			margin-bottom: 8px;
			border-radius: 8px;
			box-shadow: 0 4px 12px rgba(0,0,0,0.15);
			font-size: 14px;
			line-height: 1.4;
			opacity: 0;
			transform: translateX(100%);
			transition: all 0.3s ease;
			pointer-events: auto;
			cursor: pointer;
		`;
		notification.innerHTML = text;

		// Add click to dismiss
		notification.addEventListener("click", () => {
			notification.style.opacity = "0";
			notification.style.transform = "translateX(100%)";
			setTimeout(() => notification.remove(), 300);
		});

		notificationContainer.appendChild(notification);

		// Animate in
		setTimeout(() => {
			notification.style.opacity = "1";
			notification.style.transform = "translateX(0)";
		}, 100);

		// Auto remove after delay (except for persistent test mode notifications)
		if (!text.includes("TEST MODE")) {
			setTimeout(
				() => {
					if (notification.parentNode) {
						notification.style.opacity = "0";
						notification.style.transform = "translateX(100%)";
						setTimeout(() => notification.remove(), 300);
					}
				},
				type === "error" ? 8000 : 4000
			);
		}
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
				this._triggerEligibilityWorkflow();
			}

			// Check if this is the contact step completion
			if (currentStep.id === "step-contact") {
				// Trigger eligibility workflow now that we have all required data
				this._triggerUserCreationWorkflow();
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

	async finishQuiz() {
		const resultUrl = this.container.getAttribute("data-result-url") || this.container.getAttribute("data-booking-url") || "/quiz-complete";

		try {
			this.submitting = true;
			this.nextButton.disabled = true;

			this._toggleElement(this.navigationButtons, false);
			this._toggleElement(this.progressSection, false);

			// Start the comprehensive loading sequence
			await this._showComprehensiveLoadingSequence();

			// Check if eligibility workflow is complete
			let eligibilityResult = null;
			if (this.eligibilityWorkflowPromise) {
				if (this.eligibilityWorkflowResult) {
					// Already completed
					eligibilityResult = this.eligibilityWorkflowResult;
					console.log("Using cached eligibility result:", eligibilityResult);
				} else {
					// Still running - wait for it
					try {
						eligibilityResult = await this.eligibilityWorkflowPromise;
						console.log("Waited for eligibility result:", eligibilityResult);
					} catch (error) {
						console.error("Eligibility workflow failed:", error);
						eligibilityResult = this._createErrorEligibilityData("Eligibility check failed");
					}
				}
			} else {
				// No eligibility check was triggered - use default processing status
				eligibilityResult = this._createProcessingEligibilityData();
				console.log("No eligibility workflow, using processing status");
			}

			// Process the result consistently
			let finalResult;
			if (eligibilityResult) {
				// Check if this is already processed eligibility data or a raw webhook response
				if (eligibilityResult.eligibilityStatus && typeof eligibilityResult.eligibilityStatus === "string") {
					// This is already processed eligibility data - use it directly
					finalResult = eligibilityResult;
					console.log("Using eligibility result directly (already processed):", finalResult);
				} else {
					// This is a raw webhook response - process it
					finalResult = this._processWebhookResult(eligibilityResult);
					console.log("Processed webhook result:", finalResult);
				}
			} else {
				// No eligibility check was run - use default processing status
				finalResult = this._createProcessingEligibilityData();
				console.log("No eligibility result, using processing status");
			}

			console.log("Processing eligibility result in finishQuiz:", {
				eligibilityResult: finalResult,
				hasError: !!finalResult?.error,
				status: finalResult?.eligibilityStatus,
				isEligible: finalResult?.isEligible
			});

			// Test mode comprehensive finish notification
			if (this.isTestMode) {
				const workflowStatus = this.eligibilityWorkflowPromise ? (this.eligibilityWorkflowResult ? "✅ Completed" : "⏳ In Progress") : "❌ Not Started";

				const userCreationStatus = this.userCreationWorkflowPromise ? "✅ Started" : "❌ Not Started";

				this._showBackgroundProcessNotification(
					`
					🧪 TEST MODE - Quiz Completion Status<br>
					• Eligibility Workflow: ${workflowStatus}<br>
					• User Creation: ${userCreationStatus}<br>
					• Final Status: ${finalResult?.eligibilityStatus || "Unknown"}<br>
					• Is Eligible: ${finalResult?.isEligible}<br>
					• Result URL: ${resultUrl}<br>
					• Total Responses: ${this.responses?.length || 0}
				`,
					"info"
				);
			}

			console.log("Showing results with data:", {
				resultData: finalResult,
				eligibilityStatus: finalResult?.eligibilityStatus,
				webhookSuccess: true
			});

			this.showResults(resultUrl, true, finalResult);
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

			this.showResults(resultUrl, false, null, error.message);
		}
	}

	// Comprehensive loading sequence with animated status updates
	async _showComprehensiveLoadingSequence() {
		// Show the loading screen with progress steps
		this._showLoadingScreen();

		const loadingSteps = [
			{ title: "Processing Your Answers", description: "Analyzing your health information..." },
			{ title: "Checking Insurance Coverage", description: "Verifying your benefits..." },
			{ title: "Finding Your Dietitian", description: "Matching you with the right expert..." },
			{ title: "Preparing Your Results", description: "Finalizing your personalized plan..." }
		];

		for (let i = 0; i < loadingSteps.length; i++) {
			const step = loadingSteps[i];
			this._updateLoadingStep(step);

			// Wait between steps for realistic loading feel
			await new Promise(resolve => setTimeout(resolve, 900));
		}

		// Final completion step
		this._updateLoadingStep({ title: "Almost Ready!", description: "Preparing your personalized results..." });

		// Final wait before showing results
		await new Promise(resolve => setTimeout(resolve, 800));
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

	_triggerEligibilityWorkflow() {
		try {
			const eligibilityPayload = this._buildEligibilityPayload();
			let webhookUrl = this.container.getAttribute("data-webhook-url") || this.quizData.config?.webhookUrl;

			// Use test webhook URL when in test mode
			if (this.isTestMode) {
				const testWebhookUrl =
					this.container.getAttribute("data-test-webhook-url") || (webhookUrl ? webhookUrl.replace(/\/[^\/]*$/, "/test-eligibility") : null) || this.quizData.config?.testWebhookUrl;

				if (testWebhookUrl) {
					webhookUrl = testWebhookUrl;
					console.log("🧪 Test mode detected - using test webhook URL:", webhookUrl);
				} else {
					console.log("🧪 Test mode detected but no test webhook URL configured - using production URL with test mode indicator");
					// Add test mode indicator to payload for the workflow to handle
					eligibilityPayload.testMode = true;
				}
			}

			if (webhookUrl) {
				console.log("🔍 Starting eligibility check in background...", {
					firstName: eligibilityPayload.firstName,
					lastName: eligibilityPayload.lastName,
					insurance: eligibilityPayload.insurance,
					insuranceMemberId: eligibilityPayload.insuranceMemberId,
					testMode: this.isTestMode,
					fullPayload: eligibilityPayload
				});

				// Show notifications
				this._showBackgroundProcessNotification("🔍 Checking your insurance coverage in the background...");

				// Test mode detailed notification
				if (this.isTestMode) {
					this._showBackgroundProcessNotification(
						`
						🧪 TEST MODE - Eligibility Workflow Started<br>
						• URL: ${webhookUrl}<br>
						• Name: ${eligibilityPayload.firstName} ${eligibilityPayload.lastName}<br>
						• Insurance: ${eligibilityPayload.insurance}<br>
						• Member ID: ${eligibilityPayload.insuranceMemberId}<br>
						• Responses: ${this.responses?.length || 0} collected
					`,
						"info"
					);
				}

				this.eligibilityWorkflowPromise = this._submitEligibilityToWebhook(webhookUrl, eligibilityPayload);

				// Handle completion in background
				this.eligibilityWorkflowPromise
					.then(result => {
						console.log("✅ Eligibility check completed in background", {
							success: result?.success,
							eligibilityStatus: result?.eligibilityStatus,
							isEligible: result?.isEligible
						});
						this.eligibilityWorkflowResult = result;

						const statusIcon = result?.eligibilityStatus === "AAA_ERROR" ? "⚠️" : result?.eligibilityStatus === "ELIGIBLE" ? "✅" : result?.eligibilityStatus === "NOT_COVERED" ? "❌" : "⏳";

						this._showBackgroundProcessNotification("✅ Insurance coverage check complete!", "success");

						// Test mode detailed result notification
						if (this.isTestMode) {
							this._showBackgroundProcessNotification(
								`
								🧪 TEST MODE - Eligibility Result<br>
								${statusIcon} Status: ${result?.eligibilityStatus || "Unknown"}<br>
								• Eligible: ${result?.isEligible}<br>
								• Sessions: ${result?.sessionsCovered || 0}<br>
								• Error Code: ${result?.error?.code || result?.aaaErrorCode || "None"}<br>
								• Message: ${(result?.userMessage || "").substring(0, 100)}${result?.userMessage?.length > 100 ? "..." : ""}
							`,
								result?.eligibilityStatus === "AAA_ERROR" ? "error" : "success"
							);
						}
					})
					.catch(error => {
						console.error("❌ Eligibility check failed in background", error);
						this.eligibilityWorkflowError = error;

						this._showBackgroundProcessNotification("❌ Eligibility check failed", "error");

						// Test mode error notification
						if (this.isTestMode) {
							this._showBackgroundProcessNotification(
								`
								🧪 TEST MODE - Eligibility Error<br>
								❌ ${error.message}<br>
								• Check console for details
							`,
								"error"
							);
						}
					});
			} else {
				console.warn("No webhook URL configured for eligibility check");
				if (this.isTestMode) {
					this._showBackgroundProcessNotification(
						`
						🧪 TEST MODE - Configuration Error<br>
						❌ No webhook URL found<br>
						• Check data-webhook-url attribute
					`,
						"error"
					);
				}
			}
		} catch (error) {
			console.error("Failed to trigger eligibility workflow:", error);
			if (this.isTestMode) {
				this._showBackgroundProcessNotification(
					`
					🧪 TEST MODE - Trigger Error<br>
					❌ ${error.message}
				`,
					"error"
				);
			}
		}
	}

	_triggerUserCreationWorkflow() {
		try {
			// Wait for eligibility to complete before starting user creation
			// This maintains the dependency while still being non-blocking for UI
			if (this.eligibilityWorkflowPromise) {
				this.eligibilityWorkflowPromise
					.then(eligibilityResult => {
						this._startUserCreationWithEligibilityData(eligibilityResult);
					})
					.catch(error => {
						console.error("❌ Eligibility failed, starting user creation without eligibility data", error);
						this._startUserCreationWithEligibilityData(null);
					});
			} else {
				// No eligibility workflow running, start user creation without eligibility data
				this._startUserCreationWithEligibilityData(null);
			}
		} catch (error) {
			console.error("Failed to trigger user creation workflow:", error);
		}
	}

	_startUserCreationWithEligibilityData(eligibilityData) {
		try {
			const userPayload = this._buildUserCreationPayload(eligibilityData);
			const userCreationUrl =
				this.container.getAttribute("data-user-creation-url") ||
				(this.container.getAttribute("data-webhook-url") && this.container.getAttribute("data-webhook-url").replace("/eligibility", "/user-creation"));

			if (userCreationUrl) {
				console.log("👤 Starting user creation with eligibility data...", {
					hasEligibilityData: !!eligibilityData,
					eligibilityStatus: eligibilityData?.eligibilityStatus || "none"
				});

				// Test mode detailed notification
				if (this.isTestMode) {
					this._showBackgroundProcessNotification(
						`
						🧪 TEST MODE - User Creation Started<br>
						• URL: ${userCreationUrl}<br>
						• Customer: ${userPayload.customerEmail}<br>
						• Eligibility Status: ${eligibilityData?.eligibilityStatus || "None"}<br>
						• Payload Size: ${JSON.stringify(userPayload).length} chars<br>
						• All Responses: ${userPayload.allResponses?.length || 0} items
					`,
						"info"
					);
				}

				this.userCreationWorkflowPromise = this._submitUserCreationToWebhook(userCreationUrl, userPayload);

				// Handle completion in background (optional - doesn't block UI)
				this.userCreationWorkflowPromise
					.then(result => {
						console.log("✅ User creation completed in background", result);

						// Test mode detailed result notification
						if (this.isTestMode) {
							const success = result?.success;
							const shopifyId = result?.body?.shopifyCustomerId || result?.shopifyCustomerId;
							const hubspotId = result?.body?.hubspotContactId || result?.hubspotContactId;

							this._showBackgroundProcessNotification(
								`
								🧪 TEST MODE - User Creation Result<br>
								${success ? "✅" : "❌"} Success: ${success}<br>
								• Shopify ID: ${shopifyId || "Not created"}<br>
								• HubSpot ID: ${hubspotId || "Not created"}<br>
								• Execution: ${result?.executionName ? "✅ Complete" : "❌ Failed"}<br>
								• Status Code: ${result?.statusCode || "Unknown"}
							`,
								success ? "success" : "error"
							);
						}
					})
					.catch(error => {
						console.error("❌ User creation failed in background", error);

						// Test mode error notification
						if (this.isTestMode) {
							const commonIssues = [];

							// Analyze common error causes
							if (error.status === 500) {
								// Parse the error text to understand the root cause
								if (error.message.includes("409") || error.message.includes("CONFLICT")) {
									commonIssues.push("🔄 HubSpot Contact Already Exists");
									commonIssues.push("• This is expected when re-running the quiz");
									commonIssues.push("• The workflow has handling for this (lines 355-380)");
									commonIssues.push("• Issue: Error thrown before handling logic");
									commonIssues.push("• Fix: Modify workflow to catch HTTP 409 properly");
									commonIssues.push("• Current: Error in 'createHubSpotContact' step");
									commonIssues.push("• Solution: Add try/except around HTTP call");
								} else if (error.message.includes("Shopify")) {
									commonIssues.push("🛒 Shopify API Issue");
									commonIssues.push("• Check Shopify customer creation");
									commonIssues.push("• Verify API permissions");
								} else if (error.message.includes("HTTP server responded with error code")) {
									const httpCode = error.message.match(/error code (\d+)/)?.[1];
									commonIssues.push(`🌐 HTTP Error ${httpCode || "Unknown"}`);
									commonIssues.push("• External API call failed");
									commonIssues.push("• Check API credentials and endpoints");
								} else {
									commonIssues.push("• Server-side workflow execution error");

									// Check for potential data issues
									if (!userPayload.customerEmail?.includes("@")) {
										commonIssues.push("• Invalid email format in payload");
									}
									if (!userPayload.allResponses || userPayload.allResponses.length === 0) {
										commonIssues.push("• Missing allResponses array");
									}
									if (!userPayload.eligibilityData) {
										commonIssues.push("• Missing eligibilityData object");
									}
								}

								commonIssues.push("• Check Google Cloud Function logs");
								commonIssues.push("• Check user creation workflow YAML");
							}

							// Determine notification type based on error severity
							const notificationType = error.message.includes("CONFLICT") || error.message.includes("409") ? "info" : "error";
							const statusIcon = notificationType === "info" ? "🔄" : "❌";

							this._showBackgroundProcessNotification(
								`
								🧪 TEST MODE - User Creation Analysis<br>
								${statusIcon} ${response.status} ${response.statusText}<br>
								• Error: ${errorText.substring(0, 300)}${errorText.length > 300 ? "..." : ""}<br>
								<br>Analysis:<br>
								${commonIssues.join("<br>")}
							`,
								notificationType
							);
						}
					});
			} else {
				console.warn("No user creation URL configured");
				if (this.isTestMode) {
					this._showBackgroundProcessNotification(
						`
							🧪 TEST MODE - User Creation Config Error<br>
							❌ No user creation URL found<br>
							• Check data-user-creation-url attribute
						`,
						"error"
					);
				}
			}
		} catch (error) {
			console.error("Failed to start user creation with eligibility data:", error);
			if (this.isTestMode) {
				this._showBackgroundProcessNotification(
					`
					🧪 TEST MODE - User Creation Trigger Error<br>
					❌ ${error.message}
				`,
					"error"
				);
			}
		}
	}

	_buildEligibilityPayload() {
		const extractedData = this._extractResponseData();

		console.log("Building eligibility payload with extracted data:", {
			extractedData,
			responsesCount: this.responses?.length || 0,
			responses: this.responses
		});

		return {
			quizId: this.quizData.id,
			quizTitle: this.quizData.title,
			workflowType: "eligibility",
			triggeredAt: new Date().toISOString(),
			// Only include data needed for eligibility
			customerEmail: extractedData.customerEmail,
			firstName: extractedData.firstName,
			lastName: extractedData.lastName,
			phoneNumber: extractedData.phoneNumber,
			state: extractedData.state,
			insurance: extractedData.insurance,
			insurancePrimaryPayerId: extractedData.insurancePrimaryPayerId,
			insuranceMemberId: extractedData.insuranceMemberId,
			groupNumber: extractedData.groupNumber,
			dateOfBirth: extractedData.dateOfBirth,
			mainReasons: extractedData.mainReasons,
			medicalConditions: extractedData.medicalConditions
		};
	}

	_buildUserCreationPayload(eligibilityData = null) {
		const extractedData = this._extractResponseData();
		const allResponses =
			this.responses?.map(response => ({
				questionId: response.questionId,
				answer: response.answer,
				value: response.answer
			})) || [];

		const payload = {
			...this._buildSubmissionPayload(),
			...extractedData,
			allResponses,
			eligibilityData: eligibilityData || this._createProcessingEligibilityData(),
			completedAt: new Date().toISOString(),
			workflowType: "user_creation"
		};

		// Test mode payload validation
		if (this.isTestMode) {
			const issues = [];

			// Check required fields
			if (!payload.customerEmail || !payload.customerEmail.includes("@")) {
				issues.push("❌ Invalid email");
			}
			if (!payload.firstName) issues.push("❌ Missing firstName");
			if (!payload.lastName) issues.push("❌ Missing lastName");
			if (!payload.quizId) issues.push("❌ Missing quizId");

			// Check payload structure
			if (!Array.isArray(payload.allResponses)) {
				issues.push("❌ allResponses not array");
			}
			if (!payload.eligibilityData || typeof payload.eligibilityData !== "object") {
				issues.push("❌ Invalid eligibilityData");
			}

			// Check for invalid characters that might cause JSON issues
			const jsonString = JSON.stringify(payload);
			if (jsonString.includes("\u0000")) {
				issues.push("❌ Contains null characters");
			}

			this._showBackgroundProcessNotification(
				`
				🧪 TEST MODE - User Creation Payload Validation<br>
				• Total size: ${jsonString.length} chars<br>
				• Email: ${payload.customerEmail}<br>
				• Name: ${payload.firstName} ${payload.lastName}<br>
				• Responses: ${payload.allResponses?.length || 0} items<br>
				• Eligibility Status: ${payload.eligibilityData?.eligibilityStatus}<br>
				${issues.length > 0 ? `• Issues: ${issues.join(", ")}` : "• ✅ All validations passed"}
			`,
				issues.length > 0 ? "error" : "info"
			);
		}

		return payload;
	}

	_buildSubmissionPayload() {
		const extractedData = this._extractResponseData();

		return {
			quizId: this.quizData.id,
			quizTitle: this.quizData.title,
			completedAt: new Date().toISOString(),
			...extractedData,
			allResponses: this.responses.map(r => ({
				stepId: r.stepId,
				questionId: r.questionId,
				answer: r.answer
			}))
		};
	}

	_extractResponseData() {
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
			q2: "medicalConditions"
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
			consent: true
		};

		const dobParts = {};

		console.log("Extracting response data from responses:", this.responses);

		// Test mode detailed extraction notification
		if (this.isTestMode) {
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

		// Test mode extraction result notification
		if (this.isTestMode) {
			const missingFields = Object.entries(data)
				.filter(([key, value]) => !value && !["mainReasons", "medicalConditions", "consent"].includes(key))
				.map(([key]) => key);

			this._showBackgroundProcessNotification(
				`
				🧪 TEST MODE - Extraction Result<br>
				• Email: ${data.customerEmail || "❌ Missing"}<br>
				• Name: ${data.firstName} ${data.lastName}<br>
				• Insurance: ${data.insurance || "❌ Missing"}<br>
				• Member ID: ${data.insuranceMemberId || "❌ Missing"}<br>
				• Missing fields: ${missingFields.length ? missingFields.join(", ") : "None"}
			`,
				missingFields.length > 0 ? "error" : "success"
			);
		}

		return data;
	}

	async _submitEligibilityToWebhook(webhookUrl, payload) {
		try {
			console.log("Submitting eligibility payload to webhook:", {
				url: webhookUrl,
				payload
			});

			// Test mode notification
			if (this.isTestMode) {
				this._showBackgroundProcessNotification(
					`
					🧪 TEST MODE - Sending Eligibility Request<br>
					• Payload keys: ${Object.keys(payload).join(", ")}<br>
					• Request timeout: 45s
				`,
					"info"
				);
			}

			const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Eligibility request timed out")), 45000));

			const fetchPromise = fetch(webhookUrl, {
				method: "POST",
				mode: "cors",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					"X-Workflow-Type": "eligibility"
				},
				body: JSON.stringify(payload)
			});

			const response = await Promise.race([fetchPromise, timeoutPromise]);

			console.log("Raw webhook response:", {
				ok: response.ok,
				status: response.status,
				statusText: response.statusText,
				headers: Object.fromEntries(response.headers.entries())
			});

			if (response.ok) {
				const result = await response.json();
				console.log("Parsed webhook response:", result);

				// Test mode response structure notification
				if (this.isTestMode) {
					const hasBody = "body" in result;
					const hasEligibilityData = result?.eligibilityData || result?.body?.eligibilityData;
					const status = hasEligibilityData ? (hasBody ? result.body.eligibilityData.eligibilityStatus : result.eligibilityData.eligibilityStatus) : "No eligibility data";

					this._showBackgroundProcessNotification(
						`
						🧪 TEST MODE - Response Structure<br>
						• Status: ${response.status} ${response.statusText}<br>
						• Has body: ${hasBody}<br>
						• Has eligibilityData: ${!!hasEligibilityData}<br>
						• Eligibility Status: ${status}<br>
						• Top-level keys: ${Object.keys(result).join(", ")}
					`,
						"info"
					);
				}

				const processedResult = this._processWebhookResult(result);
				console.log("Processed webhook result:", processedResult);

				// Test mode processing result notification
				if (this.isTestMode) {
					this._showBackgroundProcessNotification(
						`
						🧪 TEST MODE - Processing Result<br>
						• Final status: ${processedResult?.eligibilityStatus || "Unknown"}<br>
						• Is eligible: ${processedResult?.isEligible}<br>
						• Has error: ${!!processedResult?.error}<br>
						• Error code: ${processedResult?.error?.code || processedResult?.aaaErrorCode || "None"}
					`,
						processedResult?.eligibilityStatus === "AAA_ERROR" ? "error" : "info"
					);
				}

				return processedResult;
			} else {
				console.error("Webhook request failed:", response.status, response.statusText);

				if (this.isTestMode) {
					this._showBackgroundProcessNotification(
						`
						🧪 TEST MODE - HTTP Error<br>
						❌ ${response.status} ${response.statusText}<br>
						• Check server logs for details
					`,
						"error"
					);
				}

				throw new Error(`Eligibility server returned status ${response.status}`);
			}
		} catch (error) {
			console.error("Webhook submission error:", error);

			if (this.isTestMode) {
				this._showBackgroundProcessNotification(
					`
					🧪 TEST MODE - Request Failed<br>
					❌ ${error.message}<br>
					• Network or timeout issue
				`,
					"error"
				);
			}

			const errorMessages = this.quizData.ui?.errorMessages || {};
			return this._createErrorEligibilityData(
				error.message.includes("timeout") ? errorMessages.networkError || "Eligibility check timed out" : errorMessages.serverError || "Eligibility server error"
			);
		}
	}

	async _submitUserCreationToWebhook(webhookUrl, payload) {
		try {
			console.log("Submitting user creation payload to webhook:", {
				url: webhookUrl,
				payloadKeys: Object.keys(payload),
				payloadSize: JSON.stringify(payload).length
			});

			// Test mode notification
			if (this.isTestMode) {
				this._showBackgroundProcessNotification(
					`
					🧪 TEST MODE - Sending User Creation Request<br>
					• URL: ${webhookUrl}<br>
					• Payload size: ${JSON.stringify(payload).length} chars<br>
					• Customer: ${payload.customerEmail}<br>
					• Has eligibility data: ${!!payload.eligibilityData}
				`,
					"info"
				);
			}

			const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("User creation request timed out")), 45000));

			const fetchPromise = fetch(webhookUrl, {
				method: "POST",
				mode: "cors",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					"X-Workflow-Type": "user_creation"
				},
				body: JSON.stringify(payload)
			});

			const response = await Promise.race([fetchPromise, timeoutPromise]);

			console.log("User creation webhook response:", {
				ok: response.ok,
				status: response.status,
				statusText: response.statusText,
				headers: Object.fromEntries(response.headers.entries())
			});

			if (response.ok) {
				const result = await response.json();
				console.log("User creation webhook success:", result);

				// Test mode success notification
				if (this.isTestMode) {
					const success = result?.success;
					const shopifyId = result?.body?.shopifyCustomerId || result?.shopifyCustomerId;
					const hubspotId = result?.body?.hubspotContactId || result?.hubspotContactId;

					this._showBackgroundProcessNotification(
						`
						🧪 TEST MODE - User Creation Success<br>
						✅ Status: ${response.status}<br>
						• Success: ${success}<br>
						• Shopify ID: ${shopifyId || "Not created"}<br>
						• HubSpot ID: ${hubspotId || "Not created"}
					`,
						"success"
					);
				}

				return result;
			} else {
				// Enhanced error handling for server errors
				let errorBody = null;
				let errorText = "";

				try {
					// Try to get the error response body
					errorBody = await response.json();
					errorText = errorBody?.error || errorBody?.message || JSON.stringify(errorBody);
				} catch (e) {
					// If JSON parsing fails, try to get text
					try {
						errorText = await response.text();
					} catch (e2) {
						errorText = `HTTP ${response.status} ${response.statusText}`;
					}
				}

				console.error("User creation webhook error details:", {
					status: response.status,
					statusText: response.statusText,
					errorBody,
					errorText
				});

				// Test mode detailed error notification
				if (this.isTestMode) {
					const commonIssues = [];

					// Analyze common 500 error causes
					if (response.status === 500) {
						commonIssues.push("• Server-side workflow execution error");

						// Check for potential data issues
						if (!payload.customerEmail?.includes("@")) {
							commonIssues.push("• Invalid email format in payload");
						}
						if (!payload.allResponses || payload.allResponses.length === 0) {
							commonIssues.push("• Missing allResponses array");
						}
						if (!payload.eligibilityData) {
							commonIssues.push("• Missing eligibilityData object");
						}

						commonIssues.push("• Check Google Cloud Function logs");
						commonIssues.push("• Check user creation workflow YAML");
					}

					this._showBackgroundProcessNotification(
						`
						🧪 TEST MODE - User Creation Server Error<br>
						❌ ${response.status} ${response.statusText}<br>
						• Error: ${errorText.substring(0, 200)}${errorText.length > 200 ? "..." : ""}<br>
						<br>Potential causes:<br>
						${commonIssues.join("<br>")}
					`,
						"error"
					);
				}

				throw new Error(`User creation server returned status ${response.status}: ${errorText}`);
			}
		} catch (error) {
			console.error("User creation webhook error:", error);

			// Test mode error notification
			if (this.isTestMode) {
				this._showBackgroundProcessNotification(
					`
					🧪 TEST MODE - User Creation Request Error<br>
					❌ ${error.message}<br>
					• Check network and server status
				`,
					"error"
				);
			}

			throw error;
		}
	}

	async _submitToWebhook(webhookUrl, payload) {
		// This method is deprecated - use specific webhook methods instead
		console.warn("_submitToWebhook is deprecated. Use _submitEligibilityToWebhook or _submitUserCreationToWebhook instead.");
		throw new Error("Method deprecated");
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

	_generateEligibleInsuranceResultsHTML(eligibilityData, resultUrl) {
		const messages = this.quizData.ui?.resultMessages?.eligible || {};
		const sessionsCovered = parseInt(eligibilityData.sessionsCovered || "0", 10);
		const copay = eligibilityData.copay || 0;

		let coverageExpiry = "Dec 31, 2025";
		if (eligibilityData.planEnd) {
			const endDate = eligibilityData.planEnd;
			if (endDate.length === 8) {
				const year = endDate.substring(0, 4);
				const month = endDate.substring(4, 6);
				const day = endDate.substring(6, 8);
				const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
				coverageExpiry = `${monthNames[parseInt(month)]} ${parseInt(day)}, ${year}`;
			}
		}

		return `
			<div class="quiz-results-container">
				<div class="quiz-results-header">
                    <h2 class="quiz-results-title">${messages.title || "Great news! You're covered"}</h2>
                    <p class="quiz-results-subtitle">${messages.subtitle || "Your insurance covers your consultations"}</p>
				</div>
				<div class="quiz-coverage-card">
					<h3 class="quiz-coverage-card-title">Here's Your Offer</h3>
					<div class="quiz-coverage-pricing">
						<div class="quiz-coverage-service-item">
							<div class="quiz-coverage-service">Initial consultation – 60 minutes</div>
							<div class="quiz-coverage-cost">
								<span class="quiz-coverage-copay">Co-pay: $${copay}*</span>
								<span class="quiz-coverage-original-price">$100</span>
							</div>
						</div>
						<div class="quiz-coverage-service-item">
							<div class="quiz-coverage-service">Follow-up consultation – 30 minutes</div>
							<div class="quiz-coverage-cost">
								<span class="quiz-coverage-copay">Co-pay: $${copay}*</span>
								<span class="quiz-coverage-original-price">$50</span>
							</div>
						</div>
					</div>
					<div class="quiz-coverage-divider"></div>
					<div class="quiz-coverage-benefits">
						<div class="quiz-coverage-benefit">
							<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
								<path d="M10.4163 1.66663H7.08301L7.49967 2.49996H9.99967L10.4163 1.66663Z" stroke="#418865" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
								<path d="M14.1663 14.1666V17.0833C14.1663 17.7736 13.6067 18.3333 12.9163 18.3333H4.58301C3.89265 18.3333 3.33301 17.7736 3.33301 17.0833V2.91663C3.33301 2.22627 3.89265 1.66663 4.58301 1.66663H12.9163C13.6067 1.66663 14.1663 2.22627 14.1663 2.91663V5.83329" stroke="#418865" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
								<path d="M10 10.4167L12.0833 12.5L16.6667 7.5" stroke="#418865" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
							</svg>
							<span class="quiz-coverage-benefit-text">${sessionsCovered} covered sessions remaining</span>
						</div>
						<div class="quiz-coverage-benefit">
							<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
								<path d="M15.2223 15.5842L14.1663 15V13.5556M17.4997 15C17.4997 16.8409 16.0073 18.3333 14.1663 18.3333C12.3254 18.3333 10.833 16.8409 10.833 15C10.833 13.159 12.3254 11.6666 14.1663 11.6666C16.0073 11.6666 17.4997 13.159 17.4997 15Z" stroke="#418865" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
								<path d="M13.75 1.66663V4.99996M6.25 1.66663V4.99996" stroke="#418865" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
								<path d="M17.5 10V5.00004C17.5 4.07957 16.7538 3.33337 15.8333 3.33337H4.16667C3.24619 3.33337 2.5 4.07957 2.5 5.00004V16.6667C2.5 17.5872 3.24619 18.3334 4.16667 18.3334H9.16667" stroke="#418865" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
								<path d="M2.5 8.33337H17.5" stroke="#418865" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
							</svg>
							<span class="quiz-coverage-benefit-text">Coverage expires ${coverageExpiry}</span>
						</div>
					</div>
				</div>
				<div class="quiz-action-section">
					<div class="quiz-action-content">
						<div class="quiz-action-header">
							<h3 class="quiz-action-title">Schedule your initial online consultation now</h3>
						</div>

						<div class="quiz-action-details">
							<div class="quiz-action-info">
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
									<path d="M12.4214 14.5583C12.4709 14.3109 12.6316 14.1021 12.8477 13.972C14.3893 13.0437 15.4163 11.5305 15.4163 9.58378C15.4163 6.59224 12.9913 4.16711 9.99967 4.16711C7.00813 4.16711 4.58301 6.59224 4.58301 9.58378C4.58301 11.5305 5.60997 13.0437 7.15168 13.972C7.36778 14.1021 7.52844 14.3109 7.57791 14.5583L7.78236 15.5805C7.86027 15.97 8.20227 16.2504 8.59951 16.2504H11.3998C11.7971 16.2504 12.1391 15.97 12.217 15.5805L12.4214 14.5583Z" stroke="#418865" stroke-width="1.25" stroke-linejoin="round"/>
									<path d="M17.4997 9.58378H17.9163M2.08301 9.58378H2.49967M15.3024 4.28048L15.597 3.98586M4.16634 15.4171L4.58301 15.0004M15.4163 15.0004L15.833 15.4171M4.40234 3.98644L4.69697 4.28106M9.99967 2.08378V1.66711" stroke="#418865" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
									<path d="M11.6663 16.25V17.5C11.6663 17.9602 11.2933 18.3333 10.833 18.3333H9.16634C8.70609 18.3333 8.33301 17.9602 8.33301 17.5V16.25" stroke="#418865" stroke-width="1.25" stroke-linejoin="round"/>
								</svg>
								<span class="quiz-action-info-text">Our dietitians usually recommend minimum 6 consultations over 6 months, Today, just book your first.</span>
							</div>

							<div class="quiz-action-feature">
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
									<path d="M10.417 2.5031C9.67107 2.49199 8.92091 2.51074 8.19149 2.55923C4.70565 2.79094 1.929 5.60698 1.70052 9.14225C1.65582 9.83408 1.65582 10.5506 1.70052 11.2424C1.78374 12.53 2.35318 13.7222 3.02358 14.7288C3.41283 15.4336 3.15594 16.3132 2.7505 17.0815C2.45817 17.6355 2.312 17.9125 2.42936 18.1126C2.54672 18.3127 2.80887 18.3191 3.33318 18.3318C4.37005 18.3571 5.06922 18.0631 5.62422 17.6538C5.93899 17.4218 6.09638 17.3057 6.20486 17.2923C6.31332 17.279 6.5268 17.3669 6.95367 17.5427C7.33732 17.7007 7.78279 17.7982 8.19149 17.8254C9.37832 17.9043 10.6199 17.9045 11.8092 17.8254C15.295 17.5937 18.0717 14.7777 18.3002 11.2424C18.3354 10.6967 18.3428 10.1356 18.3225 9.58333" stroke="#418865" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
									<path d="M18.333 6.66663L13.333 1.66663M18.333 1.66663L13.333 6.66663" stroke="#418865" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
									<path d="M9.99658 10.4166H10.004M13.3262 10.4166H13.3337M6.66699 10.4166H6.67447" stroke="#418865" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<span class="quiz-action-feature-text">Free cancellation up to 24h before</span>
							</div>
						</div>

						<a href="${resultUrl}" class="quiz-booking-button">
							Proceed to booking
						</a>
					</div>
				</div>
				${this._generateFAQHTML()}
			</div>
		`;
	}

	_generateNotCoveredInsuranceResultsHTML(eligibilityData, resultUrl) {
		const messages = this.quizData.ui?.resultMessages?.notCovered || {};

		return `
			<div class="quiz-results-container">
				<div class="quiz-results-header">
                    <h2 class="quiz-results-title">${messages.title || "You're not covered, but we've got a deal for you"}</h2>
                    <p class="quiz-results-subtitle">${messages.subtitle || "Get expert dietitian support at a special discounted rate"}</p>
				</div>
				<div class="quiz-coverage-card">
					<h3 class="quiz-coverage-card-title">Here's Your Offer</h3>
					<div class="quiz-coverage-pricing">
						<div class="quiz-coverage-service-item">
							<div class="quiz-coverage-service">Initial consultation – 60 minutes</div>
							<div class="quiz-coverage-cost">
								<span class="quiz-coverage-copay">Co-pay: $80*</span>
								<span class="quiz-coverage-original-price">$100</span>
							</div>
						</div>
						<div class="quiz-coverage-service-item">
							<div class="quiz-coverage-service">Follow-up consultation – 30 minutes</div>
							<div class="quiz-coverage-cost">
								<span class="quiz-coverage-copay">Co-pay: $20*</span>
								<span class="quiz-coverage-original-price">$50</span>
							</div>
						</div>
					</div>
				</div>
				<div class="quiz-action-section">
					<div class="quiz-action-content">
						<div class="quiz-action-header">
							<h3 class="quiz-action-title">Schedule your initial online consultation now</h3>
						</div>

						<div class="quiz-action-details">
							<div class="quiz-action-info">
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
									<path d="M12.4214 14.5583C12.4709 14.3109 12.6316 14.1021 12.8477 13.972C14.3893 13.0437 15.4163 11.5305 15.4163 9.58378C15.4163 6.59224 12.9913 4.16711 9.99967 4.16711C7.00813 4.16711 4.58301 6.59224 4.58301 9.58378C4.58301 11.5305 5.60997 13.0437 7.15168 13.972C7.36778 14.1021 7.52844 14.3109 7.57791 14.5583L7.78236 15.5805C7.86027 15.97 8.20227 16.2504 8.59951 16.2504H11.3998C11.7971 16.2504 12.1391 15.97 12.217 15.5805L12.4214 14.5583Z" stroke="#418865" stroke-width="1.25" stroke-linejoin="round"/>
									<path d="M17.4997 9.58378H17.9163M2.08301 9.58378H2.49967M15.3024 4.28048L15.597 3.98586M4.16634 15.4171L4.58301 15.0004M15.4163 15.0004L15.833 15.4171M4.40234 3.98644L4.69697 4.28106M9.99967 2.08378V1.66711" stroke="#418865" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
									<path d="M11.6663 16.25V17.5C11.6663 17.9602 11.2933 18.3333 10.833 18.3333H9.16634C8.70609 18.3333 8.33301 17.9602 8.33301 17.5V16.25" stroke="#418865" stroke-width="1.25" stroke-linejoin="round"/>
								</svg>
								<span class="quiz-action-info-text">Our dietitians usually recommend minimum 6 consultations over 6 months, Today, just book your first.</span>
							</div>

							<div class="quiz-action-feature">
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
									<path d="M10.417 2.5031C9.67107 2.49199 8.92091 2.51074 8.19149 2.55923C4.70565 2.79094 1.929 5.60698 1.70052 9.14225C1.65582 9.83408 1.65582 10.5506 1.70052 11.2424C1.78374 12.53 2.35318 13.7222 3.02358 14.7288C3.41283 15.4336 3.15594 16.3132 2.7505 17.0815C2.45817 17.6355 2.312 17.9125 2.42936 18.1126C2.54672 18.3127 2.80887 18.3191 3.33318 18.3318C4.37005 18.3571 5.06922 18.0631 5.62422 17.6538C5.93899 17.4218 6.09638 17.3057 6.20486 17.2923C6.31332 17.279 6.5268 17.3669 6.95367 17.5427C7.33732 17.7007 7.78279 17.7982 8.19149 17.8254C9.37832 17.9043 10.6199 17.9045 11.8092 17.8254C15.295 17.5937 18.0717 14.7777 18.3002 11.2424C18.3354 10.6967 18.3428 10.1356 18.3225 9.58333" stroke="#418865" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
									<path d="M18.333 6.66663L13.333 1.66663M18.333 1.66663L13.333 6.66663" stroke="#418865" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
									<path d="M9.99658 10.4166H10.004M13.3262 10.4166H13.3337M6.66699 10.4166H6.67447" stroke="#418865" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<span class="quiz-action-feature-text">Free cancellation up to 24h before</span>
							</div>
						</div>

						<a href="${resultUrl}" class="quiz-booking-button">
							Proceed to booking
						</a>
					</div>
				</div>
				${this._generateFAQHTML()}
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

	_generateTestDataErrorResultsHTML(resultData, resultUrl) {
		const error = resultData.error || {};
		const errorCode = error.code || "33";
		const errorMessage = error.message || "Test data validation failed";
		const errorDetails = error.details || "";
		const errorField = error.field || "";

		return `
			<div class="quiz-results-container">
				<div class="quiz-results-header">
                    <h2 class="quiz-results-title">Test Data Issue Detected</h2>
                    <p class="quiz-results-subtitle">We noticed you're using test data that needs to be adjusted.</p>
				</div>

				<div class="quiz-coverage-card quiz-error-card">
                    <h3 class="quiz-coverage-card-title quiz-error-card-title">🧪 Test Data Error (Code ${errorCode})</h3>

					<div class="quiz-error-main-message">
						<p class="quiz-error-primary-text">${errorMessage}</p>
						<p class="quiz-error-secondary-text">${resultData.userMessage}</p>
					</div>

					${
						errorDetails
							? `
						<div class="quiz-error-guidance-section">
							<p class="quiz-error-section-title"><strong>How to Fix:</strong></p>
							<p class="quiz-error-guidance-text">${errorDetails}</p>
						</div>
					`
							: ""
					}

					${
						errorField
							? `
						<div class="quiz-error-metadata-section">
							<p class="quiz-error-section-title"><strong>Field with Issue:</strong></p>
							<div class="quiz-error-metadata-badges">
								<span class="quiz-error-badge">${errorField}</span>
							</div>
						</div>
					`
							: ""
					}
				</div>

				<div class="quiz-action-section">
					<div class="quiz-action-content">
						<div class="quiz-action-header">
							<h3 class="quiz-action-title">Testing Options</h3>
						</div>
						<div class="quiz-action-details">
							<div class="quiz-action-info">
								<svg class="quiz-action-info-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M10 18.3333C14.6023 18.3333 18.3333 14.6023 18.3333 9.99996C18.3333 5.39759 14.6023 1.66663 10 1.66663C5.39762 1.66663 1.66666 5.39759 1.66666 9.99996C1.66666 14.6023 5.39762 18.3333 10 18.3333Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
									<path d="M7.5 9.99996L9.16667 11.6666L12.5 8.33329" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<div class="quiz-action-info-text">For testing the eligibility system, please use "John" as the first name with the test insurance data provided.</div>
							</div>
							<div class="quiz-action-feature">
								<svg class="quiz-action-feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M18.3333 14.1667C18.3333 15.0871 17.5871 15.8333 16.6667 15.8333H5.83333L1.66666 20V3.33333C1.66666 2.41286 2.41285 1.66667 3.33333 1.66667H16.6667C17.5871 1.66667 18.3333 2.41286 18.3333 3.33333V14.1667Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<div class="quiz-action-feature-text">Contact support to set up live testing with real insurance data</div>
							</div>
							<div class="quiz-action-feature">
								<svg class="quiz-action-feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M6.66666 2.5V5.83333M13.3333 2.5V5.83333M2.5 9.16667H17.5M4.16666 3.33333H15.8333C16.7538 3.33333 17.5 4.07952 17.5 5V16.6667C17.5 17.5871 16.7538 18.3333 15.8333 18.3333H4.16666C3.24619 18.3333 2.5 17.5871 2.5 16.6667V5C2.5 4.07952 3.24619 3.33333 4.16666 3.33333Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<div class="quiz-action-feature-text">Try again with the correct test data format</div>
							</div>
						</div>
						<a href="${resultUrl}" class="quiz-booking-button">Continue</a>
					</div>
				</div>
				${this._generateFAQHTML()}
			</div>
		`;
	}

	_generateAAAErrorResultsHTML(eligibilityData, resultUrl) {
		// Extract comprehensive error information from the response
		const error = eligibilityData.error || {};
		const errorCode = error.code || eligibilityData.aaaErrorCode || "Unknown";
		const errorMessage = error.message || "Unknown error occurred";
		const errorDetails = error.details || "";
		const totalErrors = error.totalErrors || 0;
		const hasMultipleErrors = totalErrors > 1;

		// Use enhanced error titles and messaging if available
		const errorTitle = eligibilityData.errorTitle || this._getErrorTitle(errorCode);
		const actionTitle = eligibilityData.actionTitle || "Manual Verification Required";
		const actionText = eligibilityData.actionText || "Our team will manually verify your coverage and contact you with results.";

		// Generate detailed error information display
		const errorDetailsHTML = this._generateErrorDetailsHTML(error, errorCode, errorMessage, errorDetails, hasMultipleErrors);

		return `
			<div class="quiz-results-container">
				<div class="quiz-results-header">
                    <h2 class="quiz-results-title">${errorTitle}</h2>
                    <p class="quiz-results-subtitle">We encountered an issue verifying your insurance coverage automatically.</p>
				</div>

				<!-- Enhanced Error Details Card -->
				<div class="quiz-coverage-card quiz-error-card">
                    <h3 class="quiz-coverage-card-title quiz-error-card-title">⚠️ Verification Issue${errorCode !== "Unknown" ? ` (Error ${errorCode})` : ""}</h3>

					<!-- Main Error Message -->
					<div class="quiz-error-main-message">
						<p class="quiz-error-primary-text">${eligibilityData.userMessage || errorMessage}</p>
					</div>

					${errorDetailsHTML}
				</div>

				<div class="quiz-action-section">
					<div class="quiz-action-content">
						<div class="quiz-action-header">
							<h3 class="quiz-action-title">${actionTitle}</h3>
						</div>
						<div class="quiz-action-details">
							<div class="quiz-action-info">
								<svg class="quiz-action-info-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M10 18.3333C14.6023 18.3333 18.3333 14.6023 18.3333 9.99996C18.3333 5.39759 14.6023 1.66663 10 1.66663C5.39762 1.66663 1.66666 5.39759 1.66666 9.99996C1.66666 14.6023 5.39762 18.3333 10 18.3333Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
									<path d="M7.5 9.99996L9.16667 11.6666L12.5 8.33329" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<div class="quiz-action-info-text">${actionText}</div>
							</div>
							<div class="quiz-action-feature">
								<svg class="quiz-action-feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M18.3333 14.1667C18.3333 15.0871 17.5871 15.8333 16.6667 15.8333H5.83333L1.66666 20V3.33333C1.66666 2.41286 2.41285 1.66667 3.33333 1.66667H16.6667C17.5871 1.66667 18.3333 2.41286 18.3333 3.33333V14.1667Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<div class="quiz-action-feature-text">We'll contact you within 24 hours with your coverage details</div>
							</div>
							<div class="quiz-action-feature">
								<svg class="quiz-action-feature-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M6.66666 2.5V5.83333M13.3333 2.5V5.83333M2.5 9.16667H17.5M4.16666 3.33333H15.8333C16.7538 3.33333 17.5 4.07952 17.5 5V16.6667C17.5 17.5871 16.7538 18.3333 15.8333 18.3333H4.16666C3.24619 18.3333 2.5 17.5871 2.5 16.6667V5C2.5 4.07952 3.24619 3.33333 4.16666 3.33333Z" stroke="#306E51" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<div class="quiz-action-feature-text">You can still proceed with booking a consultation</div>
							</div>
						</div>
						<a href="${resultUrl}" class="quiz-booking-button">Continue to Booking</a>
					</div>
				</div>
				${this._generateFAQHTML()}
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
		const faqData = this.quizData.ui?.faq || [];
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
                            <svg class="quiz-faq-toggle-icon" width="24" height="24" viewBox="0 0 24 24" fill="none">
							<path d="M4 12H20" stroke="#4f4f4f" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
							<path d="M12 4V20" stroke="#4f4f4f" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
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
			eligibilityCheck: "SUPPORTED" // Filter for payers that support eligibility checks
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
		const lowerQuery = query.toLowerCase();

		const filtered = commonPayers
			.filter(payer => {
				const matches =
					payer.displayName.toLowerCase().includes(lowerQuery) || payer.stediId.toLowerCase().includes(lowerQuery) || payer.aliases?.some(alias => alias.toLowerCase().includes(lowerQuery));
				return matches;
			})
			.map(payer => ({ payer }))
			.slice(0, 5);

		return filtered;
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
				const offset = 20; // Small offset from top
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

	_addLegalTextAfterNavigation(legalText) {
		const navContainer = this.navigationButtons;
		if (!navContainer) return;

		const existingLegal = navContainer.querySelector(".quiz-legal-after-nav");
		if (existingLegal) {
			existingLegal.remove();
		}

		const legalElement = document.createElement("p");
		legalElement.className = "quiz-text-xs quiz-legal-after-nav";
		legalElement.innerHTML = legalText;
		navContainer.appendChild(legalElement);
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
			resultKeys: Object.keys(result || {}),
			bodyKeys: result?.body ? Object.keys(result.body) : "no body"
		});

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
					return this._createAAAErrorEligibilityData(errorCode, eligibilityData.userMessage);
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
				return this._createAAAErrorEligibilityData(errorCode, eligibilityData.userMessage);
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

	showResults(resultUrl, webhookSuccess = true, resultData = null, errorMessage = "") {
		console.log("showResults called with:", {
			webhookSuccess,
			resultData,
			eligibilityStatus: resultData?.eligibilityStatus,
			isEligible: resultData?.isEligible,
			errorMessage
		});

		this._stopLoadingMessages();

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

		// Scroll to top of results
		window.scrollTo({ top: 0, behavior: "smooth" });
	}

	_stopLoadingMessages() {
		// Clear any loading intervals
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

		console.log("Processing eligibility status:", eligibilityStatus, "isEligible:", isEligible);

		if (isEligible && eligibilityStatus === "ELIGIBLE") {
			console.log("Generating eligible insurance results");
			return this._generateEligibleInsuranceResultsHTML(resultData, resultUrl);
		}

		if (eligibilityStatus === "AAA_ERROR") {
			console.log("Generating AAA error results");
			return this._generateAAAErrorResultsHTML(resultData, resultUrl);
		}

		if (eligibilityStatus === "TEST_DATA_ERROR") {
			console.log("Generating test data error results");
			return this._generateTestDataErrorResultsHTML(resultData, resultUrl);
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

	get isTestMode() {
		const testParam = new URLSearchParams(window.location.search).get("test");
		return testParam !== null && testParam !== "false";
	}
}

document.addEventListener("DOMContentLoaded", () => {
	const quiz = new ModularQuiz();
	window.productQuiz = quiz;
});
