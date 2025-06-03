/**
 * Product Quiz for Shopify - Reorganized
 *
 * This script handles the product quiz functionality with improved organization
 * and dynamic configuration from JSON data file.
 */

// =============================================================================
// CONFIGURATION & CONSTANTS
// =============================================================================

const ELEMENT_SELECTORS = {
	MAIN_CONTAINER: "#product-quiz",
	INTRO: ".quiz-intro",
	QUESTIONS: ".quiz-questions",
	RESULTS: ".quiz-results",
	ERROR: ".quiz-error",
	LOADING: ".quiz-loading",
	ELIGIBILITY_CHECK: ".quiz-eligibility-check",
	PROGRESS_BAR: ".quiz-progress-bar",
	QUESTION_CONTAINER: ".quiz-question-container",
	NAVIGATION: ".quiz-navigation",
	PREV_BUTTON: "#quiz-prev-button",
	NEXT_BUTTON: "#quiz-next-button",
	START_BUTTON: "#quiz-start-button"
};

// =============================================================================
// MAIN QUIZ CLASS
// =============================================================================

class ProductQuiz {
	constructor(options = {}) {
		this._initializeDOMElements();
		if (!this._isInitialized) return;

		if (!this._validateEssentialElements()) return;

		// Configuration
		this.dataUrl = options.dataUrl || this.container.getAttribute("data-quiz-url") || "/apps/product-quiz/data.json";

		// State
		this.quizData = null;
		this.config = null;
		this.currentStepIndex = 0;
		this.currentQuestionIndex = 0;
		this.responses = [];
		this.submitting = false;
		this.loadingInterval = null;

		this.init();
	}

	// =============================================================================
	// INITIALIZATION METHODS
	// =============================================================================

	_initializeDOMElements() {
		this.container = document.querySelector(ELEMENT_SELECTORS.MAIN_CONTAINER);
		if (!this.container) {
			console.error("ProductQuiz: Main container not found. Quiz cannot start.");
			this._isInitialized = false;
			return;
		}

		// Select all DOM elements
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
		const essentialElements = ["intro", "questions", "results", "error", "loading", "progressBar", "questionContainer", "navigationButtons", "prevButton", "nextButton"];

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
				if (this.currentStepIndex === 0) {
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
		this._hideElement(this.intro);
		this._hideElement(this.questions);
		this._showElement(this.loading);

		try {
			await this.loadQuizData();
			this._initializeResponses();
			this._applyTestDataIfEnabled();

			this._hideElement(this.loading);
			this._showElement(this.questions);
			this._showElement(this.navHeader);
			this._showElement(this.progressSection);

			this.renderCurrentStep();
			this.updateNavigation();
		} catch (error) {
			console.error("Failed to load quiz:", error);
			this._hideElement(this.loading);
			this._showElement(this.error);
		}
	}

	// =============================================================================
	// DATA LOADING & MANAGEMENT
	// =============================================================================

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
		this.responses = [];
		this.quizData.steps.forEach(step => {
			if (step.questions) {
				step.questions.forEach(question => {
					this.responses.push({
						stepId: step.id,
						questionId: question.id,
						answer: null
					});
				});
			} else {
				this.responses.push({
					stepId: step.id,
					questionId: step.id,
					answer: null
				});
			}
		});
	}

	_applyTestDataIfEnabled() {
		const testMode = new URLSearchParams(window.location.search).get("test");
		if (testMode === "true" && this.quizData.testData) {
			Object.keys(this.quizData.testData).forEach(questionId => {
				const responseIndex = this.responses.findIndex(r => r.questionId === questionId);
				if (responseIndex !== -1) {
					this.responses[responseIndex].answer = this.quizData.testData[questionId];
				}
			});
			this._addTestModeIndicator();
		}
	}

