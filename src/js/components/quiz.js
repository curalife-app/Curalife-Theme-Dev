/**
 * Product Quiz for Shopify
 *
 * This script handles the product quiz functionality.
 * It loads quiz data from a JSON file and guides the user through
 * a series of questions to provide product recommendations.
 */

// Configuration constants
const QUIZ_CONFIG = {
	AUTO_ADVANCE_DELAY: 600,
	WEBHOOK_TIMEOUT: 8000,
	FORM_STEP_IDS: ["step-insurance", "step-contact"],
	QUESTION_PAIRS: {
		MEMBER_ID_FIELDS: ["q4", "q4_group"],
		NAME_FIELDS: ["q7", "q8"],
		DATE_PARTS: ["q6_month", "q6_day", "q6_year"]
	},
	ELEMENT_SELECTORS: {
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
	}
};

class ProductQuiz {
	constructor(options = {}) {
		// Initialize DOM elements
		this._initializeDOMElements();
		if (!this._isInitialized) return;

		// Comprehensive check for essential elements
		const essentialElements = {
			intro: this.intro,
			questions: this.questions,
			results: this.results,
			error: this.error,
			loading: this.loading,
			// eligibilityCheck is optional for some flows initially
			progressBar: this.progressBar,
			questionContainer: this.questionContainer,
			navigationButtons: this.navigationButtons,
			prevButton: this.prevButton,
			nextButton: this.nextButton
		};

		for (const key in essentialElements) {
			if (!essentialElements[key]) {
				console.error(`ProductQuiz: Essential DOM element ".${key}" or "#${key}" is missing. Quiz cannot start reliably.`);
				// Display a user-facing error directly in the quiz container
				this.container.innerHTML =
					'<div class="quiz-error quiz-critical-error">' +
					'<h3 class="quiz-subtitle quiz-error-text">Quiz Error</h3>' +
					'<p class="quiz-text">A critical component of the quiz is missing. Please ensure the page is loaded correctly or contact support.</p>' +
					"</div>";
				this._isInitialized = false;
				return;
			}
		}
		this._isInitialized = true;

		// Check if we found all the required elements
		console.log("Quiz elements found:", {
			intro: !!this.intro,
			questions: !!this.questions,
			results: !!this.results,
			error: !!this.error,
			loading: !!this.loading,
			eligibilityCheck: !!this.eligibilityCheck,
			progressBar: !!this.progressBar,
			questionContainer: !!this.questionContainer,
			navigationButtons: !!this.navigationButtons,
			prevButton: !!this.prevButton,
			nextButton: !!this.nextButton,
			startButton: !!this.startButton
		});

		// Options
		this.dataUrl = options.dataUrl || this.container.getAttribute("data-quiz-url") || "/apps/product-quiz/data.json";

		// State
		this.quizData = null;
		this.currentStepIndex = 0;
		this.currentQuestionIndex = 0; // For steps with multiple questions
		this.responses = [];
		this.submitting = false;

		// Initialize
		this.init();
	}

	// Helper method to show an element
	_showElement(element) {
		if (element) {
			element.classList.remove("hidden");
		}
	}

	// Helper method to hide an element
	_hideElement(element) {
		if (element) {
			element.classList.add("hidden");
		}
	}

	// Initialize DOM elements using configuration
	_initializeDOMElements() {
		this.container = document.querySelector(QUIZ_CONFIG.ELEMENT_SELECTORS.MAIN_CONTAINER);
		if (!this.container) {
			console.error("ProductQuiz: Main container not found. Quiz cannot start.");
			this._isInitialized = false;
			return;
		}

		// Select all DOM elements
		const selectors = QUIZ_CONFIG.ELEMENT_SELECTORS;
		this.intro = this.container.querySelector(selectors.INTRO);
		this.questions = this.container.querySelector(selectors.QUESTIONS);
		this.results = this.container.querySelector(selectors.RESULTS);
		this.error = this.container.querySelector(selectors.ERROR);
		this.loading = this.container.querySelector(selectors.LOADING);
		this.eligibilityCheck = this.container.querySelector(selectors.ELIGIBILITY_CHECK);
		this.progressBar = this.container.querySelector(selectors.PROGRESS_BAR);
		this.questionContainer = this.container.querySelector(selectors.QUESTION_CONTAINER);
		this.navigationButtons = this.container.querySelector(selectors.NAVIGATION);
		this.prevButton = this.container.querySelector(selectors.PREV_BUTTON);
		this.nextButton = this.container.querySelector(selectors.NEXT_BUTTON);
		this.startButton = this.container.querySelector(selectors.START_BUTTON);
		this.navHeader = this.container.querySelector("#quiz-nav-header");
		this.progressSection = this.container.querySelector("#quiz-progress-section");

		this._isInitialized = true;
	}

	async init() {
		console.log("Initializing quiz...");

		if (!this._isInitialized) {
			console.warn("ProductQuiz: Initialization skipped as essential elements are missing or an error occurred in constructor.");
			return;
		}

		// Add back button event listener
		if (this.navHeader) {
			const backButton = this.navHeader.querySelector("#quiz-back-button");
			if (backButton) {
				backButton.addEventListener("click", () => {
					// On the first step, go to telemedicine page
					if (this.currentStepIndex === 0) {
						window.location.href = "/pages/telemedicine";
					} else {
						this.goToPreviousStep();
					}
				});
			}
		}

		if (this.nextButton) {
			// First remove any existing event listeners to prevent duplicates
			this.nextButton.removeEventListener("click", this.nextButtonHandler);

			// Define handler with explicit debugging
			this.nextButtonHandler = e => {
				console.log("Next button clicked - button state:", {
					disabled: this.nextButton.disabled,
					text: this.nextButton.textContent,
					step: this.currentStepIndex,
					stepId: this.getCurrentStep() ? this.getCurrentStep().id : "unknown"
				});

				// Only proceed if button is not disabled
				if (!this.nextButton.disabled) {
					this.goToNextStep();
				} else {
					console.log("Button is disabled, not proceeding");
				}
			};

			// Add listener
			this.nextButton.addEventListener("click", this.nextButtonHandler);
			console.log("Next button event listener attached");
		}

		console.log("Quiz initialization complete, loading first step...");
		this._loadAndDisplayFirstStep();
	}