	_addTestModeIndicator() {
		if (document.querySelector(".quiz-test-mode-indicator")) return;

		const indicator = document.createElement("div");
		indicator.className = "quiz-test-mode-indicator";
		indicator.innerHTML = "🧪 TEST MODE";
		indicator.style.cssText = `
            position: fixed; top: 10px; right: 10px; background: #4CAF50;
            color: white; padding: 8px 12px; border-radius: 4px; font-weight: bold;
            font-size: 12px; z-index: 9999; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
		document.body.appendChild(indicator);
		setTimeout(() => indicator.remove(), 5000);
	}

	// =============================================================================
	// STEP & QUESTION MANAGEMENT
	// =============================================================================

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

	// =============================================================================
	// RENDERING METHODS
	// =============================================================================

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

	// =============================================================================
	// UTILITY METHODS
	// =============================================================================

	_showElement(element) {
		element?.classList.remove("hidden");
	}

	_hideElement(element) {
		element?.classList.add("hidden");
	}

	// =============================================================================
	// QUESTION RENDERING METHODS
	// =============================================================================

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
		let html = '<div class="quiz-grid-2">';
		question.options.forEach(option => {
			const isSelected = response.answer === option.id;
			html += `
                <label for="${option.id}" class="quiz-option-card">
                    <input type="radio" id="${option.id}" name="question-${question.id}" value="${option.id}" class="quiz-sr-only" ${isSelected ? "checked" : ""}>
                    <div class="quiz-option-button ${isSelected ? "selected" : ""}">
                        <div class="quiz-option-text">
                            <div class="quiz-option-text-content">${option.text}</div>
                        </div>
                        ${isSelected ? this._getCheckmarkSVG() : ""}
                    </div>
                </label>
            `;
		});
		return html + "</div>";
	}

	renderCheckbox(question, response) {
		const selectedOptions = Array.isArray(response.answer) ? response.answer : [];
		const useCardStyle = question.id !== "consent";

		if (useCardStyle) {
			let html = '<div class="quiz-grid-2">';
			question.options.forEach(option => {
				const isSelected = selectedOptions.includes(option.id);
				html += `
                    <label for="${option.id}" class="quiz-option-card">
                        <input type="checkbox" id="${option.id}" name="question-${question.id}" value="${option.id}" class="quiz-sr-only" ${isSelected ? "checked" : ""}>
                        <div class="quiz-option-button ${isSelected ? "selected" : ""}">
                            <div class="quiz-option-text">
                                <div class="quiz-option-text-content">${option.text}</div>
                            </div>
                            ${isSelected ? this._getCheckmarkSVG() : ""}
                        </div>
                    </label>
                `;
			});
			return html + "</div>";
		} else {
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
	}

	renderDropdown(question, response) {
		const options = question.options || [];
		const placeholder = question.placeholder || "Select an option";

		let html = `
            <div>
                <select id="question-${question.id}" class="quiz-select">
                    <option value="">${placeholder}</option>
        `;

		options.forEach(option => {
			html += `<option value="${option.id}" ${response.answer === option.id ? "selected" : ""}>${option.text}</option>`;
		});

		return (
			html +
			`
                </select>
                <p id="error-${question.id}" class="quiz-error-text quiz-error-hidden"></p>
            </div>
        `
		);
	}

	renderTextInput(question, response) {
		return `
            <div>
                <input type="text" id="question-${question.id}" class="quiz-input"
                    placeholder="${question.placeholder || "Type your answer here..."}"
                    value="${response.answer || ""}"
                    aria-describedby="error-${question.id}">
                <p id="error-${question.id}" class="quiz-error-text quiz-error-hidden"></p>
            </div>
        `;
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
                <p id="error-${question.id}" class="quiz-error-text quiz-error-hidden"></p>
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

	// =============================================================================
	// NAVIGATION & EVENT HANDLING
	// =============================================================================

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

		// Info-only steps
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

		// Form steps
		if (this.isFormStep(currentStep.id)) {
			if (!this._validateFormStep(currentStep)) return;

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

		// Wizard steps
		if (currentStep.questions && this.currentQuestionIndex < currentStep.questions.length - 1) {
			this.currentQuestionIndex++;
			this.renderCurrentStep();
			this.updateNavigation();
			return;
		}

		// Last step or move to next
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
		const isCurrentQuestionAutoAdvance = currentQuestion && this._shouldAutoAdvance(currentQuestion);

		// Hide navigation for auto-advance questions
		if (isCurrentQuestionAutoAdvance && !isFormStep) {
			this.navigationButtons.classList.add("quiz-navigation-hidden");
			this.navigationButtons.classList.remove("quiz-navigation-visible");
			return;
		} else {
			this.navigationButtons.classList.remove("quiz-navigation-hidden");
			this.navigationButtons.classList.add("quiz-navigation-visible");
		}

		// Hide back button
		if (this.prevButton) {
			this.prevButton.style.display = "none";
		}

		// Update button text
		const isLastStep = this.currentStepIndex === this.quizData.steps.length - 1;
		const isLastQuestionInStep = isFormStep ? true : step.questions ? this.currentQuestionIndex === step.questions.length - 1 : true;

		if (isLastStep && isLastQuestionInStep) {
			this.nextButton.innerHTML = step.ctaText || "Finish Quiz";
		} else {
			this.nextButton.innerHTML = this._getStepButtonText(step);
		}

		// Handle form step navigation
		if (isFormStep && step.questions) {
			this.navigationButtons.classList.add("quiz-navigation-hidden");
			const formButton = this.questionContainer.querySelector("#quiz-form-next-button");
			if (formButton) {
				formButton.disabled = this.submitting;
			}
			return;
		}

		// Enable/disable based on answers
		const hasAnswer = this._hasValidAnswer(step);
		this.nextButton.disabled = !hasAnswer || this.submitting;
	}

	_getStepButtonText(step) {
		if (step.id === "step-medical") {
			const question = step.questions[this.currentQuestionIndex];
			if (question?.type === "checkbox") {
				const response = this.responses.find(r => r.questionId === question.id);
				const hasSelection = response && Array.isArray(response.answer) && response.answer.length > 0;
				return hasSelection ? step.ctaText || "Continue" : "Skip";
			}
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
		return question.type === "multiple-choice" || question.type === "dropdown";
	}

	// =============================================================================
	// ANSWER HANDLING
	// =============================================================================

	handleAnswer(answer) {
		if (!this.quizData) return;

		const step = this.getCurrentStep();
		if (!step) return;

		if (step.questions?.length > 0) {
			const question = step.questions[this.currentQuestionIndex];
			if (!question) return;

			const responseIndex = this.responses.findIndex(r => r.questionId === question.id);
			if (responseIndex !== -1) {
				this.responses[responseIndex].answer = answer;
			} else {
				this.responses.push({
					stepId: step.id,
					questionId: question.id,
					answer
				});
			}

			if (this._shouldAutoAdvance(question)) {
				this._handleAutoAdvance(answer);
			} else {
				if (question.type === "checkbox") {
					this._updateCheckboxVisualState(question, answer);
				} else {
					this.renderCurrentStep();
				}
			}
			return;
		} else if (step.info) {
			const responseIndex = this.responses.findIndex(r => r.stepId === step.id);
			if (responseIndex !== -1) {
				this.responses[responseIndex].answer = answer || "info-acknowledged";
			} else {
				this.responses.push({
					stepId: step.id,
					questionId: step.id,
					answer: answer || "info-acknowledged"
				});
			}
			this.nextButton.disabled = false;
		}

		this.updateNavigation();
	}

	handleFormAnswer(questionId, answer) {
		const step = this.getCurrentStep();
		if (!step?.questions) return;

		const responseIndex = this.responses.findIndex(r => r.questionId === questionId);
		if (responseIndex !== -1) {
			this.responses[responseIndex].answer = answer;
		} else {
			this.responses.push({
				stepId: step.id,
				questionId: questionId,
				answer: answer
			});
		}
	}

	_handleAutoAdvance(answer) {
		// Clear all previous selections
		const allOptionButtons = this.questionContainer.querySelectorAll(".quiz-option-button");
		allOptionButtons.forEach(button => {
			button.classList.remove("selected", "processing", "auto-advance-feedback");
			const existingCheckmark = button.querySelector(".quiz-checkmark");
			if (existingCheckmark) {
				existingCheckmark.remove();
			}
		});

		// Show selection feedback
		const selectedElement = this.questionContainer.querySelector(`input[value="${answer}"]:checked`);
		if (selectedElement) {
			const optionButton = selectedElement.closest(".quiz-option-card")?.querySelector(".quiz-option-button");
			if (optionButton) {
				optionButton.classList.add("selected", "processing");
				optionButton.innerHTML += this._getCheckmarkSVG();
				optionButton.classList.add("auto-advance-feedback");
			}
		}

		// Advance after delay
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

	// =============================================================================
	// EVENT LISTENERS & STEP MANAGEMENT
	// =============================================================================

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

		switch (question.type) {
			case "multiple-choice":
				this._attachRadioListeners(question);
				break;
			case "checkbox":
				this._attachCheckboxListeners(question);
				break;
			case "dropdown":
			case "date-part":
				this._attachDropdownListeners(question);
				break;
			case "text":
			case "date":
				this._attachTextInputListeners(question);
				break;
			case "textarea":
				this._attachTextareaListeners(question);
				break;
			case "rating":
				this._attachRatingListeners(question);
				break;
			case "payer-search":
				this._attachPayerSearchListeners(question);
				break;
		}
	}

	_attachRadioListeners(question) {
		const radioInputs = this.questionContainer.querySelectorAll(`input[name="question-${question.id}"]`);
		radioInputs.forEach(input => {
			input.addEventListener("change", () => {
				this.handleAnswer(input.value);
			});
		});
	}

	_attachCheckboxListeners(question) {
		const checkboxInputs = this.questionContainer.querySelectorAll(`input[name="question-${question.id}"]`);
		checkboxInputs.forEach(input => {
			input.removeEventListener("change", input._changeHandler);
			input._changeHandler = () => {
				const selectedOptions = Array.from(checkboxInputs)
					.filter(cb => cb.checked)
					.map(cb => cb.value);
				this.handleAnswer(selectedOptions);
			};
			input.addEventListener("change", input._changeHandler);
		});
	}

	_attachDropdownListeners(question) {
		const dropdownInput = this.questionContainer.querySelector(`#question-${question.id}`);
		if (!dropdownInput) return;

		dropdownInput.addEventListener("change", () => {
			this.handleFormAnswer(question.id, dropdownInput.value);
			this._updateDropdownColor(dropdownInput);
			this._clearFieldError(question.id, dropdownInput);
		});
		this._updateDropdownColor(dropdownInput);
	}

	_attachTextInputListeners(question) {
		const textInput = this.questionContainer.querySelector(`#question-${question.id}`);
		if (!textInput) return;

		textInput.removeEventListener("input", textInput._inputHandler);
		textInput._inputHandler = () => {
			const validationResult = this._validateFieldValue(question, textInput.value);
			this._updateFieldValidationState(textInput, question, validationResult);
			this.handleFormAnswer(question.id, textInput.value);
		};

		textInput.addEventListener("input", textInput._inputHandler);
		textInput.addEventListener("change", textInput._inputHandler);
	}

	_attachTextareaListeners(question) {
		const textareaInput = this.questionContainer.querySelector(`#question-${question.id}`);
		if (textareaInput) {
			textareaInput.addEventListener("input", () => {
				this.handleAnswer(textareaInput.value);
			});
		}
	}

	_attachRatingListeners(question) {
		const ratingInput = this.questionContainer.querySelector(`#question-${question.id}`);
		if (ratingInput) {
			ratingInput.addEventListener("input", () => {
				this.handleAnswer(Number.parseInt(ratingInput.value, 10));
			});
		}
	}

	_attachFormQuestionListener(question) {
		switch (question.type) {
			case "dropdown":
			case "date-part":
				this._attachDropdownListeners(question);
				break;
			case "text":
			case "date":
				this._attachTextInputListeners(question);
				break;
			case "checkbox":
				this._attachFormCheckboxListeners(question);
				break;
			case "payer-search":
				this._attachPayerSearchFormListeners(question);
				break;
		}
	}