	async _loadAndDisplayFirstStep() {
		// Check that we have all required elements before proceeding
		if (!this._isInitialized || !this.questions || !this.loading) {
			console.error("Required quiz elements are missing or quiz not initialized:", {
				initialized: this._isInitialized,
				questions: !!this.questions,
				loading: !!this.loading
			});
			return;
		}

		// Hide intro and questions, show only loading indicator initially
		this._hideElement(this.intro);
		this._hideElement(this.questions);
		this._showElement(this.loading);

		try {
			console.log("Starting quiz data load...");

			// Fetch quiz data
			await this.loadQuizData();
			console.log("Quiz data loaded successfully");

			// Initialize responses array
			this.responses = [];

			// Check that quiz data was loaded properly
			if (!this.quizData || !this.quizData.steps) {
				console.error("Quiz data is missing or incomplete:", this.quizData);
				this._hideElement(this.loading);
				this._showElement(this.error);
				return;
			}

			// Initialize responses for all questions across all steps
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
					// For info-only steps
					this.responses.push({
						stepId: step.id,
						questionId: step.id,
						answer: null
					});
				}
			});

			// Check for test mode and populate test data if enabled
			this._checkAndApplyTestData();

			// Hide loading indicator and show questions container, nav header, and progress section
			this._hideElement(this.loading);
			this._showElement(this.questions);
			this._showElement(this.navHeader);
			this._showElement(this.progressSection);

			// Render the first step
			this.renderCurrentStep();
			this.updateNavigation();
		} catch (error) {
			console.error("Failed to load quiz data:", error);
			this._hideElement(this.loading);
			this._showElement(this.error);
		}
	}

	async loadQuizData() {
		try {
			const response = await fetch(this.dataUrl);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const text = await response.text();
			console.log("Raw JSON response:", text.substring(0, 100) + "...");

			try {
				this.quizData = JSON.parse(text);
				console.log("Quiz data loaded successfully:", this.quizData.id, this.quizData.title);
				return this.quizData;
			} catch (parseError) {
				console.error("JSON parse error:", parseError);
				console.error("Invalid JSON received, first 200 characters:", text.substring(0, 200));
				throw new Error("Failed to parse quiz data: " + parseError.message);
			}
		} catch (error) {
			console.error("Failed to load quiz data:", error);
			throw error;
		}
	}

	// Get the current step
	getCurrentStep() {
		// Guard against null quizData
		if (!this.quizData || !this.quizData.steps) {
			return null;
		}
		return this.quizData.steps[this.currentStepIndex];
	}

	// Get the current question (if the step has questions)
	getCurrentQuestion() {
		const step = this.getCurrentStep();
		if (step.questions) {
			return step.questions[this.currentQuestionIndex];
		}
		return null;
	}

	// Get response for the current question
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

	// Helper method to detect form-style steps (multiple questions shown at once)
	isFormStep(stepId) {
		return QUIZ_CONFIG.FORM_STEP_IDS.includes(stepId);
	}

	renderCurrentStep() {
		const step = this.getCurrentStep();
		if (!step) {
			console.error("No step found at index", this.currentStepIndex);
			return;
		}

		// Update progress bar
		this._updateProgressBar();

		// Generate step HTML
		const stepHTML = this._generateStepHTML(step);
		this.questionContainer.innerHTML = stepHTML;

		// Handle step acknowledgment for info-only steps
		this._handleStepAcknowledgment(step);

		// Attach event listeners
		this._attachStepEventListeners(step);

		// Update navigation state
		this.updateNavigation();

		// Add legal text after navigation (if it exists and not a form step)
		if (step.legal && !this.isFormStep(step.id)) {
			this._addLegalTextAfterNavigation(step.legal);
		}
	}

	_updateProgressBar() {
		const progress = ((this.currentStepIndex + 1) / this.quizData.steps.length) * 100;
		if (this.progressBar) {
			this.progressBar.classList.add("quiz-progress-bar-animated");
			this.progressBar.style.setProperty("--progress-width", `${progress}%`);

			// Update progress indicator position and visibility
			const progressIndicator = this.container.querySelector(".quiz-progress-indicator");
			if (progressIndicator) {
				// Get the actual container width instead of hardcoded 480px
				const progressContainer = this.container.querySelector(".quiz-progress-container");
				const containerWidth = progressContainer ? progressContainer.offsetWidth : 480;

				// Calculate indicator position based on actual container width
				// Use smaller indicator width for mobile (16px vs 26px)
				const isMobile = window.innerWidth <= 768;
				const indicatorHalfWidth = isMobile ? 16 : 26;
				const indicatorPosition = (progress / 100) * containerWidth - indicatorHalfWidth;

				progressIndicator.style.left = `${indicatorPosition}px`;
				if (progress > 0) {
					progressIndicator.classList.add("visible");
				} else {
					progressIndicator.classList.remove("visible");
				}
			}
		}
	}

	_generateStepHTML(step) {
		let stepHTML = `<div class="animate-fade-in">`;

		// Add step info section
		stepHTML += this._generateStepInfoHTML(step);

		// Add questions section
		if (step.questions && step.questions.length > 0) {
			if (this.isFormStep(step.id)) {
				stepHTML += this._generateFormStepHTML(step);
			} else {
				stepHTML += this._generateWizardStepHTML(step);
			}
		} else if (!step.info) {
			stepHTML += `<p class="quiz-error-text">Step configuration error. Please contact support.</p>`;
		}

		stepHTML += "</div>";
		return stepHTML;
	}

	_generateFormStepHTML(step) {
		const isLastStep = this.currentStepIndex === this.quizData.steps.length - 1;
		const buttonText = isLastStep ? step.ctaText || "Finish Quiz" : step.ctaText || "Continue";

		return `
			<div class="quiz-form-container">
				${step.info && step.info.formSubHeading ? `<h4 class="quiz-heading">${step.info.formSubHeading}</h4>` : ""}
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

		// Add question title and help text
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

		// Add question-specific HTML
		html += this._renderQuestionByType(question, response);

		return html;
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

		// Enable next button for info-only steps
		if (!step.questions || step.questions.length === 0) {
			setTimeout(() => {
				this.nextButton.disabled = false;
			}, 0);
		}
	}

	_attachStepEventListeners(step) {
		if (!step.questions || step.questions.length === 0) return;

		console.log("Attaching step event listeners for step:", step.id, "isFormStep:", this.isFormStep(step.id));

		if (this.isFormStep(step.id)) {
			console.log("This is a form step, attaching listeners to all questions");
			// Attach listeners to all form questions
			step.questions.forEach(question => {
				console.log("Attaching form listener for question:", question.id, question.type);
				this.attachFormQuestionListener(question);
			});

			// Attach listener to the form button
			const formButton = this.questionContainer.querySelector("#quiz-form-next-button");
			if (formButton) {
				formButton.removeEventListener("click", this.formButtonHandler);
				this.formButtonHandler = e => {
					console.log("Form button clicked");
					if (!formButton.disabled) {
						this.goToNextStep();
					}
				};
				formButton.addEventListener("click", this.formButtonHandler);
			}
		} else {
			console.log("This is a wizard step, attaching listener to current question");
			// Attach listener to current wizard question
			const currentQuestion = step.questions[this.currentQuestionIndex];
			if (currentQuestion) {
				console.log("Attaching wizard listener for question:", currentQuestion.id, currentQuestion.type);
				this.attachQuestionEventListeners(currentQuestion);
			}
		}
	}

	renderMultipleChoice(question, response) {
		let html = '<div class="quiz-grid-2">';

		question.options.forEach(option => {
			const isSelected = response.answer === option.id;
			html += `
				<label for="${option.id}" class="quiz-option-card">
					<input type="radio" id="${option.id}" name="question-${question.id}" value="${option.id}" class="quiz-sr-only"
						${isSelected ? "checked" : ""}>
					<div class="quiz-option-button ${isSelected ? "selected" : ""}">
						<div class="quiz-option-text">
							<div class="quiz-option-text-content">${option.text}</div>
						</div>
						${isSelected ? '<div class="quiz-checkmark"><svg viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg></div>' : ""}
					</div>
				</label>
			`;
		});

		html += "</div>";
		return html;
	}

	renderCheckbox(question, response) {
		const selectedOptions = Array.isArray(response.answer) ? response.answer : [];
		console.log(`Rendering checkbox for ${question.id}, selectedOptions:`, selectedOptions);

		// Use card style for medical conditions and other non-consent checkboxes
		const useCardStyle = question.id !== "consent";
		const isConsent = question.id === "consent";

		if (useCardStyle) {
			// Card-style checkboxes (similar to multiple-choice)
			let html = '<div class="quiz-grid-2">';

			question.options.forEach(option => {
				const isSelected = selectedOptions.includes(option.id);
				html += `
					<label for="${option.id}" class="quiz-option-card">
						<input type="checkbox" id="${option.id}" name="question-${question.id}" value="${option.id}" class="quiz-sr-only"
							${isSelected ? "checked" : ""}>
						<div class="quiz-option-button ${isSelected ? "selected" : ""}">
							<div class="quiz-option-text">
								<div class="quiz-option-text-content">${option.text}</div>
							</div>
							${isSelected ? '<div class="quiz-checkmark"><svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.79158 18.75C4.84404 18.75 0.833252 14.7393 0.833252 9.79168C0.833252 4.84413 4.84404 0.833344 9.79158 0.833344C14.7392 0.833344 18.7499 4.84413 18.7499 9.79168C18.7499 14.7393 14.7392 18.75 9.79158 18.75ZM13.7651 7.82516C14.0598 7.47159 14.012 6.94613 13.6584 6.65148C13.3048 6.35685 12.7793 6.40462 12.4848 6.75818L8.90225 11.0572L7.04751 9.20243C6.72207 8.87701 6.19444 8.87701 5.86899 9.20243C5.54356 9.52784 5.54356 10.0555 5.86899 10.3809L8.369 12.8809C8.53458 13.0465 8.76208 13.1348 8.996 13.1242C9.22992 13.1135 9.44858 13.005 9.59842 12.8252L13.7651 7.82516Z" fill="#418865"/></svg></div>' : ""}
						</div>
					</label>
				`;
			});

			html += "</div>";
			return html;
		} else {
			// Traditional checkbox style for consent and other special cases
			let html = '<div class="quiz-space-y-3 quiz-spacing-container">';

			question.options.forEach(option => {
				html += `
					<div class="quiz-checkbox-container${isConsent ? " consent-container" : ""}">
						<input type="checkbox" id="${option.id}" name="question-${question.id}" value="${option.id}" class="quiz-checkbox-input${isConsent ? " consent-checkbox" : ""}"
							${selectedOptions.includes(option.id) ? "checked" : ""}>
						<label class="quiz-checkbox-label" for="${option.id}">${option.text}</label>
					</div>
				`;
			});

			html += "</div>";
			return html;
		}
	}

	renderDropdown(question, response) {
		let options = question.options || [];
		const placeholder = question.placeholder || "Select an option";

		let html = `
			<div>
				<select id="question-${question.id}" class="quiz-select">
					<option value="">${placeholder}</option>
		`;

		options.forEach(option => {
			html += `<option value="${option.id}" ${response.answer === option.id ? "selected" : ""}>${option.text}</option>`;
		});

		html += `
				</select>
				<p id="error-${question.id}" class="quiz-error-text quiz-error-hidden"></p>
			</div>
		`;
		return html;
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

	renderDatePart(question, response) {
		const part = question.part;
		let options = [];

		if (part === "month") {
			options = [
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
			options = Array.from({ length: 31 }, (_, i) => {
				const day = String(i + 1).padStart(2, "0");
				return { id: day, text: day };
			});
		} else if (part === "year") {
			// PRD requirement: Years 1920-2007 (minimum 18 years old)
			const endYear = 2007;
			const startYear = 1920;
			const yearCount = endYear - startYear + 1;
			options = Array.from({ length: yearCount }, (_, i) => {
				const year = String(endYear - i);
				return { id: year, text: year };
			});
		}

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
					<span>1</span>
					<span>5</span>
					<span>10</span>
				</div>
			</div>
		`;
	}

	attachQuestionEventListeners(question) {
		// Skip event listeners for info-only steps or if question is null
		if (!question) return;

		switch (question.type) {
			case "multiple-choice":
				const radioInputs = this.questionContainer.querySelectorAll(`input[name="question-${question.id}"]`);
				if (radioInputs.length === 0) {
					console.warn(`No radio inputs found for question ${question.id}`);
					return;
				}
				radioInputs.forEach(input => {
					input.addEventListener("change", () => {
						this.handleAnswer(input.value);
					});
				});
				break;

			case "checkbox":
				const checkboxInputs = this.questionContainer.querySelectorAll(`input[name="question-${question.id}"]`);
				if (checkboxInputs.length === 0) {
					console.warn(`No checkbox inputs found for question ${question.id}`);
					return;
				}
				console.log(`Found ${checkboxInputs.length} checkbox inputs for ${question.id}`);

				checkboxInputs.forEach(input => {
					// First remove any existing listeners to avoid duplicates
					input.removeEventListener("change", input._changeHandler);

					// Define the handler
					input._changeHandler = () => {
						console.log(`Checkbox ${input.id} changed, checked:`, input.checked);
						let answerToSet;
						// If this is a single checkbox option field (like consent)
						if (question.options.length === 1) {
							const isChecked = input.checked;
							console.log(`Single checkbox consent: ${isChecked ? "checked" : "unchecked"}`);
							// this.handleFormAnswer(question.id, isChecked ? [input.value] : []);
							answerToSet = isChecked ? [input.value] : [];
						} else {
							// Multiple option checkbox field
							const selectedOptions = Array.from(checkboxInputs)
								.filter(cb => cb.checked)
								.map(cb => cb.value);
							console.log(`Multiple checkbox options selected:`, selectedOptions);
							// this.handleFormAnswer(question.id, selectedOptions);
							answerToSet = selectedOptions;
						}
						this.handleAnswer(answerToSet); // Use handleAnswer for wizard steps
					};

					// Add the handler
					input.addEventListener("change", input._changeHandler);
				});
				break;

			case "dropdown":
			case "date-part":
				const dropdownInput = this.questionContainer.querySelector(`#question-${question.id}`);
				if (!dropdownInput) {
					console.warn(`Dropdown input not found for question ${question.id}`);
					return;
				}
				dropdownInput.addEventListener("change", () => {
					this.handleFormAnswer(question.id, dropdownInput.value);
					// Update dropdown color when value is selected
					this._updateDropdownColor(dropdownInput);

					// Clear error state if a valid option is selected
					if (dropdownInput.value && dropdownInput.value !== "") {
						const errorEl = this.questionContainer.querySelector(`#error-${question.id}`);
						if (errorEl) {
							dropdownInput.classList.remove("quiz-input-error");
							dropdownInput.classList.add("quiz-input-valid");
							errorEl.classList.add("quiz-error-hidden");
							errorEl.classList.remove("quiz-error-visible");
						}
					}

					// Note: No updateNavigation call since button is always enabled in forms
				});
				// Set initial color state
				this._updateDropdownColor(dropdownInput);
				break;

			case "payer-search":
				this._attachPayerSearchListeners(question);
				break;

			case "text":
			case "date":
				const textInput = this.questionContainer.querySelector(`#question-${question.id}`);
				if (!textInput) {
					console.warn(`Text input not found for question ${question.id}`);
					return;
				}
				// Remove any existing listeners
				textInput.removeEventListener("input", textInput._inputHandler);
				textInput.removeEventListener("change", textInput._changeHandler);

				// Define the handler
				textInput._inputHandler = () => {
					console.log(`Text input ${question.id} changed:`, textInput.value);

					// Use enhanced validation
					const validationResult = this._validateFieldValue(question, textInput.value);
					const isValid = this._updateFieldValidationState(textInput, question, validationResult);

					// Always update the response value for real-time tracking
					this.handleFormAnswer(question.id, textInput.value);

					// Note: We don't call updateNavigation here since button is always enabled
				};

				// Add both input and change handlers
				textInput.addEventListener("input", textInput._inputHandler);
				textInput.addEventListener("change", textInput._inputHandler);
				break;

			case "textarea":
				const textareaInput = this.questionContainer.querySelector(`#question-${question.id}`);
				if (!textareaInput) {
					console.warn(`Textarea input not found for question ${question.id}`);
					return;
				}
				textareaInput.addEventListener("input", () => {
					this.handleAnswer(textareaInput.value);
				});
				break;

			case "rating":
				const ratingInput = this.questionContainer.querySelector(`#question-${question.id}`);
				if (!ratingInput) {
					console.warn(`Rating input not found for question ${question.id}`);
					return;
				}
				ratingInput.addEventListener("input", () => {
					this.handleAnswer(Number.parseInt(ratingInput.value, 10));
				});
				break;

			default:
				console.warn(`Unknown question type: ${question.type}`);
		}
	}

	handleAnswer(answer) {
		if (!this.quizData) return;

		const step = this.getCurrentStep();
		if (!step) {
			console.error("Cannot handle answer: No current step found");
			return;
		}

		// If it's a step with questions, update the response for the current question
		if (step.questions && step.questions.length > 0) {
			const question = step.questions[this.currentQuestionIndex];
			if (!question) {
				console.error("Cannot handle answer: No question found at index", this.currentQuestionIndex);
				return;
			}

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

			// Auto-advance for single-choice questions (multiple-choice, dropdown)
			// but not for form fields or multi-select questions
			const shouldAutoAdvance = this.shouldAutoAdvance(question);

			if (shouldAutoAdvance) {
				// For single-choice questions (radio buttons, dropdowns)
				this.handleSingleChoiceAutoAdvance(answer);
			} else {
				// For non-auto-advance questions (checkboxes, text inputs, etc.)
				// Update visual state without full re-render to avoid animation conflicts
				if (question.type === "checkbox") {
					this.updateCheckboxVisualState(question, answer);
				} else {
					// For other non-auto-advance questions, re-render immediately
					this.renderCurrentStep();
				}
			}

			return; // Return early since renderCurrentStep calls updateNavigation
		} else if (step.info) {
			// For info-only steps, mark as acknowledged
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

			// For info steps, the next button should always be enabled
			this.nextButton.disabled = false;
		}

		this.updateNavigation();
	}

	// Helper method to determine if a question should auto-advance
	shouldAutoAdvance(question) {
		// Auto-advance for single-choice questions
		if (question.type === "multiple-choice") {
			return true;
		}

		// Auto-advance for dropdowns (single select)
		if (question.type === "dropdown") {
			return true;
		}

		// Don't auto-advance for checkbox questions - they are multi-select
		// Don't auto-advance for form fields, text inputs, etc.
		return false;
	}

	// Handle auto-advance animation for single-choice questions
	handleSingleChoiceAutoAdvance(answer) {
		// First, clear all previous selections immediately
		const allOptionButtons = this.questionContainer.querySelectorAll(".quiz-option-button");
		allOptionButtons.forEach(button => {
			button.classList.remove("selected", "processing", "auto-advance-feedback");
			const existingCheckmark = button.querySelector(".quiz-checkmark");
			if (existingCheckmark) {
				existingCheckmark.remove();
			}
		});

		// Apply visual feedback by showing the checkmark immediately for the new selection
		const selectedElement = this.questionContainer.querySelector(`input[value="${answer}"]:checked`);
		if (selectedElement) {
			const optionButton = selectedElement.closest(".quiz-option-card")?.querySelector(".quiz-option-button");
			if (optionButton) {
				// Add selected state and checkmark
				optionButton.classList.add("selected", "processing");

				// Add checkmark
				const checkmark = document.createElement("div");
				checkmark.className = "quiz-checkmark";
				checkmark.innerHTML =
					'<svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.79158 18.75C4.84404 18.75 0.833252 14.7393 0.833252 9.79168C0.833252 4.84413 4.84404 0.833344 9.79158 0.833344C14.7392 0.833344 18.7499 4.84413 18.7499 9.79168C18.7499 14.7393 14.7392 18.75 9.79158 18.75ZM13.7651 7.82516C14.0598 7.47159 14.012 6.94613 13.6584 6.65148C13.3048 6.35685 12.7793 6.40462 12.4848 6.75818L8.90225 11.0572L7.04751 9.20243C6.72207 8.87701 6.19444 8.87701 5.86899 9.20243C5.54356 9.52784 5.54356 10.0555 5.86899 10.3809L8.369 12.8809C8.53458 13.0465 8.76208 13.1348 8.996 13.1242C9.22992 13.1135 9.44858 13.005 9.59842 12.8252L13.7651 7.82516Z" fill="#418865"/></svg>';
				optionButton.appendChild(checkmark);

				// Add auto-advance feedback animation
				optionButton.classList.add("auto-advance-feedback");
			}
		}

		// Advance after showing the selection feedback
		setTimeout(() => {
			this.goToNextStep();
		}, QUIZ_CONFIG.AUTO_ADVANCE_DELAY);
	}

	// Update checkbox visual state for individual checkboxes without re-rendering
	updateCheckboxVisualState(question, answer) {
		if (!Array.isArray(answer)) return;

		// Update all checkbox states individually
		const allCheckboxes = this.questionContainer.querySelectorAll(`input[name="question-${question.id}"]`);
		allCheckboxes.forEach(checkbox => {
			const optionCard = checkbox.closest(".quiz-option-card");
			const optionButton = optionCard?.querySelector(".quiz-option-button");

			if (optionButton) {
				const shouldBeSelected = answer.includes(checkbox.value);
				const isCurrentlySelected = optionButton.classList.contains("selected");

				// Only update if the state has changed
				if (shouldBeSelected !== isCurrentlySelected) {
					if (shouldBeSelected) {
						// Add selected state
						optionButton.classList.add("selected");
						checkbox.checked = true;

						// Add checkmark with animation
						if (!optionButton.querySelector(".quiz-checkmark")) {
							const checkmark = document.createElement("div");
							checkmark.className = "quiz-checkmark";
							checkmark.innerHTML =
								'<svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.79158 18.75C4.84404 18.75 0.833252 14.7393 0.833252 9.79168C0.833252 4.84413 4.84404 0.833344 9.79158 0.833344C14.7392 0.833344 18.7499 4.84413 18.7499 9.79168C18.7499 14.7393 14.7392 18.75 9.79158 18.75ZM13.7651 7.82516C14.0598 7.47159 14.012 6.94613 13.6584 6.65148C13.3048 6.35685 12.7793 6.40462 12.4848 6.75818L8.90225 11.0572L7.04751 9.20243C6.72207 8.87701 6.19444 8.87701 5.86899 9.20243C5.54356 9.52784 5.54356 10.0555 5.86899 10.3809L8.369 12.8809C8.53458 13.0465 8.76208 13.1348 8.996 13.1242C9.22992 13.1135 9.44858 13.005 9.59842 12.8252L13.7651 7.82516Z" fill="#418865"/></svg>';
							optionButton.appendChild(checkmark);
						}
					} else {
						// Remove selected state
						optionButton.classList.remove("selected");
						checkbox.checked = false;

						// Remove checkmark
						const checkmark = optionButton.querySelector(".quiz-checkmark");
						if (checkmark) {
							checkmark.remove();
						}
					}
				}
			}
		});

		// Update navigation state
		this.updateNavigation();
	}

	updateNavigation() {
		const step = this.getCurrentStep();
		if (!step) {
			console.error("Cannot update navigation: No step found at index", this.currentStepIndex);
			this.nextButton.disabled = true;
			return;
		}

		// Check if this is a form-style step
		const isFormStep = this.isFormStep(step.id);

		// Check if current question is auto-advance
		const currentQuestion = step.questions && step.questions[this.currentQuestionIndex];
		const isCurrentQuestionAutoAdvance = currentQuestion && this.shouldAutoAdvance(currentQuestion);

		// Hide navigation entirely for auto-advance questions (unless it's a form step)
		if (isCurrentQuestionAutoAdvance && !isFormStep) {
			this.navigationButtons.classList.add("quiz-navigation-hidden");
			this.navigationButtons.classList.remove("quiz-navigation-visible");
			return;
		} else {
			this.navigationButtons.classList.remove("quiz-navigation-hidden");
			this.navigationButtons.classList.add("quiz-navigation-visible");
		}

		// Hide the back button
		if (this.prevButton) {
			this.prevButton.style.display = "none";
		}

		// Check if we need to show Next or Finish
		const isLastStep = this.currentStepIndex === this.quizData.steps.length - 1;
		const isLastQuestionInStep = isFormStep ? true : step.questions ? this.currentQuestionIndex === step.questions.length - 1 : true;

		// Update the button text based on the current step's ctaText
		if (isLastStep && isLastQuestionInStep) {
			this.nextButton.innerHTML = step.ctaText || "Finish Quiz";
		} else {
			this.nextButton.innerHTML = step.ctaText || "Continue";
		}

		// For form-style steps, hide external navigation and handle internal button
		if (isFormStep && step.questions) {
			// Hide the external navigation for form steps
			this.navigationButtons.classList.add("quiz-navigation-hidden");
			this.navigationButtons.classList.remove("quiz-navigation-visible");

			// Always keep the form button enabled - validation happens on click
			const formButton = this.questionContainer.querySelector("#quiz-form-next-button");
			if (formButton) {
				formButton.disabled = this.submitting; // Only disable during submission
			}
			return;
		}

		// For other steps (wizard-style steps)
		let hasAnswer;

		if (step.info && (!step.questions || step.questions.length === 0)) {
			// Info-only step
			hasAnswer = true;
		} else if (step.questions && step.questions.length > 0) {
			// Step with questions (wizard style)
			const question = step.questions[this.currentQuestionIndex];
			if (!question) {
				console.error("Cannot update navigation: No question found at index", this.currentQuestionIndex, "for step", step.id);
				this.nextButton.disabled = true; // Disable if question is missing
				return;
			}

			if (!question.required) {
				hasAnswer = true; // Not required, can proceed
			} else {
				const response = this.responses.find(r => r.questionId === question.id);
				if (!response || response.answer === null || response.answer === undefined) {
					hasAnswer = false;
				} else if (question.type === "checkbox") {
					// For checkboxes, check if any option is selected (must be non-empty array)
					hasAnswer = Array.isArray(response.answer) && response.answer.length > 0;
				} else if (typeof response.answer === "string") {
					// For text fields, ensure non-empty
					hasAnswer = response.answer.trim() !== "";
				} else {
					hasAnswer = true; // Other types with non-null/undefined answer are considered answered
				}
			}
		} else {
			// This case implies a misconfigured step (no info and no questions).
			// Button should be disabled.
			hasAnswer = false;
			console.warn(`Step ${step.id} has no info and no questions. Disabling next button.`);
		}

		this.nextButton.disabled = !hasAnswer || this.submitting;
	}

	goToPreviousStep() {
		// Don't go back if we're on the first step
		if (this.currentStepIndex <= 0) {
			return;
		}

		// Go back to previous step
		this.currentStepIndex--;
		this.currentQuestionIndex = 0; // Reset question index for the previous step
		this.renderCurrentStep();
		this.updateNavigation();
	}

	goToNextStep() {
		const currentStep = this.getCurrentStep();
		if (!currentStep) {
			console.error("Cannot go to next step: No current step found");
			return;
		}

		// Always force-enable the button when actually clicking it
		// This is a safety measure in case the disabled state is incorrectly set
		this.nextButton.disabled = false;

		console.log("Attempting to go to next step from", currentStep.id);

		// Check if this is a form-style step
		const isFormStep = this.isFormStep(currentStep.id);
		console.log(`Step ${currentStep.id} isFormStep: ${isFormStep}`);

		// If this is an info-only step, simply move to the next step
		if (currentStep.info && (!currentStep.questions || currentStep.questions.length === 0)) {
			console.log("Current step is info-only, proceeding to next step");
			if (this.currentStepIndex < this.quizData.steps.length - 1) {
				this.currentStepIndex++;
				this.currentQuestionIndex = 0; // Reset question index for the new step
				this.renderCurrentStep();
				this.updateNavigation();
			} else {
				// This is the last step, finish the quiz
				this.finishQuiz();
			}
			return;
		}

		// No special handling needed for insurance step since consent checkbox was removed

		// For form steps, special handling for next step
		if (isFormStep) {
			// Validate all form fields before proceeding
			let hasValidationErrors = false;
			const validationErrors = [];

			// Validate each question in the form step
			for (const q of currentStep.questions) {
				const resp = this.responses.find(r => r.questionId === q.id);
				const currentValue = resp ? resp.answer : null;

				// Check if required field is empty
				if (q.required) {
					let isEmpty = false;

					if (!currentValue) {
						isEmpty = true;
					} else if (q.type === "checkbox") {
						isEmpty = !Array.isArray(currentValue) || currentValue.length === 0;
					} else if (q.type === "payer-search") {
						isEmpty = !currentValue || (typeof currentValue === "string" && currentValue.trim() === "");
					} else if (typeof currentValue === "string") {
						isEmpty = currentValue.trim() === "";
					}

					if (isEmpty) {
						hasValidationErrors = true;
						validationErrors.push({ questionId: q.id, message: "This field is required" });
						continue;
					}
				}

				// For payer-search, if we have a value and it's required, validate it's a proper object
				if (q.type === "payer-search" && currentValue) {
					const validationResult = this._validateFieldValue(q, currentValue);
					if (!validationResult.isValid) {
						hasValidationErrors = true;
						validationErrors.push({ questionId: q.id, message: validationResult.errorMessage });
						continue;
					}
				}

				// For other field types, validate format
				if (currentValue && q.type !== "payer-search") {
					const validationResult = this._validateFieldValue(q, currentValue);
					if (!validationResult.isValid) {
						hasValidationErrors = true;
						validationErrors.push({ questionId: q.id, message: validationResult.errorMessage });
						continue;
					}
				}
			}

			if (hasValidationErrors) {
				// Show error messages for invalid fields
				validationErrors.forEach(error => {
					const errorEl = this.questionContainer.querySelector(`#error-${error.questionId}`);
					const input = this.questionContainer.querySelector(`#question-${error.questionId}`);

					if (input) {
						input.classList.add("quiz-input-error");
						input.classList.remove("quiz-input-valid");
					}

					if (errorEl) {
						// Show error message
						errorEl.textContent = error.message;
						errorEl.classList.remove("quiz-error-hidden");
						errorEl.classList.add("quiz-error-visible");
					}
				});

				return; // Don't proceed to next step
			}

			// If we reach here, all validations passed

			// All fields are valid, proceed to next step
			if (this.currentStepIndex < this.quizData.steps.length - 1) {
				console.log(`Moving to next step from ${this.currentStepIndex} to ${this.currentStepIndex + 1}`);
				this.currentStepIndex++;
				this.currentQuestionIndex = 0; // Reset question index for the new step
				this.renderCurrentStep();
				this.updateNavigation();
			} else {
				// This is the last step, finish the quiz
				console.log("Last step reached, finishing quiz");
				this.finishQuiz();
			}
			return;
		}

		// For wizard-style steps with multiple questions
		if (currentStep.questions && this.currentQuestionIndex < currentStep.questions.length - 1) {
			this.currentQuestionIndex++;
			this.renderCurrentStep();
			this.updateNavigation();
			return;
		}

		// If this is the last step, finish the quiz
		if (this.currentStepIndex === this.quizData.steps.length - 1) {
			this.finishQuiz();
			return;
		}

		// Otherwise, go to the next step
		this.currentStepIndex++;
		this.currentQuestionIndex = 0; // Reset question index for the new step
		this.renderCurrentStep();
		this.updateNavigation();
	}

	async finishQuiz() {
		// Get booking URL early so it's available in all error handling
		const bookingUrl = this.container.getAttribute("data-booking-url") || "/appointment-booking";

		try {
			this.submitting = true;
			this.nextButton.disabled = true;
			this.nextButton.innerHTML = `
				<div class="quiz-spinner"></div>
				Processing...
			`;

			// Extract required data from responses
			// This is directly matching what the n8n workflow expects
			let customerEmail = "";
			let firstName = "";
			let lastName = "";
			let phoneNumber = "";
			let state = "";
			let insurance = "";
			let insurancePrimaryPayerId = ""; // Add this for the workflow
			let insuranceMemberId = "";
			let groupNumber = "";
			let mainReasons = [];
			let medicalConditions = [];
			let dateOfBirth = "";
			let consent = true; // Consent is implied by proceeding through the quiz

			// Extract individual answers
			let dobMonth = "";
			let dobDay = "";
			let dobYear = "";

			this.responses.forEach(response => {
				if (response.questionId === "q9") customerEmail = response.answer || "";
				if (response.questionId === "q7") firstName = response.answer || "";
				if (response.questionId === "q8") lastName = response.answer || "";
				if (response.questionId === "q10") phoneNumber = response.answer || "";
				if (response.questionId === "q5") state = response.answer || "";
				if (response.questionId === "q3") {
					// Handle payer data - send primaryPayerId directly to workflow
					const insuranceResponse = response.answer;
					if (typeof insuranceResponse === "string" && insuranceResponse) {
						// New format: primaryPayerId is stored as the answer
						// Send the primaryPayerId directly as the insurance value
						insurance = insuranceResponse; // This is the primaryPayerId
						insurancePrimaryPayerId = insuranceResponse;
					} else if (typeof insuranceResponse === "object" && insuranceResponse !== null) {
						// Legacy payer search format - extract primaryPayerId
						insurance = insuranceResponse.primaryPayerId || insuranceResponse.stediId || "";
						insurancePrimaryPayerId = insuranceResponse.primaryPayerId || insuranceResponse.stediId || "";
					} else {
						// Legacy format or fallback
						insurance = insuranceResponse || "";
						insurancePrimaryPayerId = insuranceResponse || "";
					}
				}
				if (response.questionId === "q4") insuranceMemberId = response.answer || "";
				if (response.questionId === "q4_group") groupNumber = response.answer || "";
				if (response.questionId === "q1") mainReasons = response.answer || [];
				if (response.questionId === "q2") medicalConditions = response.answer || [];
				if (response.questionId === "q6_month") dobMonth = response.answer || "";
				if (response.questionId === "q6_day") dobDay = response.answer || "";
				if (response.questionId === "q6_year") dobYear = response.answer || "";
			});

			// Construct date of birth from parts in YYYYMMDD format
			if (dobMonth && dobDay && dobYear) {
				dateOfBirth = `${dobYear}${dobMonth.padStart(2, "0")}${dobDay.padStart(2, "0")}`;
			}

			// Format for n8n workflow
			const completedAt = new Date().toISOString();
			const quizId = "curalife-intake";
			const quizTitle = this.quizData?.title || "Find Your Perfect Dietitian";

			// Create exact payload structure that n8n expects
			const payload = {
				quizId,
				quizTitle,
				completedAt,
				customerEmail,
				firstName,
				lastName,
				phoneNumber,
				dateOfBirth,
				state,
				insurance,
				insurancePrimaryPayerId, // Add the primaryPayerId for workflow use
				insuranceMemberId,
				groupNumber,
				mainReasons,
				medicalConditions,
				consent,
				// Provide the full responses array exactly as n8n expects
				allResponses: this.responses.map(r => ({
					stepId: r.stepId,
					questionId: r.questionId,
					answer: r.answer
				}))
			};

			console.log("Sending payload to webhook:", payload);

			// Store payload for polling use
			this.lastPayload = {
				data: JSON.stringify(payload)
			};

			// Hide questions and show eligibility check indicator
			this._hideElement(this.questions);
			this._showElement(this.eligibilityCheck);

			// Get webhook URL from data attribute
			const webhookUrl = this.container.getAttribute("data-n8n-webhook");

			// Temporary override: Force the new Cloud Function URL
			const actualWebhookUrl = "https://us-central1-telemedicine-458913.cloudfunctions.net/telemedicine-webhook";

			console.log("=== WEBHOOK CONFIGURATION ===");
			console.log("Original Webhook URL:", webhookUrl);
			console.log("Using Webhook URL:", actualWebhookUrl);
			console.log("Booking URL:", bookingUrl);
			console.log("============================");

			if (!actualWebhookUrl) {
				console.warn("No webhook URL provided - proceeding to booking URL without webhook submission");
				this.showResults(bookingUrl);
				return;
			}

			// Check if we're using the old webhook URL and warn about it
			if (webhookUrl && webhookUrl.includes("gcloud.curalife.com")) {
				console.warn("⚠️ Section is configured with old webhook URL. Using override to new Cloud Function:");
				console.warn("Old URL:", webhookUrl);
				console.warn("New URL:", actualWebhookUrl);
			}

			// Call the Cloud Function webhook directly
			let webhookSuccess = false;
			let errorMessage = "";
			let eligibilityData = null;

			try {
				console.log("=== STARTING WEBHOOK REQUEST ===");
				console.log("Sending payload:", JSON.stringify(payload, null, 2));

				// Set a timeout to avoid waiting too long (30 seconds for the Cloud Function)
				const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out")), 35000));

				// Call the Cloud Function webhook
				console.log("Calling Cloud Function webhook:", actualWebhookUrl);
				const fetchPromise = fetch(actualWebhookUrl, {
					method: "POST",
					mode: "cors",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json"
					},
					body: JSON.stringify(payload)
				});

				// Race the timeout against the fetch
				console.log("Waiting for Cloud Function response...");
				const response = await Promise.race([fetchPromise, timeoutPromise]);

				// Check the response status
				console.log("=== CLOUD FUNCTION RESPONSE ===");
				console.log("Response status:", response.status);
				console.log("Response ok:", response.ok);
				console.log("===============================");

				if (response.ok) {
					webhookSuccess = true;

					try {
						const result = await response.json();
						console.log("=== CLOUD FUNCTION RESULT ===");
						console.log("Raw result:", result);
						console.log("Result keys:", Object.keys(result || {}));
						console.log("============================");

						// Add detailed structure debugging
						if (result && result.body) {
							console.log("=== BODY STRUCTURE DEBUG ===");
							console.log("Body keys:", Object.keys(result.body || {}));
							if (result.body.details) {
								console.log("Details keys:", Object.keys(result.body.details || {}));
								if (result.body.details.eligibilityData) {
									console.log("EligibilityData keys:", Object.keys(result.body.details.eligibilityData || {}));
									console.log("EligibilityData content:", result.body.details.eligibilityData);
								}
							}
							console.log("===========================");
						}

						// The Cloud Function now returns the workflow result body directly
						if (result && result.success === true && result.eligibilityData) {
							eligibilityData = result.eligibilityData;
						} else if (result && result.success === false) {
							console.error("❌ Workflow completed with error:", result);
							console.error("Error message:", result.error || "Unknown error");

							// Create error eligibility status
							eligibilityData = {
								isEligible: false,
								sessionsCovered: 0,
								deductible: { individual: 0 },
								eligibilityStatus: "ERROR",
								userMessage: `There was an error processing your request: ${result.error || "Unknown error"}. Our team will contact you to manually verify your coverage.`,
								planBegin: "",
								planEnd: ""
							};
						}
						// Handle the case where Cloud Function returns the HTTP response wrapper (before fix)
						else if (result && result.body) {
							console.log("Body content:", result.body);

							if (result.body.success === true && result.body.eligibilityData) {
								eligibilityData = result.body.eligibilityData;
							} else if (result.body.success === false) {
								console.error("❌ Workflow completed with error in body:", result.body);
								eligibilityData = {
									isEligible: false,
									sessionsCovered: 0,
									deductible: { individual: 0 },
									eligibilityStatus: "ERROR",
									userMessage: `There was an error processing your request: ${result.body.error || "Unknown error"}. Our team will contact you to manually verify your coverage.`,
									planBegin: "",
									planEnd: ""
								};
							}
							// Handle the nested details structure from the current Cloud Function
							else if (result.body.details && result.body.details.success === true && result.body.details.eligibilityData) {
								console.log("✅ Found eligibility data in body.details structure");
								eligibilityData = result.body.details.eligibilityData;
							}
							// Handle the case where details exists but with error
							else if (result.body.details && result.body.details.success === false) {
								console.error("❌ Workflow completed with error in body.details:", result.body.details);
								eligibilityData = {
									isEligible: false,
									sessionsCovered: 0,
									deductible: { individual: 0 },
									eligibilityStatus: "ERROR",
									userMessage: `There was an error processing your request: ${result.body.error || "Unknown error"}. Our team will contact you to manually verify your coverage.`,
									planBegin: "",
									planEnd: ""
								};
							} else {
								console.warn("❌ No success/eligibilityData found in body");
								console.log("Body structure:", result.body);

								// Additional debugging for the current structure
								if (result.body.details) {
									console.log("Details structure found:", result.body.details);
									console.log("Details keys:", Object.keys(result.body.details));
									if (result.body.details.eligibilityData) {
										console.log("EligibilityData found in details:", result.body.details.eligibilityData);
									}
								}

								eligibilityData = this.createProcessingStatus();
							}
						}
						// Handle the old execution object response (fallback for old webhook URL)
						else if (result && result.execution && result.execution.state) {
							console.log("Execution state:", result.execution.state);
							console.log("Execution name:", result.execution.name);
							console.warn("⚠️ This indicates you're using the old webhook URL. Please update to the new Cloud Function URL.");

							if (result.execution.state === "SUCCEEDED") {
								const workflowResult = this.extractResultFromExecution(result.execution);
								if (workflowResult) {
									eligibilityData = workflowResult;
								} else {
									console.warn("⚠️ Workflow succeeded but no eligibility data found in result");
									eligibilityData = this.createProcessingStatus();
								}
							} else if (result.execution.state === "ACTIVE") {
								eligibilityData = this.createProcessingStatus();
							} else {
								eligibilityData = {
									isEligible: false,
									sessionsCovered: 0,
									deductible: { individual: 0 },
									eligibilityStatus: "ERROR",
									userMessage: `Workflow failed with state: ${result.execution.state}. Our team will contact you to manually verify your coverage.`,
									planBegin: "",
									planEnd: ""
								};
							}
						} else {
							console.warn("❌ Unexpected response format from Cloud Function");
							console.log("Expected: { success: true, eligibilityData: {...} }");
							console.log("Received:", result);

							// Create a fallback processing status
							eligibilityData = this.createProcessingStatus();
						}
					} catch (jsonError) {
						console.error("Failed to parse Cloud Function JSON response:", jsonError);
						errorMessage = "Failed to process server response";
						eligibilityData = this.createProcessingStatus();
					}
				} else {
					errorMessage = `Server returned status ${response.status}`;
					console.error("Cloud Function error:", errorMessage);

					try {
						const errorData = await response.text();
						console.error("Error response body:", errorData);
						errorMessage += `: ${errorData}`;
					} catch (textError) {
						console.warn("Could not read error response:", textError);
					}

					// Create error eligibility status for HTTP errors
					eligibilityData = {
						isEligible: false,
						sessionsCovered: 0,
						deductible: { individual: 0 },
						eligibilityStatus: "ERROR",
						userMessage: `Server error (${response.status}). Our team will contact you to manually verify your coverage.`,
						planBegin: "",
						planEnd: ""
					};
				}
			} catch (error) {
				errorMessage = error.message || "Network error";
				console.error("Error calling Cloud Function:", error);
				console.error("Full error details:", {
					message: error.message,
					stack: error.stack,
					name: error.name
				});

				// Create error eligibility status for network errors
				eligibilityData = {
					isEligible: false,
					sessionsCovered: 0,
					deductible: { individual: 0 },
					eligibilityStatus: "ERROR",
					userMessage: `Network error: ${error.message}. Please check your connection and try again, or contact our support team.`,
					planBegin: "",
					planEnd: ""
				};
			}

			// Hide eligibility check indicator
			this._hideElement(this.eligibilityCheck);

			console.log("=== FINAL RESULTS SUMMARY ===");
			console.log("Webhook Success:", webhookSuccess);
			console.log("Eligibility Data Found:", !!eligibilityData);
			console.log("Error Message:", errorMessage || "none");
			if (eligibilityData) {
				console.log("Eligibility Data:", eligibilityData);
			}
			console.log("===========================");

			// Show results with eligibility data
			this.showResults(bookingUrl, webhookSuccess, eligibilityData, errorMessage);

			// Log to analytics if available
			if (window.analytics && typeof window.analytics.track === "function") {
				window.analytics.track("Quiz Completed", {
					quizId: this.quizData?.id || "dietitian-quiz",
					successfullySubmitted: webhookSuccess,
					error: !webhookSuccess ? errorMessage : null
				});
			}
		} catch (error) {
			console.error("Error in quiz completion:", error);
			console.error("Full error details:", {
				message: error.message,
				stack: error.stack,
				name: error.name
			});

			// Hide eligibility check indicator in case of error
			this._hideElement(this.eligibilityCheck);

			// Show results with error state
			this.showResults(bookingUrl || "/appointment-booking", false, null, error.message);
		} finally {
			this.submitting = false;
			this.nextButton.disabled = false;
			this.nextButton.innerHTML = `
				Next
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="quiz-button-spacing">
					<path d="M5 12h14M12 5l7 7-7 7"/>
				</svg>
			`;
		}
	}

	// Helper method to poll Google Cloud Workflows execution until completion
	// NOTE: This method was causing multiple workflow executions by making new webhook calls.
	// It has been disabled to prevent this issue. Instead, we return a processing status immediately.
	async pollWorkflowExecution(executionName, maxAttempts = 20, interval = 6000) {
		// Return processing status immediately instead of polling
		return this.createProcessingStatus();
	}

	// Helper method to create processing status
	createProcessingStatus() {
		return {
			isEligible: null,
			sessionsCovered: 0,
			deductible: { individual: 0 },
			eligibilityStatus: "PROCESSING",
			userMessage:
				"Your eligibility check and account setup is still processing in the background. This can take up to 3 minutes for complex insurance verifications and account creation. Please proceed with booking - we'll contact you with your coverage details shortly.",
			planBegin: "",
			planEnd: ""
		};
	}

	// Helper method to extract result from workflow execution
	extractResultFromExecution(execution) {
		// Check if there's a result field
		if (execution.result) {
			// Try to parse if it's a string
			if (typeof execution.result === "string") {
				try {
					const parsed = JSON.parse(execution.result);

					// Look for eligibility data in various paths
					if (parsed.eligibilityData) {
						return parsed.eligibilityData;
					} else if (parsed.body && parsed.body.eligibilityData) {
						return parsed.body.eligibilityData;
					} else if (parsed.isEligible !== undefined) {
						return parsed;
					}
				} catch (parseError) {
					console.warn("Failed to parse execution result as JSON:", parseError);
				}
			} else if (typeof execution.result === "object") {
				// Look for eligibility data in various paths
				if (execution.result.eligibilityData) {
					return execution.result.eligibilityData;
				} else if (execution.result.body && execution.result.body.eligibilityData) {
					return execution.result.body.eligibilityData;
				} else if (execution.result.isEligible !== undefined) {
					return execution.result;
				}
			}
		}

		console.warn("❌ No eligibility data found in workflow execution result");
		return null;
	}

	// New method to show results with booking URL
	showResults(bookingUrl, webhookSuccess = true, eligibilityData = null, errorMessage = "") {
		// Hide questions, show results
		this._hideElement(this.questions);
		this._showElement(this.results);

		// Log full eligibility data for debugging
		console.log("Processing eligibility data:", eligibilityData);

		// Generate results content based on eligibility data or error
		let resultsHTML = "";

		// Check if there was an error
		if (!webhookSuccess || !eligibilityData) {
			console.error("Error in eligibility check:", {
				webhookSuccess,
				eligibilityData,
				errorMessage
			});

			resultsHTML = this._generateErrorResultsHTML(bookingUrl, errorMessage);
		} else {
			// Process successful eligibility data
			const isEligible = eligibilityData.isEligible === true;
			const sessionsCovered = parseInt(eligibilityData.sessionsCovered || "0", 10);
			const deductible = eligibilityData.deductible?.individual || 0;
			const copay = eligibilityData.copay || 0;
			const eligibilityStatus = eligibilityData.eligibilityStatus || "UNKNOWN";

			// Generate appropriate results based on eligibility status
			if (isEligible && eligibilityStatus === "ELIGIBLE") {
				resultsHTML = this._generateFullCoverageHTML(sessionsCovered, copay, deductible, eligibilityData, bookingUrl);
			} else {
				resultsHTML = this._generatePartialOrNoEligibilityHTML(eligibilityData, bookingUrl, eligibilityStatus);
			}
		}

		this.results.innerHTML = resultsHTML;

		// Attach FAQ toggle functionality
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
					<h3 class="quiz-coverage-card-title" style="color: #c53030;">
						⚠️ Eligibility Check Error
					</h3>
					<p style="color: #c53030; font-size: 18px; margin-bottom: 16px;">
						There was an error checking your insurance eligibility. Please contact our support team for assistance.
					</p>
					<div style="margin-top: 16px; padding: 12px; background-color: #ffffff; border-radius: 6px;">
						<p style="font-size: 14px; color: #4a5568; margin: 0;">
							<strong>What to do next:</strong><br>
							• Contact our support team<br>
							• Have your insurance card ready<br>
							• We'll verify your coverage manually
						</p>
					</div>
				</div>

				<a href="${bookingUrl}" class="quiz-booking-button">
					Continue to Support
				</a>
			</div>
		`;
	}

	_generateFullCoverageHTML(sessionsCovered, copay, deductible, eligibilityData, bookingUrl) {
		// Format plan dates if available
		let coverageExpiry = "Dec 31, 2025"; // Default
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
					<h2 class="quiz-results-title">Great news! You're covered</h2>
					<p class="quiz-results-subtitle">As of today, your insurance fully covers your online dietitian consultations*</p>
				</div>

				<div class="quiz-coverage-card">
					<h3 class="quiz-coverage-card-title">Here's Your Offer</h3>

					<div class="quiz-coverage-pricing">
						<div class="quiz-coverage-services">
							<div class="quiz-coverage-service">Initial consultation – 60 minutes</div>
							<div class="quiz-coverage-service">Follow-up consultation – 30 minutes</div>
						</div>
						<div class="quiz-coverage-costs">
							<div class="quiz-coverage-cost">
								<span class="quiz-coverage-copay">Co-pay: $${copay}*</span>
								<span class="quiz-coverage-original-price">$100</span>
							</div>
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

						<a href="${bookingUrl}" class="quiz-booking-button">
							Proceed to booking
						</a>
					</div>
				</div>

				${this._generateFAQHTML()}
			</div>
		`;
	}

	_generatePartialOrNoEligibilityHTML(eligibilityData, bookingUrl, eligibilityStatus) {
		const userMessage = eligibilityData.userMessage || "Your eligibility check is complete.";

		// Determine styling based on status
		let cardStyle = "";
		let statusIcon = "ℹ️";
		let titleColor = "#4a5568";

		if (eligibilityStatus === "NOT_ELIGIBLE") {
			cardStyle = "border-left: 4px solid #ed8936; background-color: #fffaf0;";
			statusIcon = "⚠️";
			titleColor = "#c05621";
		} else if (eligibilityStatus === "PAYER_ERROR" || eligibilityStatus === "ERROR") {
			cardStyle = "border-left: 4px solid #f56565; background-color: #fed7d7;";
			statusIcon = "❌";
			titleColor = "#c53030";
		} else if (eligibilityStatus === "PROCESSING") {
			cardStyle = "border-left: 4px solid #3182ce; background-color: #ebf8ff;";
			statusIcon = "🔄";
			titleColor = "#2c5282";
		}

		return `
			<div class="quiz-results-container">
				<div class="quiz-results-header">
					<h2 class="quiz-results-title">Thanks for completing the quiz!</h2>
					<p class="quiz-results-subtitle">We're ready to connect you with a registered dietitian who can help guide your health journey.</p>
				</div>

				<div class="quiz-coverage-card" style="${cardStyle}">
					<h3 class="quiz-coverage-card-title" style="color: ${titleColor};">
						${statusIcon} Insurance Coverage Check
					</h3>
					<p style="font-size: 18px; margin-bottom: 16px;">${userMessage}</p>
				</div>

				<a href="${bookingUrl}" class="quiz-booking-button">
					${eligibilityStatus === "PROCESSING" ? "Continue - We'll Process in Background" : "Continue with Next Steps"}
				</a>
			</div>
		`;
	}

	_generateFAQHTML() {
		return `
			<div class="quiz-faq-section">
				<div class="quiz-faq-divider"></div>

				<div class="quiz-faq-item expanded" data-faq="credit-card" tabindex="0" role="button" aria-expanded="true">
					<div class="quiz-faq-content">
						<div class="quiz-faq-question">Why do I need to provide my credit card?</div>
						<div class="quiz-faq-answer">
							You'll be able to attend your consultation right away, while the co-pay will be charged later, only after your insurance is billed. We require your card for this purpose. If you cancel or reschedule with less than 24 hours' notice, or miss your appointment, your card will be charged the full consultation fee.
						</div>
					</div>
					<div class="quiz-faq-toggle">
						<svg class="quiz-faq-toggle-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M4 12H20" stroke="#121212" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					</div>
				</div>

				<div class="quiz-faq-divider"></div>

				<div class="quiz-faq-item" data-faq="coverage-change" tabindex="0" role="button" aria-expanded="false">
					<div class="quiz-faq-content">
						<div class="quiz-faq-question-collapsed">Can my coverage or co-pay change after booking?</div>
						<div class="quiz-faq-answer">
							Coverage details are verified at the time of booking and are generally locked in for your scheduled appointment. However, if there are changes to your insurance plan or if we receive updated information from your insurance provider, we'll notify you immediately of any changes to your co-pay or coverage status.
						</div>
					</div>
					<div class="quiz-faq-toggle">
						<svg class="quiz-faq-toggle-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M4 12H20" stroke="#454545" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
							<path d="M12 4V20" stroke="#454545" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					</div>
				</div>

				<div class="quiz-faq-divider"></div>

				<div class="quiz-faq-item" data-faq="what-expect" tabindex="0" role="button" aria-expanded="false">
					<div class="quiz-faq-content">
						<div class="quiz-faq-question-collapsed">What should I expect during my consultation?</div>
						<div class="quiz-faq-answer">
							Your dietitian will conduct a comprehensive health assessment, review your medical history and goals, and create a personalized nutrition plan. You'll receive practical meal planning guidance, dietary recommendations, and ongoing support to help you achieve your health objectives.
						</div>
					</div>
					<div class="quiz-faq-toggle">
						<svg class="quiz-faq-toggle-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M4 12H20" stroke="#454545" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
							<path d="M12 4V20" stroke="#454545" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					</div>
				</div>

				<div class="quiz-faq-divider"></div>
			</div>
		`;
	}

	_attachFAQListeners() {
		const faqItems = this.results.querySelectorAll(".quiz-faq-item");

		if (faqItems.length === 0) {
			console.warn("No FAQ items found");
			return;
		}

		faqItems.forEach(item => {
			item.addEventListener("click", () => {
				const isExpanded = item.classList.contains("expanded");

				// Collapse all other items
				faqItems.forEach(otherItem => {
					if (otherItem !== item) {
						otherItem.classList.remove("expanded");
						// Update question styling
						const question = otherItem.querySelector(".quiz-faq-question, .quiz-faq-question-collapsed");
						if (question) {
							question.className = "quiz-faq-question-collapsed";
						}
						// Update icon
						const icon = otherItem.querySelector(".quiz-faq-toggle-icon");
						if (icon) {
							icon.innerHTML =
								'<path d="M4 12H20" stroke="#454545" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 4V20" stroke="#454545" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
						}
					}
				});

				// Toggle current item
				if (!isExpanded) {
					// Expand this item
					item.classList.add("expanded");
					const question = item.querySelector(".quiz-faq-question, .quiz-faq-question-collapsed");
					if (question) {
						question.className = "quiz-faq-question";
					}
					// Update icon to minus
					const icon = item.querySelector(".quiz-faq-toggle-icon");
					if (icon) {
						icon.innerHTML = '<path d="M4 12H20" stroke="#121212" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
					}
				} else {
					// Collapse this item
					item.classList.remove("expanded");
					const question = item.querySelector(".quiz-faq-question, .quiz-faq-question-collapsed");
					if (question) {
						question.className = "quiz-faq-question-collapsed";
					}
					// Update icon to plus
					const icon = item.querySelector(".quiz-faq-toggle-icon");
					if (icon) {
						icon.innerHTML =
							'<path d="M4 12H20" stroke="#454545" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 4V20" stroke="#454545" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
					}
				}
			});
		});
	}

	showError(title, message) {
		this._hideElement(this.questions);
		this._showElement(this.error);

		const errorTitle = this.error.querySelector("h3");
		const errorMessage = this.error.querySelector("p");

		if (errorTitle) errorTitle.textContent = title;
		if (errorMessage) errorMessage.textContent = message;
	}

	// New method to attach event listeners for form fields
	attachFormQuestionListener(question) {
		if (!question) return;

		console.log("Attaching form listener for", question.id, question.type);

		switch (question.type) {
			case "dropdown":
			case "date-part":
				const dropdownInput = this.questionContainer.querySelector(`#question-${question.id}`);
				if (!dropdownInput) {
					console.warn(`Dropdown input not found for question ${question.id}`);
					return;
				}
				dropdownInput.addEventListener("change", () => {
					this.handleFormAnswer(question.id, dropdownInput.value);
					// Update dropdown color when value is selected
					this._updateDropdownColor(dropdownInput);

					// Clear error state if a valid option is selected
					if (dropdownInput.value && dropdownInput.value !== "") {
						const errorEl = this.questionContainer.querySelector(`#error-${question.id}`);
						if (errorEl) {
							dropdownInput.classList.remove("quiz-input-error");
							dropdownInput.classList.add("quiz-input-valid");
							errorEl.classList.add("quiz-error-hidden");
							errorEl.classList.remove("quiz-error-visible");
						}
					}

					// Note: No updateNavigation call since button is always enabled in forms
				});
				// Set initial color state
				this._updateDropdownColor(dropdownInput);
				break;

			case "text":
			case "date":
				const textInput = this.questionContainer.querySelector(`#question-${question.id}`);
				if (!textInput) {
					console.warn(`Text input not found for question ${question.id}`);
					return;
				}
				// Remove any existing listeners
				textInput.removeEventListener("input", textInput._inputHandler);
				textInput.removeEventListener("change", textInput._changeHandler);

				// Define the handler
				textInput._inputHandler = () => {
					console.log(`Text input ${question.id} changed:`, textInput.value);

					// Use enhanced validation
					const validationResult = this._validateFieldValue(question, textInput.value);
					const isValid = this._updateFieldValidationState(textInput, question, validationResult);

					// Always update the response value for real-time tracking
					this.handleFormAnswer(question.id, textInput.value);

					// Note: We don't call updateNavigation here since button is always enabled
				};

				// Add both input and change handlers
				textInput.addEventListener("input", textInput._inputHandler);
				textInput.addEventListener("change", textInput._inputHandler);
				break;

			case "checkbox":
				// Find all checkboxes for this question
				const checkboxInputs = this.questionContainer.querySelectorAll(`input[name="question-${question.id}"]`);

				if (checkboxInputs.length === 0) {
					console.warn(`No checkbox inputs found for question ${question.id}`);
					return;
				}

				console.log(`Found ${checkboxInputs.length} checkbox inputs for ${question.id}`);

				// Process all checkboxes
				checkboxInputs.forEach(input => {
					console.log(`Setting up handler for checkbox ${input.id}`);

					// Attach click handler (using click instead of change for more reliable handling)
					input.onclick = e => {
						console.log(`Checkbox clicked: ${input.id}, checked: ${input.checked}`);

						// For single checkbox fields like consent
						if (question.options.length === 1) {
							console.log(`Single checkbox: ${input.checked ? "CHECKED" : "UNCHECKED"}`);
							this.handleFormAnswer(question.id, input.checked ? [input.value] : []);
						} else {
							// For multi-select checkboxes
							const selectedOptions = Array.from(checkboxInputs)
								.filter(cb => cb.checked)
								.map(cb => cb.value);
							console.log(`Multi checkbox selections: ${selectedOptions.join(", ")}`);
							this.handleFormAnswer(question.id, selectedOptions);
						}

						// Note: No updateNavigation call since button is always enabled in forms
					};
				});
				break;

			case "payer-search":
				console.log("Attaching form payer search listeners for:", question.id);
				this._attachPayerSearchFormListeners(question);
				break;

			default:
				console.warn(`Unsupported form field type: ${question.type}`);
		}
	}

	// New method to handle answers in form-style steps
	handleFormAnswer(questionId, answer) {
		if (!this.quizData) return;

		const step = this.getCurrentStep();
		if (!step || !step.questions) {
			console.error("Cannot handle form answer: Step or questions not found");
			return;
		}

		// Find or create response for this question
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

	// Helper method to add legal text after navigation
	_addLegalTextAfterNavigation(legalText) {
		// Find the navigation container
		const navContainer = this.navigationButtons;
		if (!navContainer) return;

		// Remove any existing legal text
		const existingLegal = navContainer.querySelector(".quiz-legal-after-nav");
		if (existingLegal) {
			existingLegal.remove();
		}

		// Create and append legal text element
		const legalElement = document.createElement("p");
		legalElement.className = "quiz-text-xs quiz-legal-after-nav";
		legalElement.innerHTML = legalText;
		navContainer.appendChild(legalElement);
	}

	// Template generation methods
	_generateStepInfoHTML(step) {
		if (!step.info) return "";

		return `
			<h3 class="quiz-title">${step.info.heading}</h3>
			<p class="quiz-text">${step.info.text}</p>
			${step.info.subtext ? `<p class="quiz-subtext">${step.info.subtext}</p>` : ""}
		`;
	}

	_generateRequiredMarker(required) {
		return ""; // All fields are required, no need to show asterisks
	}

	_generateHelpIcon(questionId) {
		const tooltipContent = this._getTooltipContent(questionId);
		const escapedTooltip = tooltipContent.replace(/"/g, "&quot;");
		return `<span class="quiz-help-icon-container" data-tooltip="${escapedTooltip}"><svg class="quiz-help-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_3657_2618)"><path d="M14.6668 8.00004C14.6668 4.31814 11.682 1.33337 8.00016 1.33337C4.31826 1.33337 1.3335 4.31814 1.3335 8.00004C1.3335 11.6819 4.31826 14.6667 8.00016 14.6667C11.682 14.6667 14.6668 11.6819 14.6668 8.00004Z" stroke="#121212"/><path d="M8.1613 11.3334V8.00004C8.1613 7.68577 8.1613 7.52864 8.06363 7.43097C7.96603 7.33337 7.8089 7.33337 7.49463 7.33337" stroke="#121212" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.99463 5.33337H8.00063" stroke="#121212" stroke-linecap="round" stroke-linejoin="round"/></g><defs><clipPath id="clip0_3657_2618"><rect width="16" height="16" fill="white"/></clipPath></defs></svg></span>`;
	}

	_getTooltipContent(questionId) {
		const tooltips = {
			q3: "Select your primary insurance company. This helps us verify your coverage and find in-network dietitians.",
			q4: "This is the unique ID found on your insurance card.",
			q5: "Select the state where you reside. Insurance coverage may vary by state."
		};
		return tooltips[questionId] || "";
	}

	_generateFormFieldPair(leftQuestion, rightQuestion, leftResponse, rightResponse) {
		const leftInput = leftQuestion.type === "dropdown" ? this.renderDropdown(leftQuestion, leftResponse) : this.renderTextInput(leftQuestion, leftResponse);

		const rightInput = rightQuestion.type === "dropdown" ? this.renderDropdown(rightQuestion, rightResponse) : this.renderTextInput(rightQuestion, rightResponse);

		// Fields that should have help icons
		const fieldsWithHelpIcon = ["q3", "q4", "q5"]; // insurance plan, member id, state

		return `
			<div class="quiz-grid-2-form">
				<div>
					<label class="quiz-label" for="question-${leftQuestion.id}">
						${leftQuestion.text}${this._generateRequiredMarker(leftQuestion.required)}
						${fieldsWithHelpIcon.includes(leftQuestion.id) ? this._generateHelpIcon(leftQuestion.id) : ""}
					</label>
					${leftInput}
				</div>
				<div>
					<label class="quiz-label" for="question-${rightQuestion.id}">
						${rightQuestion.text}${this._generateRequiredMarker(rightQuestion.required)}
						${fieldsWithHelpIcon.includes(rightQuestion.id) ? this._generateHelpIcon(rightQuestion.id) : ""}
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
				<label class="quiz-label">${monthQ.text}${this._generateRequiredMarker(monthQ.required)}</label>
				<div class="quiz-grid-3">
					${this.renderDatePart(monthQ, monthResponse)}
					${this.renderDatePart(dayQ, dayResponse)}
					${this.renderDatePart(yearQ, yearResponse)}
				</div>
			</div>
		`;
	}

	_processFormQuestions(questions) {
		let html = "";
		let i = 0;

		while (i < questions.length) {
			const question = questions[i];
			const response = this.responses.find(r => r.questionId === question.id) || { answer: null };

			// Check for member ID + group number pair
			const pairs = QUIZ_CONFIG.QUESTION_PAIRS;
			if (question.id === pairs.MEMBER_ID_FIELDS[0] && questions[i + 1] && questions[i + 1].id === pairs.MEMBER_ID_FIELDS[1]) {
				const groupNumberResponse = this.responses.find(r => r.questionId === questions[i + 1].id) || { answer: null };
				html += this._generateFormFieldPair(question, questions[i + 1], response, groupNumberResponse);
				i += 2;
				continue;
			}

			// Check for first name + last name pair
			if (question.id === pairs.NAME_FIELDS[0] && questions[i + 1] && questions[i + 1].id === pairs.NAME_FIELDS[1]) {
				const lastNameResponse = this.responses.find(r => r.questionId === questions[i + 1].id) || { answer: null };
				html += this._generateFormFieldPair(question, questions[i + 1], response, lastNameResponse);
				i += 2;
				continue;
			}

			// Check for email + phone pair (step-contact)
			if (question.id === "q9" && questions[i + 1] && questions[i + 1].id === "q10") {
				const phoneResponse = this.responses.find(r => r.questionId === questions[i + 1].id) || { answer: null };
				html += this._generateFormFieldPair(question, questions[i + 1], response, phoneResponse);
				i += 2;
				continue;
			}

			// Check for date part group
			if (question.type === "date-part" && question.part === "month") {
				const dayQuestion = questions[i + 1];
				const yearQuestion = questions[i + 2];

				if (dayQuestion && yearQuestion && dayQuestion.type === "date-part" && dayQuestion.part === "day" && yearQuestion.type === "date-part" && yearQuestion.part === "year") {
					html += this._generateDateGroup(question, dayQuestion, yearQuestion);
					i += 3;
					continue;
				}
			}

			// Regular single question
			const fieldsWithHelpIcon = ["q3", "q4", "q5"]; // insurance plan, member id, state
			html += `
				<div class="quiz-question-section">
					<label class="quiz-label" for="question-${question.id}">
						${question.text}${this._generateRequiredMarker(question.required)}
						${fieldsWithHelpIcon.includes(question.id) ? this._generateHelpIcon(question.id) : ""}
					</label>
					${question.helpText ? `<p class="quiz-text-sm">${question.helpText}</p>` : ""}
					${this._renderQuestionByType(question, response)}
				</div>
			`;
			i++;
		}

		return html;
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

	// Helper method to update dropdown color based on selection
	_updateDropdownColor(dropdown) {
		if (dropdown.value === "" || dropdown.value === dropdown.options[0].value) {
			// No selection or placeholder selected - use placeholder color
			dropdown.style.color = "#B0B0B0";
		} else {
			// Value selected - use normal text color
			dropdown.style.color = "var(--quiz-text-primary)";
		}
	}

	// Enhanced validation method according to PRD requirements
	_validateFieldValue(question, value) {
		// Special handling for payer-search type (insurance question)
		if (question.type === "payer-search") {
			if (question.required && (!value || (typeof value === "string" && value.trim() === ""))) {
				return {
					isValid: false,
					errorMessage: "Please select an insurance plan"
				};
			}
			// If we have a valid primaryPayerId string, it's valid
			if (value && typeof value === "string" && value.trim() !== "") {
				return {
					isValid: true,
					errorMessage: null
				};
			}
			// If not required and no value, it's valid
			if (!question.required && !value) {
				return {
					isValid: true,
					errorMessage: null
				};
			}
		}

		// If field is required and empty/null
		if (question.required && (!value || (typeof value === "string" && value.trim() === ""))) {
			return {
				isValid: false,
				errorMessage: "This field is required"
			};
		}

		// If field is not required and empty, it's valid
		if (!question.required && (!value || (typeof value === "string" && value.trim() === ""))) {
			return {
				isValid: true,
				errorMessage: null
			};
		}

		// If we have a value, check format validation
		if (value && typeof value === "string" && value.trim() !== "") {
			const trimmedValue = value.trim();

			// Apply specific validation based on question ID and type
			switch (question.id) {
				case "q4": // Member ID
					if (trimmedValue.length < 6) {
						return { isValid: false, errorMessage: "Minimum 6 characters" };
					}
					if (trimmedValue.length > 20) {
						return { isValid: false, errorMessage: "Maximum 20 characters" };
					}
					break;

				case "q4_group": // Group number
					if (trimmedValue.length > 0 && trimmedValue.length < 5) {
						return { isValid: false, errorMessage: "Minimum 5 characters" };
					}
					if (trimmedValue.length > 15) {
						return { isValid: false, errorMessage: "Maximum 15 characters" };
					}
					break;

				case "q7": // First name
				case "q8": // Last name
					if (!/^[A-Za-z\s]{1,100}$/.test(trimmedValue)) {
						return { isValid: false, errorMessage: "Use only A–Z letters and spaces" };
					}
					break;

				case "q9": // Email
					if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)) {
						return { isValid: false, errorMessage: "Enter valid email" };
					}
					break;

				case "q10": // Phone
					// Clean phone number for validation (remove spaces, dashes, parentheses, dots)
					const cleanPhone = trimmedValue.replace(/[\s\-\(\)\.]/g, "");

					// US phone number patterns (cleaned)
					const usPhonePatterns = [
						/^[0-9]{10}$/, // 1234567890
						/^1[0-9]{10}$/, // 11234567890
						/^\+1[0-9]{10}$/ // +11234567890
					];

					// International phone number patterns (cleaned)
					const internationalPhonePatterns = [
						/^\+[1-9][0-9]{7,14}$/, // International format: +<country code><phone number> (8-15 total digits)
						/^\+[0-9]{8,15}$/ // More flexible international format
					];

					// US formatted patterns (with formatting preserved)
					const usFormattedPatterns = [
						/^[0-9]{3}-[0-9]{3}-[0-9]{4}$/, // 123-456-7890
						/^\([0-9]{3}\)\s[0-9]{3}-[0-9]{4}$/, // (123) 456-7890
						/^[0-9]{3}\.[0-9]{3}\.[0-9]{4}$/, // 123.456.7890
						/^[0-9]{3}\s[0-9]{3}\s[0-9]{4}$/, // 123 456 7890
						/^\+1\s[0-9]{3}-[0-9]{3}-[0-9]{4}$/, // +1 123-456-7890
						/^1-[0-9]{3}-[0-9]{3}-[0-9]{4}$/ // 1-123-456-7890
					];

					// International formatted patterns (with formatting preserved)
					const internationalFormattedPatterns = [
						/^\+[0-9]{1,4}\s[0-9\s\-]{7,14}$/, // +972 50 359 1552 or +972 50-359-1552
						/^\+[0-9]{1,4}-[0-9\-]{7,14}$/, // +972-50-359-1552
						/^\+[0-9]{8,15}$/ // +972503591552 (no spaces or dashes)
					];

					const isValidUsClean = usPhonePatterns.some(pattern => pattern.test(cleanPhone));
					const isValidInternationalClean = internationalPhonePatterns.some(pattern => pattern.test(cleanPhone));
					const isValidUsFormatted = usFormattedPatterns.some(pattern => pattern.test(trimmedValue));
					const isValidInternationalFormatted = internationalFormattedPatterns.some(pattern => pattern.test(trimmedValue));

					if (!isValidUsClean && !isValidInternationalClean && !isValidUsFormatted && !isValidInternationalFormatted) {
						return { isValid: false, errorMessage: "Enter valid phone" };
					}
					break;

				default:
					// Fall back to pattern validation if defined
					if (question.validation && question.validation.pattern) {
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

		return {
			isValid: true,
			errorMessage: null
		};
	}

	// Helper method to update field validation state
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

	// Debug method for testing phone validation - can be called from browser console
	debugPhoneValidation(phoneNumber) {
		const question = { id: "q10", required: true, type: "text" };
		console.log("=== DEBUGGING PHONE VALIDATION ===");
		console.log("Phone:", phoneNumber);
		console.log("Question:", question);

		const result = this._validateFieldValue(question, phoneNumber);
		console.log("Result:", result);

		return result;
	}

	renderPayerSearch(question, response) {
		const selectedPayer = response.answer;
		const placeholder = question.placeholder || "Search for your insurance plan...";

		console.log("Rendering payer search for question:", question.id, "selectedPayer:", selectedPayer);

		// Build the search input HTML
		let html = `
			<div class="quiz-payer-search-container">
				<input
					type="text"
					id="question-${question.id}"
					class="quiz-payer-search-input"
					placeholder="${placeholder}"
					value=""
					autocomplete="off"
					aria-describedby="error-${question.id}"
				>
				<div class="quiz-payer-search-dropdown" id="search-dropdown-${question.id}" style="display: none;">
					<!-- Search results will be populated here -->
				</div>
				<p id="error-${question.id}" class="quiz-error-text quiz-error-hidden"></p>
		`;

		// Handle different types of selected payer data
		let payerDisplayInfo = null;

		if (selectedPayer && typeof selectedPayer === "object") {
			// Full payer object from search selection
			payerDisplayInfo = {
				displayName: selectedPayer.displayName,
				id: selectedPayer.stediId || selectedPayer.primaryPayerId,
				aliases: selectedPayer.aliases
			};
		} else if (selectedPayer && typeof selectedPayer === "string") {
			// Test data or primaryPayerId string - resolve to display name
			const resolvedDisplayName = this._resolvePayerDisplayName(selectedPayer);
			if (resolvedDisplayName) {
				payerDisplayInfo = {
					displayName: resolvedDisplayName,
					id: selectedPayer,
					aliases: []
				};
			}
		}

		// If we have payer display info, show the selected payer
		if (payerDisplayInfo) {
			html += `
				<div class="quiz-payer-search-selected">
					<div class="quiz-payer-search-selected-name">${payerDisplayInfo.displayName}</div>
					<div class="quiz-payer-search-selected-details">
						ID: ${payerDisplayInfo.id}
						${payerDisplayInfo.aliases && payerDisplayInfo.aliases.length > 0 ? ` • Aliases: ${payerDisplayInfo.aliases.slice(0, 3).join(", ")}` : ""}
					</div>
					<button type="button" class="quiz-payer-search-clear">Change selection</button>
				</div>
			`;
		}

		html += "</div>";
		console.log("Generated payer search HTML for question:", question.id);
		return html;
	}

	// Method to attach payer search listeners for wizard-style questions
	_attachPayerSearchListeners(question) {
		console.log("Attaching payer search listeners for wizard-style question:", question.id);
		const searchInput = this.questionContainer.querySelector(`#question-${question.id}`);
		const dropdown = this.questionContainer.querySelector(`#search-dropdown-${question.id}`);

		if (!searchInput || !dropdown) {
			console.warn(`Payer search elements not found for question ${question.id}`);
			console.log("searchInput:", !!searchInput, "dropdown:", !!dropdown);
			return;
		}

		console.log("Found payer search elements, setting up behavior");
		this._setupPayerSearchBehavior(question, searchInput, dropdown, selectedPayer => {
			console.log("Wizard-style payer selected:", selectedPayer);
			this.handleAnswer(selectedPayer);
		});
	}

	// Method to attach payer search listeners for form-style questions
	_attachPayerSearchFormListeners(question) {
		// Add a small delay to ensure DOM elements are available
		setTimeout(() => {
			const searchInput = this.questionContainer.querySelector(`#question-${question.id}`);
			const dropdown = this.questionContainer.querySelector(`#search-dropdown-${question.id}`);

			console.log("- searchInput selector: #question-" + question.id);
			console.log("- dropdown selector: #search-dropdown-" + question.id);
			console.log("- questionContainer:", !!this.questionContainer);
			console.log("- searchInput found:", !!searchInput);
			console.log("- dropdown found:", !!dropdown);

			if (!searchInput || !dropdown) {
				console.warn(`❌ Payer search elements not found for question ${question.id}`);

				// Debug: log all inputs in the container
				const allInputs = this.questionContainer.querySelectorAll("input");
				console.log(
					"🔍 All inputs found:",
					Array.from(allInputs).map(input => ({ id: input.id, type: input.type, class: input.className }))
				);

				// Debug: log all divs with dropdown-like classes
				const allDropdowns = this.questionContainer.querySelectorAll('[id*="dropdown"], .quiz-payer-search-dropdown');
				console.log(
					"🔍 All potential dropdowns found:",
					Array.from(allDropdowns).map(div => ({ id: div.id, class: div.className }))
				);

				// Debug: log all inputs with payer-search class
				const allPayerSearchInputs = this.questionContainer.querySelectorAll(".quiz-payer-search-input");
				console.log(
					"🔍 All payer search inputs found:",
					Array.from(allPayerSearchInputs).map(input => ({ id: input.id, type: input.type, class: input.className }))
				);

				// Debug: dump the entire questionContainer HTML
				return;
			}

			this._setupPayerSearchBehavior(question, searchInput, dropdown, selectedPayer => {
				console.log(
					"📊 Current responses before storing payer:",
					this.responses.map(r => ({ questionId: r.questionId, answerType: typeof r.answer, hasStediId: r.answer?.stediId, hasDisplayName: r.answer?.displayName }))
				);

				// Ensure we call handleFormAnswer with the payer object
				this.handleFormAnswer(question.id, selectedPayer);

				// Add a small delay and then log the stored response
				setTimeout(() => {
					const storedResponse = this.responses.find(r => r.questionId === question.id);
					console.log(
						"📊 All responses after payer selection:",
						this.responses.map(r => ({ questionId: r.questionId, answerType: typeof r.answer, hasStediId: r.answer?.stediId, hasDisplayName: r.answer?.displayName }))
					);

					// Force update navigation to reflect the change
					this.updateNavigation();
				}, 50);
			});
		}, 100); // 100ms delay
	}

	// Common payer search behavior setup
	_setupPayerSearchBehavior(question, searchInput, dropdown, onSelectCallback) {
		let searchTimeout;
		let currentResults = [];
		let selectedIndex = -1;

		// Ensure dropdown starts hidden
		this._hidePayerSearchDropdown(dropdown);

		// Handle input changes with debouncing
		const inputHandler = () => {
			const query = searchInput.value.trim();

			// Clear any previous selection when user types
			if (searchInput.hasAttribute("data-selected-payer")) {
				searchInput.removeAttribute("data-selected-payer");
				searchInput.classList.remove("quiz-input-valid");
				// Clear the stored response so validation fails until new selection
				this.handleFormAnswer(question.id, null);
			}

			if (query.length < 2) {
				this._hidePayerSearchDropdown(dropdown);
				currentResults = [];
				selectedIndex = -1;
				return;
			}

			// Clear any previous timeout
			if (searchTimeout) {
				clearTimeout(searchTimeout);
			}

			// Debounce search by 300ms
			searchTimeout = setTimeout(() => {
				this._searchPayers(question, query, dropdown, onSelectCallback, results => {
					currentResults = results;
					selectedIndex = -1;
				});
			}, 300);
		};

		// Remove any existing event listeners to prevent duplicates
		searchInput.removeEventListener("input", inputHandler);

		// Add the input event listener
		searchInput.addEventListener("input", inputHandler);

		// Handle focus event to ensure dropdown is hidden when field gets focus
		const focusHandler = () => {
			// Only show dropdown if there's already a valid query
			const query = searchInput.value.trim();
			if (query.length < 2) {
				this._hidePayerSearchDropdown(dropdown);
			}
		};

		searchInput.addEventListener("focus", focusHandler);

		// Handle keyboard navigation
		searchInput.addEventListener("keydown", e => {
			if (currentResults.length === 0) return;

			switch (e.key) {
				case "ArrowDown":
					e.preventDefault();
					selectedIndex = Math.min(selectedIndex + 1, currentResults.length - 1);
					this._updateKeyboardSelection(dropdown, selectedIndex);
					break;
				case "ArrowUp":
					e.preventDefault();
					selectedIndex = Math.max(selectedIndex - 1, -1);
					this._updateKeyboardSelection(dropdown, selectedIndex);
					break;
				case "Enter":
					e.preventDefault();
					if (selectedIndex >= 0 && currentResults[selectedIndex]) {
						this._selectPayer(question, currentResults[selectedIndex], searchInput, dropdown, onSelectCallback);
					}
					break;
				case "Escape":
					this._hidePayerSearchDropdown(dropdown);
					searchInput.blur();
					break;
			}
		});

		// Hide dropdown when clicking outside
		document.addEventListener("click", e => {
			if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
				this._hidePayerSearchDropdown(dropdown);
			}
		});

		// Handle clear button if present
		const clearButton = this.questionContainer.querySelector(".quiz-payer-search-clear");
		if (clearButton) {
			clearButton.addEventListener("click", () => {
				searchInput.value = "";
				searchInput.focus();
				// Clear the selection
				onSelectCallback(null);
				// Re-render to remove the selected payer display
				this.renderCurrentStep();
			});
		}
	}

	// Search payers using Stedi API
	async _searchPayers(question, query, dropdown, onSelectCallback, onResultsCallback) {
		try {
			// Show loading state
			dropdown.innerHTML = `
				<div class="quiz-payer-search-loading">
					<div class="quiz-payer-search-loading-spinner"></div>
					Searching...
				</div>
			`;
			dropdown.classList.add("visible");
			dropdown.style.display = "block";

			// Make API call to Stedi
			const apiEndpoint = question.apiEndpoint || "https://healthcare.us.stedi.com/2024-04-01/payers/search";
			const url = new URL(apiEndpoint);
			url.searchParams.append("query", query);

			// Real API call to Stedi
			const response = await fetch(url, {
				method: "GET",
				headers: {
					Authorization: "test_fsWwDEq.XvSAryFi2OujuV0n3mNPhFfE",
					Accept: "application/json"
				}
			});

			if (!response.ok) {
				console.warn("⚠️ API request failed, falling back to demo data");
				const data = this._generateDemoPayerResults(query);

				const results = data.items || [];

				this._renderSearchResults(results, query, dropdown, question, onSelectCallback, onResultsCallback);
				return;
			}

			const data = await response.json();

			const results = data.items || [];

			this._renderSearchResults(results, query, dropdown, question, onSelectCallback, onResultsCallback);
		} catch (error) {
			console.error("❌ Payer search error:", error);

			// Fallback to demo data on error
			try {
				const data = this._generateDemoPayerResults(query);
				const results = data.items || [];
				this._renderSearchResults(results, query, dropdown, question, onSelectCallback, onResultsCallback);
			} catch (demoError) {
				console.error("❌ Demo data fallback also failed:", demoError);
				dropdown.innerHTML = `
					<div class="quiz-payer-search-error">
						Error searching for insurance plans. Please try again.
					</div>
				`;
				dropdown.classList.add("visible");
				onResultsCallback([]);
			}
		}
	}

	// Helper method to render search results
	_renderSearchResults(results, query, dropdown, question, onSelectCallback, onResultsCallback) {
		if (results.length === 0) {
			dropdown.innerHTML = `
				<div class="quiz-payer-search-no-results">
					No insurance plans found for "${query}". Try searching with a different term.
				</div>
			`;
		} else {
			// Render results
			const resultsHTML = results
				.map((item, index) => {
					const payer = item.payer;
					return `
					<div class="quiz-payer-search-item" data-index="${index}">
						<div class="quiz-payer-search-item-name">${payer.displayName}</div>
						<div class="quiz-payer-search-item-details">
							<span class="quiz-payer-search-item-id">${payer.stediId}</span>
							${payer.aliases && payer.aliases.length > 0 ? `• ${payer.aliases.slice(0, 2).join(", ")}` : ""}
						</div>
					</div>
				`;
				})
				.join("");

			dropdown.innerHTML = resultsHTML;

			// Attach click listeners to results
			const resultItems = dropdown.querySelectorAll(".quiz-payer-search-item");

			resultItems.forEach((item, index) => {
				item.addEventListener("click", () => {
					this._selectPayer(question, results[index].payer, dropdown.parentElement.querySelector(".quiz-payer-search-input"), dropdown, onSelectCallback);
				});
			});
		}

		dropdown.classList.add("visible");
		dropdown.style.display = "block";
		onResultsCallback(results.map(item => item.payer));
	}

	// Generate demo results for testing (replace with real API in production)
	_generateDemoPayerResults(query) {
		const allPayers = [
			{
				payer: {
					stediId: "AETNA",
					displayName: "Aetna",
					primaryPayerId: "60054",
					aliases: ["AETNA", "60054", "AETNA_BETTER_HEALTH"],
					transactionSupport: {
						eligibilityCheck: "SUPPORTED",
						claimStatus: "SUPPORTED"
					}
				},
				score: 5.0
			},
			{
				payer: {
					stediId: "ANTHEM",
					displayName: "Anthem Blue Cross Blue Shield",
					primaryPayerId: "040",
					aliases: ["ANTHEM", "BCBS", "BLUE_CROSS", "040"],
					transactionSupport: {
						eligibilityCheck: "SUPPORTED",
						claimStatus: "SUPPORTED"
					}
				},
				score: 4.8
			},
			{
				payer: {
					stediId: "CIGNA",
					displayName: "Cigna Health",
					primaryPayerId: "62308",
					aliases: ["CIGNA", "62308", "CIGNA_HEALTHCARE"],
					transactionSupport: {
						eligibilityCheck: "SUPPORTED",
						claimStatus: "SUPPORTED"
					}
				},
				score: 4.9
			},
			{
				payer: {
					stediId: "UPICO",
					displayName: "Blue Cross Blue Shield of North Carolina",
					primaryPayerId: "BCSNC",
					aliases: ["1411", "560894904", "61473", "BCBS-NC", "BCSNC"],
					transactionSupport: {
						eligibilityCheck: "SUPPORTED",
						claimStatus: "SUPPORTED"
					}
				},
				score: 4.7
			},
			{
				payer: {
					stediId: "HUMANA",
					displayName: "Humana Inc",
					primaryPayerId: "HUMANA",
					aliases: ["HUMANA", "HUMANA_INC", "84977"],
					transactionSupport: {
						eligibilityCheck: "SUPPORTED",
						claimStatus: "SUPPORTED"
					}
				},
				score: 4.6
			},
			{
				payer: {
					stediId: "KAISER",
					displayName: "Kaiser Permanente",
					primaryPayerId: "KAISER",
					aliases: ["KAISER", "KP", "KAISER_PERM"],
					transactionSupport: {
						eligibilityCheck: "SUPPORTED",
						claimStatus: "SUPPORTED"
					}
				},
				score: 4.5
			},
			{
				payer: {
					stediId: "UNITED",
					displayName: "UnitedHealthcare",
					primaryPayerId: "52133",
					aliases: ["UHC", "UNITED", "UNITED_HEALTHCARE", "52133"],
					transactionSupport: {
						eligibilityCheck: "SUPPORTED",
						claimStatus: "SUPPORTED"
					}
				},
				score: 4.4
			}
		];

		// Filter based on query
		const lowerQuery = query.toLowerCase();

		const filtered = allPayers.filter(item => {
			const payer = item.payer;
			const displayNameMatch = payer.displayName.toLowerCase().includes(lowerQuery);
			const stediIdMatch = payer.stediId.toLowerCase().includes(lowerQuery);
			const aliasMatch = payer.aliases.some(alias => alias.toLowerCase().includes(lowerQuery));

			const matches = displayNameMatch || stediIdMatch || aliasMatch;

			if (matches) {
			}

			return matches;
		});

		console.log(
			"📋 Filtered payers:",
			filtered.map(item => item.payer.displayName)
		);

		const result = {
			items: filtered.slice(0, 5), // Limit to 5 results
			stats: {
				total: filtered.length
			}
		};

		return result;
	}

	// Select a payer
	_selectPayer(question, payer, searchInput, dropdown, onSelectCallback) {
		// Update the input to show the selected payer name
		if (searchInput) {
			searchInput.value = payer.displayName;
			// Store the selected payer data as a data attribute for reference
			searchInput.setAttribute("data-selected-payer", JSON.stringify(payer));
		}

		// Hide dropdown
		this._hidePayerSearchDropdown(dropdown);

		// Clear any error states and add valid state
		const errorEl = this.questionContainer.querySelector(`#error-${question.id}`);
		if (searchInput) {
			searchInput.classList.remove("quiz-input-error");
			searchInput.classList.add("quiz-input-valid");
		}

		// Hide error message
		if (errorEl) {
			errorEl.classList.add("quiz-error-hidden");
			errorEl.classList.remove("quiz-error-visible");
			errorEl.textContent = "";
		}

		// Call the callback with the primaryPayerId (not the full payer object)
		onSelectCallback(payer.primaryPayerId);
	}

	// Hide the payer search dropdown
	_hidePayerSearchDropdown(dropdown) {
		dropdown.classList.remove("visible");
		dropdown.style.display = "none";
	}

	// Update keyboard selection highlighting
	_updateKeyboardSelection(dropdown, selectedIndex) {
		const items = dropdown.querySelectorAll(".quiz-payer-search-item");
		items.forEach((item, index) => {
			if (index === selectedIndex) {
				item.classList.add("keyboard-highlighted");
			} else {
				item.classList.remove("keyboard-highlighted");
			}
		});
	}

	// Helper method to resolve primaryPayerId to displayName using demo data as fallback
	_resolvePayerDisplayName(primaryPayerId) {
		// Generate demo data to find the matching payer
		const demoDataResult = this._generateDemoPayerResults("");
		const demoItems = demoDataResult.items || [];
		const matchingPayer = demoItems.find(item => item.payer.primaryPayerId === primaryPayerId);
		return matchingPayer ? matchingPayer.payer.displayName : null;
	}

	// Helper method to check URL parameters for test mode
	_checkUrlParameter(paramName) {
		const urlParams = new URLSearchParams(window.location.search);
		return urlParams.get(paramName);
	}

	// Helper method to check for test mode and apply test data
	_checkAndApplyTestData() {
		const testMode = this._checkUrlParameter("test");

		if (testMode === "true") {
			console.log("%c🧪 TEST MODE ENABLED 🧪", "background: #4CAF50; color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold; font-size: 14px;");
			console.log("%cTest data will be automatically filled in all form fields", "color: #4CAF50; font-weight: bold;");
			this._applyTestData();

			// Add visual indicator on page if in development
			if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
				this._addTestModeIndicator();
			}
		}
	}

	// Apply test data to responses for easier testing
	_applyTestData() {
		const testData = {
			// Multiple choice questions (goals)
			q1: ["opt1"], // Main reasons - select first option

			// Checkbox questions (medical conditions)
			q2: ["med2", "med4"], // Medical conditions - select diabetes and high blood pressure

			// Insurance information
			q3: "52133", // Insurance - UnitedHealthcare primaryPayerId
			q4: "404404404", // Member ID
			q4_group: "", // Group number (empty)
			q5: "DC", // State - District of Columbia

			// Date of birth parts
			q6_month: "06",
			q6_day: "28",
			q6_year: "1969",

			// Contact information
			q7: "Beaver", // First name
			q8: "Dent", // Last name
			q9: "beaver.dent@example.com", // Email
			q10: "(555) 123-4567" // Phone
		};

		// Apply test data to responses
		Object.keys(testData).forEach(questionId => {
			const responseIndex = this.responses.findIndex(r => r.questionId === questionId);
			if (responseIndex !== -1) {
				this.responses[responseIndex].answer = testData[questionId];
				console.log(`✅ Applied test data for ${questionId}:`, testData[questionId]);
			} else {
				console.warn(`⚠️  Could not find response for question ${questionId}`);
			}
		});

		console.log("🧪 Test data applied to all questions");
	}

	// Add visual test mode indicator
	_addTestModeIndicator() {
		// Only add if not already present
		if (document.querySelector(".quiz-test-mode-indicator")) return;

		const indicator = document.createElement("div");
		indicator.className = "quiz-test-mode-indicator";
		indicator.innerHTML = "🧪 TEST MODE";
		indicator.style.cssText = `
			position: fixed;
			top: 10px;
			right: 10px;
			background: #4CAF50;
			color: white;
			padding: 8px 12px;
			border-radius: 4px;
			font-weight: bold;
			font-size: 12px;
			z-index: 9999;
			box-shadow: 0 2px 8px rgba(0,0,0,0.2);
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
		`;

		document.body.appendChild(indicator);

		// Auto-remove after 5 seconds
		setTimeout(() => {
			if (indicator.parentNode) {
				indicator.parentNode.removeChild(indicator);
			}
		}, 5000);
	}
}

// Initialize the quiz when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
	const quiz = new ProductQuiz();
	// Expose quiz instance for debugging
	window.productQuiz = quiz;
});