	_attachFormCheckboxListeners(question) {
		const checkboxInputs = this.questionContainer.querySelectorAll(`input[name="question-${question.id}"]`);
		checkboxInputs.forEach(input => {
			input.onclick = () => {
				if (question.options.length === 1) {
					this.handleFormAnswer(question.id, input.checked ? [input.value] : []);
				} else {
					const selectedOptions = Array.from(checkboxInputs)
						.filter(cb => cb.checked)
						.map(cb => cb.value);
					this.handleFormAnswer(question.id, selectedOptions);
				}
			};
		});
	}

	// =============================================================================
	// VALIDATION METHODS
	// =============================================================================

	_validateFormStep(step) {
		let hasValidationErrors = false;
		const validationErrors = [];

		for (const question of step.questions) {
			const response = this.responses.find(r => r.questionId === question.id);
			const currentValue = response ? response.answer : null;

			if (question.required) {
				let isEmpty = false;

				if (!currentValue) {
					isEmpty = true;
				} else if (question.type === "checkbox") {
					isEmpty = !Array.isArray(currentValue) || currentValue.length === 0;
				} else if (question.type === "payer-search") {
					isEmpty = !currentValue || (typeof currentValue === "string" && currentValue.trim() === "");
				} else if (typeof currentValue === "string") {
					isEmpty = currentValue.trim() === "";
				}

				if (isEmpty) {
					hasValidationErrors = true;
					validationErrors.push({
						questionId: question.id,
						message: this.quizData.ui?.errorMessages?.validationRequired || "This field is required"
					});
					continue;
				}
			}

			if (currentValue && question.type !== "payer-search") {
				const validationResult = this._validateFieldValue(question, currentValue);
				if (!validationResult.isValid) {
					hasValidationErrors = true;
					validationErrors.push({
						questionId: question.id,
						message: validationResult.errorMessage
					});
				}
			}
		}

		if (hasValidationErrors) {
			this._displayValidationErrors(validationErrors);
			return false;
		}

		return true;
	}

	_displayValidationErrors(validationErrors) {
		let firstInvalidField = null;

		validationErrors.forEach((error, index) => {
			const errorEl = this.questionContainer.querySelector(`#error-${error.questionId}`);
			const input = this.questionContainer.querySelector(`#question-${error.questionId}`);

			if (input) {
				input.classList.add("quiz-input-error");
				input.classList.remove("quiz-input-valid");
				if (index === 0) {
					firstInvalidField = input;
				}
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

	_validateFieldValue(question, value) {
		const errorMessages = this.quizData.ui?.errorMessages || {};

		if (question.type === "payer-search") {
			if (question.required && (!value || (typeof value === "string" && value.trim() === ""))) {
				return {
					isValid: false,
					errorMessage: errorMessages.validationInsurance || "Please select an insurance plan"
				};
			}
			return { isValid: true, errorMessage: null };
		}

		if (question.required && (!value || (typeof value === "string" && value.trim() === ""))) {
			return {
				isValid: false,
				errorMessage: errorMessages.validationRequired || "This field is required"
			};
		}

		if (!question.required && (!value || (typeof value === "string" && value.trim() === ""))) {
			return { isValid: true, errorMessage: null };
		}

		if (value && typeof value === "string" && value.trim() !== "") {
			const trimmedValue = value.trim();
			const patterns = this.quizData.validation?.patterns || {};

			// Use patterns from JSON data
			switch (question.id) {
				case "q4": // Member ID
					if (!new RegExp(patterns.memberId || "^.{6,20}$").test(trimmedValue)) {
						return { isValid: false, errorMessage: errorMessages.validationMemberId || "Minimum 6 characters" };
					}
					break;
				case "q4_group": // Group number
					if (!new RegExp(patterns.groupNumber || "^$|^.{5,15}$").test(trimmedValue)) {
						return { isValid: false, errorMessage: errorMessages.validationGroupNumber || "Minimum 5 characters" };
					}
					break;
				case "q7": // First name
				case "q8": // Last name
					if (!new RegExp(patterns.name || "^[A-Za-z\\s]{1,100}$").test(trimmedValue)) {
						return { isValid: false, errorMessage: errorMessages.validationName || "Use only A–Z letters and spaces" };
					}
					break;
				case "q9": // Email
					if (!new RegExp(patterns.email || "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$").test(trimmedValue)) {
						return { isValid: false, errorMessage: errorMessages.validationEmail || "Enter valid email" };
					}
					break;
				case "q10": // Phone
					if (!this._validatePhoneNumber(trimmedValue)) {
						return { isValid: false, errorMessage: errorMessages.validationPhone || "Enter valid phone" };
					}
					break;
				default:
					if (question.validation?.pattern) {
						const regex = new RegExp(question.validation.pattern);
						if (!regex.test(trimmedValue)) {
							return {
								isValid: false,
								errorMessage: question.validation.message || "Invalid format"
							};
						}
					}
			}
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

		if (validationResult.isValid) {
			input.classList.remove("quiz-input-error");
			input.classList.add("quiz-input-valid");
			if (errorEl) {
				errorEl.classList.add("quiz-error-hidden");
				errorEl.classList.remove("quiz-error-visible");
			}
		} else {
			input.classList.remove("quiz-input-valid");
			input.classList.add("quiz-input-error");
			if (errorEl && validationResult.errorMessage) {
				errorEl.textContent = validationResult.errorMessage;
				errorEl.classList.remove("quiz-error-hidden");
				errorEl.classList.add("quiz-error-visible");
			}
		}

		return validationResult.isValid;
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
		if (dropdown.value === "" || dropdown.value === dropdown.options[0].value) {
			dropdown.style.color = "#B0B0B0";
		} else {
			dropdown.style.color = "var(--quiz-text-primary)";
		}
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

	// =============================================================================
	// QUIZ COMPLETION & RESULTS
	// =============================================================================

	async finishQuiz() {
		const bookingUrl = this.container.getAttribute("data-booking-url") || "/appointment-booking";

		try {
			this.submitting = true;
			this.nextButton.disabled = true;
			this.nextButton.innerHTML = `<div class="quiz-spinner"></div>Processing...`;

			const payload = this._buildSubmissionPayload();

			this._hideElement(this.navigation);
			this._hideElement(this.progressSection);
			this._startDynamicLoader();

			const webhookUrl = "https://us-central1-telemedicine-458913.cloudfunctions.net/telemedicine-webhook";
			let eligibilityData = await this._submitToWebhook(webhookUrl, payload);

			this._stopDynamicLoader();
			this.showResults(bookingUrl, true, eligibilityData);

			if (window.analytics?.track) {
				window.analytics.track("Quiz Completed", {
					quizId: this.quizData?.id || "dietitian-quiz",
					successfullySubmitted: true
				});
			}
		} catch (error) {
			this._stopDynamicLoader();
			this.showResults(bookingUrl, false, null, error.message);
		} finally {
			this.submitting = false;
			this.nextButton.disabled = false;
			this.nextButton.innerHTML = "Next";
		}
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

		let dobMonth = "",
			dobDay = "",
			dobYear = "";

		this.responses.forEach(response => {
			switch (response.questionId) {
				case "q9":
					data.customerEmail = response.answer || "";
					break;
				case "q7":
					data.firstName = response.answer || "";
					break;
				case "q8":
					data.lastName = response.answer || "";
					break;
				case "q10":
					data.phoneNumber = response.answer || "";
					break;
				case "q5":
					data.state = response.answer || "";
					break;
				case "q3":
					data.insurance = response.answer || "";
					data.insurancePrimaryPayerId = response.answer || "";
					break;
				case "q4":
					data.insuranceMemberId = response.answer || "";
					break;
				case "q4_group":
					data.groupNumber = response.answer || "";
					break;
				case "q1":
					data.mainReasons = response.answer || [];
					break;
				case "q2":
					data.medicalConditions = response.answer || [];
					break;
				case "q6_month":
					dobMonth = response.answer || "";
					break;
				case "q6_day":
					dobDay = response.answer || "";
					break;
				case "q6_year":
					dobYear = response.answer || "";
					break;
			}
		});

		if (dobMonth && dobDay && dobYear) {
			data.dateOfBirth = `${dobYear}${dobMonth.padStart(2, "0")}${dobDay.padStart(2, "0")}`;
		}

		return data;
	}

	async _submitToWebhook(webhookUrl, payload) {
		try {
			const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out")), 35000));

			const fetchPromise = fetch(webhookUrl, {
				method: "POST",
				mode: "cors",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json"
				},
				body: JSON.stringify(payload)
			});

			const response = await Promise.race([fetchPromise, timeoutPromise]);

			if (response.ok) {
				const result = await response.json();
				return this._processWebhookResult(result);
			} else {
				throw new Error(`Server returned status ${response.status}`);
			}
		} catch (error) {
			const errorMessages = this.quizData.ui?.errorMessages || {};
			return this._createErrorEligibilityData(error.message.includes("timeout") ? errorMessages.networkError || "Network timeout" : errorMessages.serverError || "Server error");
		}
	}

	_processWebhookResult(result) {
		if (result?.success === true && result.eligibilityData) {
			return result.eligibilityData;
		} else if (result?.success === false) {
			return this._createErrorEligibilityData(result.error || "Processing error");
		}

		return this._createProcessingEligibilityData();
	}

	_createErrorEligibilityData(message) {
		return {
			isEligible: false,
			sessionsCovered: 0,
			deductible: { individual: 0 },
			eligibilityStatus: "ERROR",
			userMessage: message,
			planBegin: "",
			planEnd: ""
		};
	}

	_createProcessingEligibilityData() {
		const messages = this.quizData.ui?.resultMessages?.processing || {};
		return {
			isEligible: null,
			sessionsCovered: 0,
			deductible: { individual: 0 },
			eligibilityStatus: "PROCESSING",
			userMessage: messages.message || "Processing your request...",
			planBegin: "",
			planEnd: ""
		};
	}

	_startDynamicLoader() {
		const loadingMessages = this.quizData.ui?.loadingMessages || ["Processing your request...", "Please wait..."];

		let currentMessageIndex = 0;

		this.questionContainer.innerHTML = `
            <div class="quiz-eligibility-check">
                <div class="quiz-loading-spinner"></div>
                <div class="quiz-loading-text" id="dynamic-loading-text">${loadingMessages[currentMessageIndex]}</div>
            </div>
        `;

		this.loadingInterval = setInterval(() => {
			currentMessageIndex = (currentMessageIndex + 1) % loadingMessages.length;
			const textElement = document.getElementById("dynamic-loading-text");
			if (textElement) {
				textElement.style.opacity = "0.5";
				setTimeout(() => {
					textElement.textContent = loadingMessages[currentMessageIndex];
					textElement.style.opacity = "1";
				}, 200);
			}
		}, 2500);
	}

	_stopDynamicLoader() {
		if (this.loadingInterval) {
			clearInterval(this.loadingInterval);
			this.loadingInterval = null;
		}
	}

	showResults(bookingUrl, webhookSuccess = true, eligibilityData = null, errorMessage = "") {
		this._stopDynamicLoader();
		this._hideElement(this.navigationButtons);
		this._hideElement(this.progressSection);

		let resultsHTML = "";

		if (!webhookSuccess || !eligibilityData) {
			resultsHTML = this._generateErrorResultsHTML(bookingUrl, errorMessage);
		} else {
			const isEligible = eligibilityData.isEligible === true;
			const eligibilityStatus = eligibilityData.eligibilityStatus || "UNKNOWN";

			if (isEligible && eligibilityStatus === "ELIGIBLE") {
				resultsHTML = this._generateEligibleResultsHTML(eligibilityData, bookingUrl);
			} else {
				resultsHTML = this._generateIneligibleResultsHTML(eligibilityData, bookingUrl);
			}
		}

		this.questionContainer.innerHTML = resultsHTML;
		this._attachFAQListeners();
	}

	_generateErrorResultsHTML(bookingUrl, errorMessage) {
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
                <a href="${bookingUrl}" class="quiz-booking-button">Continue to Support</a>
            </div>
        `;
	}

	_generateEligibleResultsHTML(eligibilityData, bookingUrl) {
		const messages = this.quizData.ui?.resultMessages?.eligible || {};
		const sessionsCovered = parseInt(eligibilityData.sessionsCovered || "0", 10);
		const copay = eligibilityData.copay || 0;

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
                            <span class="quiz-coverage-benefit-text">${sessionsCovered} covered sessions remaining</span>
                        </div>
                    </div>
                </div>
                <a href="${bookingUrl}" class="quiz-booking-button">Proceed to booking</a>
                ${this._generateFAQHTML()}
            </div>
        `;
	}

	_generateIneligibleResultsHTML(eligibilityData, bookingUrl) {
		const messages = this.quizData.ui?.resultMessages?.notEligible || {};
		const userMessage = eligibilityData.userMessage || "Your eligibility check is complete.";

		return `
            <div class="quiz-results-container">
                <div class="quiz-results-header">
                    <h2 class="quiz-results-title">${messages.title || "Thanks for completing the quiz!"}</h2>
                    <p class="quiz-results-subtitle">${messages.subtitle || "We're ready to help you."}</p>
                </div>
                <div class="quiz-coverage-card">
                    <h3 class="quiz-coverage-card-title">Insurance Coverage Check</h3>
                    <p>${userMessage}</p>
                </div>
                <a href="${bookingUrl}" class="quiz-booking-button">Continue with Next Steps</a>
            </div>
        `;
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
                                <path d="M4 12H20" stroke="#454545" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M12 4V20" stroke="#454545" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
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
				const toggle = item.querySelector(".quiz-faq-toggle");

				if (toggle) {
					toggle.classList.add("rotating");
					setTimeout(() => {
						toggle.classList.remove("rotating");
						if (!isExpanded) {
							item.classList.add("expanded");
							const question = item.querySelector(".quiz-faq-question, .quiz-faq-question-collapsed");
							if (question) question.className = "quiz-faq-question";
						} else {
							item.classList.remove("expanded");
							const question = item.querySelector(".quiz-faq-question, .quiz-faq-question-collapsed");
							if (question) question.className = "quiz-faq-question-collapsed";
						}
					}, 400);
				}
			});
		});
	}

	// =============================================================================
	// PAYER SEARCH FUNCTIONALITY
	// =============================================================================

	renderPayerSearch(question, response) {
		const selectedPayer = response.answer;
		const placeholder = question.placeholder || "Select your insurance plan...";

		let html = `
            <div class="quiz-payer-search-container">
                <button type="button" id="question-${question.id}" class="quiz-payer-search-trigger placeholder" aria-describedby="error-${question.id}" aria-expanded="false">
                    <span class="quiz-payer-search-trigger-text">${placeholder}</span>
                    <svg class="quiz-payer-search-dropdown-icon" width="12" height="7" viewBox="0 0 12 7" fill="none">
                        <path d="M1.03888 0.294581C1.42815 -0.0946914 2.05918 -0.0950353 2.44888 0.293813L5.62716 3.46517C6.01751 3.85467 6.64948 3.85467 7.03983 3.46517L10.2181 0.293812C10.6078 -0.0950355 11.2388 -0.0946913 11.6281 0.294581C12.0177 0.684154 12.0177 1.31578 11.6281 1.70535L7.0406 6.29286C6.65008 6.68338 6.01691 6.68338 5.62639 6.29286L1.03888 1.70535C0.649308 1.31578 0.649307 0.684154 1.03888 0.294581Z" fill="#4F4F4F"/>
                    </svg>
                </button>
                <div class="quiz-payer-search-dropdown" id="search-dropdown-${question.id}" style="display: none;">
                    <div class="quiz-payer-search-input-container">
                        <input type="text" class="quiz-payer-search-internal-input" placeholder="Search for your insurance plan..." autocomplete="off">
                    </div>
                    <div class="quiz-payer-search-results"></div>
                </div>
                <p id="error-${question.id}" class="quiz-error-text quiz-error-hidden"></p>
            </div>
        `;

		if (selectedPayer && typeof selectedPayer === "string") {
			const resolvedDisplayName = this._resolvePayerDisplayName(selectedPayer);
			if (resolvedDisplayName) {
				html = html.replace('class="quiz-payer-search-trigger placeholder"', 'class="quiz-payer-search-trigger quiz-input-valid"');
				html = html.replace(placeholder, resolvedDisplayName);
			}
		}

		return html;
	}

	_attachPayerSearchListeners(question) {
		const searchTrigger = this.questionContainer.querySelector(`#question-${question.id}`);
		const dropdown = this.questionContainer.querySelector(`#search-dropdown-${question.id}`);

		if (searchTrigger && dropdown) {
			this._setupPayerSearchBehavior(question, searchTrigger, dropdown, selectedPayer => {
				this.handleAnswer(selectedPayer);
			});
		}
	}

	_attachPayerSearchFormListeners(question) {
		setTimeout(() => {
			const searchTrigger = this.questionContainer.querySelector(`#question-${question.id}`);
			const dropdown = this.questionContainer.querySelector(`#search-dropdown-${question.id}`);

			if (searchTrigger && dropdown) {
				this._setupPayerSearchBehavior(question, searchTrigger, dropdown, selectedPayer => {
					this.handleFormAnswer(question.id, selectedPayer);
					this.updateNavigation();
				});
			}
		}, 100);
	}

	_setupPayerSearchBehavior(question, searchTrigger, dropdown, onSelectCallback) {
		let isOpen = false;
		const internalSearchInput = dropdown.querySelector(".quiz-payer-search-internal-input");
		const container = searchTrigger.closest(".quiz-payer-search-container");

		searchTrigger.addEventListener("click", () => {
			if (isOpen) {
				this._closePayerSearchDropdown(dropdown, container, searchTrigger);
				isOpen = false;
			} else {
				this._openPayerSearchDropdown(dropdown, container, searchTrigger);
				isOpen = true;
				this._showInitialPayerList(dropdown, onSelectCallback);
				setTimeout(() => internalSearchInput.focus(), 50);
			}
		});

		internalSearchInput.addEventListener("input", () => {
			const query = internalSearchInput.value.trim();
			if (query.length > 0) {
				setTimeout(() => this._searchPayers(query, dropdown, onSelectCallback), 300);
			} else {
				this._showInitialPayerList(dropdown, onSelectCallback);
			}
		});

		document.addEventListener("click", e => {
			if (!container.contains(e.target)) {
				this._closePayerSearchDropdown(dropdown, container, searchTrigger);
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
		try {
			const results = this._filterCommonPayers(query);
			this._renderSearchResults(results, query, dropdown, onSelectCallback);
		} catch (error) {
			console.error("Payer search error:", error);
			const resultsContainer = dropdown.querySelector(".quiz-payer-search-results");
			if (resultsContainer) {
				resultsContainer.innerHTML = `<div class="quiz-payer-search-error">Error searching. Please try again.</div>`;
			}
		}
	}

	_filterCommonPayers(query) {
		const commonPayers = this.quizData.commonPayers || [];
		const lowerQuery = query.toLowerCase();

		return commonPayers
			.filter(payer => {
				return payer.displayName.toLowerCase().includes(lowerQuery) || payer.stediId.toLowerCase().includes(lowerQuery) || payer.aliases.some(alias => alias.toLowerCase().includes(lowerQuery));
			})
			.map(payer => ({ payer }))
			.slice(0, 5);
	}

	_renderSearchResults(results, query, dropdown, onSelectCallback) {
		const resultsContainer = dropdown.querySelector(".quiz-payer-search-results");
		if (!resultsContainer) return;

		if (results.length === 0) {
			resultsContainer.innerHTML = `<div class="quiz-payer-search-no-results">No insurance plans found.</div>`;
		} else {
			const resultsHTML = results
				.map((item, index) => {
					const payer = item.payer;
					const highlightedName = this._highlightSearchTerm(payer.displayName, query);
					return `
                    <div class="quiz-payer-search-item" data-index="${index}">
                        <div class="quiz-payer-search-item-name">${highlightedName}</div>
                        <div class="quiz-payer-search-item-details">
                            <span class="quiz-payer-search-item-id">${payer.stediId}</span>
                            ${payer.aliases?.length > 0 ? `• ${payer.aliases.slice(0, 2).join(", ")}` : ""}
                        </div>
                    </div>
                `;
				})
				.join("");

			resultsContainer.innerHTML = resultsHTML;

			const resultItems = resultsContainer.querySelectorAll(".quiz-payer-search-item");
			const container = dropdown.closest(".quiz-payer-search-container");
			const searchTrigger = container.querySelector(".quiz-payer-search-trigger");

			resultItems.forEach((item, index) => {
				item.addEventListener("click", () => {
					this._selectPayer(results[index].payer, searchTrigger, dropdown, onSelectCallback);
				});
			});
		}

		dropdown.classList.add("visible");
		dropdown.style.display = "block";
	}

	_selectPayer(payer, searchTrigger, dropdown, onSelectCallback) {
		const triggerText = searchTrigger.querySelector(".quiz-payer-search-trigger-text");
		if (triggerText) {
			triggerText.textContent = payer.displayName;
		}

		searchTrigger.classList.remove("placeholder");
		searchTrigger.classList.add("quiz-input-valid");

		const container = searchTrigger.closest(".quiz-payer-search-container");
		this._closePayerSearchDropdown(dropdown, container, searchTrigger);

		onSelectCallback(payer.primaryPayerId);
	}

	_openPayerSearchDropdown(dropdown, container, searchTrigger) {
		dropdown.classList.add("visible");
		dropdown.style.display = "block";
		container.classList.add("open");
		searchTrigger.setAttribute("aria-expanded", "true");
	}

	_closePayerSearchDropdown(dropdown, container, searchTrigger) {
		dropdown.classList.remove("visible");
		dropdown.style.display = "none";
		container.classList.remove("open");
		searchTrigger.setAttribute("aria-expanded", "false");

		const internalInput = dropdown.querySelector(".quiz-payer-search-internal-input");
		if (internalInput) {
			internalInput.value = "";
		}
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

	// =============================================================================
	// FORM PROCESSING HELPERS
	// =============================================================================

	_processFormQuestions(questions) {
		let html = "";
		let i = 0;

		while (i < questions.length) {
			const question = questions[i];
			const response = this.responses.find(r => r.questionId === question.id) || { answer: null };

			const pairs = this.config.questionPairs || {};

			// Check for member ID + group number pair
			if (question.id === pairs.memberIdFields?.[0] && questions[i + 1]?.id === pairs.memberIdFields?.[1]) {
				const groupNumberResponse = this.responses.find(r => r.questionId === questions[i + 1].id) || { answer: null };
				html += this._generateFormFieldPair(question, questions[i + 1], response, groupNumberResponse);
				i += 2;
				continue;
			}

			// Check for name pair
			if (question.id === pairs.nameFields?.[0] && questions[i + 1]?.id === pairs.nameFields?.[1]) {
				const lastNameResponse = this.responses.find(r => r.questionId === questions[i + 1].id) || { answer: null };
				html += this._generateFormFieldPair(question, questions[i + 1], response, lastNameResponse);
				i += 2;
				continue;
			}

			// Check for contact pair
			if (question.id === pairs.contactFields?.[0] && questions[i + 1]?.id === pairs.contactFields?.[1]) {
				const phoneResponse = this.responses.find(r => r.questionId === questions[i + 1].id) || { answer: null };
				html += this._generateFormFieldPair(question, questions[i + 1], response, phoneResponse);
				i += 2;
				continue;
			}

			// Check for date part group
			if (question.type === "date-part" && question.part === "month") {
				const dayQuestion = questions[i + 1];
				const yearQuestion = questions[i + 2];

				if (dayQuestion?.type === "date-part" && dayQuestion.part === "day" && yearQuestion?.type === "date-part" && yearQuestion.part === "year") {
					html += this._generateDateGroup(question, dayQuestion, yearQuestion);
					i += 3;
					continue;
				}
			}

			// Regular single question
			const tooltips = this.quizData.validation?.tooltips || {};
			const helpIcon = tooltips[question.id] ? this._generateHelpIcon(question.id, tooltips[question.id]) : "";

			html += `
                <div class="quiz-question-section">
                    <label class="quiz-label" for="question-${question.id}">
                        ${question.text}${helpIcon}
                    </label>
                    ${question.helpText ? `<p class="quiz-text-sm">${question.helpText}</p>` : ""}
                    ${this._renderQuestionByType(question, response)}
                </div>
            `;
			i++;
		}

		return html;
	}

	_generateFormFieldPair(leftQuestion, rightQuestion, leftResponse, rightResponse) {
		const leftInput = this._renderQuestionByType(leftQuestion, leftResponse);
		const rightInput = this._renderQuestionByType(rightQuestion, rightResponse);

		const tooltips = this.quizData.validation?.tooltips || {};
		const leftHelpIcon = tooltips[leftQuestion.id] ? this._generateHelpIcon(leftQuestion.id, tooltips[leftQuestion.id]) : "";
		const rightHelpIcon = tooltips[rightQuestion.id] ? this._generateHelpIcon(rightQuestion.id, tooltips[rightQuestion.id]) : "";

		return `
            <div class="quiz-grid-2-form">
                <div>
                    <label class="quiz-label" for="question-${leftQuestion.id}">
                        ${leftQuestion.text}${leftHelpIcon}
                    </label>
                    ${leftInput}
                </div>
                <div>
                    <label class="quiz-label" for="question-${rightQuestion.id}">
                        ${rightQuestion.text}${rightHelpIcon}
                    </label>
                    ${rightInput}
                </div>
            </div>
        `;
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
		this._stopDynamicLoader();
		this._hideElement(this.questions);
		this._showElement(this.error);

		const errorTitle = this.error.querySelector("h3");
		const errorMessage = this.error.querySelector("p");

		if (errorTitle) errorTitle.textContent = title;
		if (errorMessage) errorMessage.textContent = message;
	}
}

// =============================================================================
// INITIALIZATION
// =============================================================================

document.addEventListener("DOMContentLoaded", () => {
	const quiz = new ProductQuiz();
	window.productQuiz = quiz; // For debugging
});
