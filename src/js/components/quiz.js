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
		INSURANCE_FIELDS: ["q3", "q4"],
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

		this._isInitialized = true;
	}

	async init() {
		console.log("Initializing quiz...");

		if (!this._isInitialized) {
			console.warn("ProductQuiz: Initialization skipped as essential elements are missing or an error occurred in constructor.");
			return;
		}

		// Remove any existing event listeners to prevent duplicates
		if (this.prevButton) {
			this.prevButton.removeEventListener("click", this.prevButtonHandler);
			this.prevButtonHandler = () => {
				console.log("Previous button clicked");
				this.goToPreviousStep();
			};
			this.prevButton.addEventListener("click", this.prevButtonHandler);
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

			// Hide loading indicator and show questions container
			this._hideElement(this.loading);
			this._showElement(this.questions);

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
	}

	_updateProgressBar() {
		const progress = ((this.currentStepIndex + 1) / this.quizData.steps.length) * 100;
		if (this.progressBar) {
			this.progressBar.classList.add("quiz-progress-bar-animated");
			this.progressBar.style.width = `${progress}%`;
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

		// Add legal text
		if (step.legal) {
			stepHTML += `<p class="quiz-text-xs">${step.legal}</p>`;
		}

		stepHTML += "</div>";
		return stepHTML;
	}

	_generateFormStepHTML(step) {
		return `
			<div class="quiz-form-container">
				${step.info && step.info.formSubHeading ? `<h4 class="quiz-heading">${step.info.formSubHeading}</h4>` : ""}
				<div class="quiz-space-y-6">
					${this._processFormQuestions(step.questions)}
				</div>
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

		if (this.isFormStep(step.id)) {
			// Attach listeners to all form questions
			step.questions.forEach(question => {
				this.attachFormQuestionListener(question);
			});
		} else {
			// Attach listener to current wizard question
			const currentQuestion = step.questions[this.currentQuestionIndex];
			if (currentQuestion) {
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
							${isSelected ? '<div class="quiz-checkmark"><svg viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg></div>' : ""}
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
			const currentYear = new Date().getFullYear();
			const startYear = currentYear - 100;
			options = Array.from({ length: 100 }, (_, i) => {
				const year = String(currentYear - i);
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
				const dropdownInput = this.questionContainer.querySelector(`#question-${question.id}`);
				if (!dropdownInput) {
					console.warn(`Dropdown input not found for question ${question.id}`);
					return;
				}
				dropdownInput.addEventListener("change", () => {
					this.handleAnswer(dropdownInput.value);
				});
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

					// If there's validation, check it
					if (question.validation && question.validation.pattern) {
						const regex = new RegExp(question.validation.pattern);
						const errorEl = this.questionContainer.querySelector(`#error-${question.id}`);

						if (regex.test(textInput.value)) {
							textInput.classList.remove("quiz-input-error");
							textInput.classList.add("quiz-input-valid");
							if (errorEl) {
								errorEl.classList.add("quiz-error-hidden");
								errorEl.classList.remove("quiz-error-visible");
							}
							this.handleFormAnswer(question.id, textInput.value);
						} else {
							textInput.classList.remove("quiz-input-valid");
							textInput.classList.add("quiz-input-error");
							if (errorEl && question.validation.message) {
								errorEl.textContent = question.validation.message;
								errorEl.classList.remove("quiz-error-hidden");
								errorEl.classList.add("quiz-error-visible");
							}
							this.handleFormAnswer(question.id, null); // Invalid input
						}
					} else {
						this.handleFormAnswer(question.id, textInput.value);
					}
					this.updateNavigation(); // Ensure navigation updates after handling answer
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
		// Apply visual feedback by showing the checkmark immediately
		const selectedElement = this.questionContainer.querySelector(`input[value="${answer}"]:checked`);
		if (selectedElement) {
			const optionButton = selectedElement.closest(".quiz-option-card")?.querySelector(".quiz-option-button");
			if (optionButton) {
				// Add selected state and checkmark
				optionButton.classList.add("selected", "processing");

				// Add checkmark if not already present
				if (!optionButton.querySelector(".quiz-checkmark")) {
					const checkmark = document.createElement("div");
					checkmark.className = "quiz-checkmark";
					checkmark.innerHTML =
						'<svg viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>';
					optionButton.appendChild(checkmark);
				}

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
								'<svg viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>';
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

		// Disable/enable previous button
		this.prevButton.disabled = this.currentStepIndex === 0 || this.submitting;

		// Check if we need to show Next or Finish
		const isLastStep = this.currentStepIndex === this.quizData.steps.length - 1;
		const isLastQuestionInStep = isFormStep ? true : step.questions ? this.currentQuestionIndex === step.questions.length - 1 : true;

		// Update the button text based on the current step's ctaText
		if (isLastStep && isLastQuestionInStep) {
			this.nextButton.innerHTML = step.ctaText || "Finish Quiz";
		} else {
			this.nextButton.innerHTML = step.ctaText || "Continue";
		}

		// For form-style steps, check if all required fields have answers
		if (isFormStep && step.questions) {
			let allRequiredAnswered = true;

			// Check each required question
			for (const q of step.questions.filter(q => q.required)) {
				const resp = this.responses.find(r => r.questionId === q.id);
				console.log(`Checking required field ${q.id} (${q.type}):`, resp ? resp.answer : "no response");

				if (!resp || resp.answer === null) {
					console.log(`Field ${q.id} has no response`);
					allRequiredAnswered = false;
					break;
				}

				// For checkboxes, check if any option is selected
				if (q.type === "checkbox") {
					const isValid = Array.isArray(resp.answer) && resp.answer.length > 0;
					console.log(`Checkbox ${q.id} validation: ${isValid ? "VALID" : "INVALID"}`);
					if (!isValid) {
						allRequiredAnswered = false;
						break;
					}
				}
				// For text fields, ensure non-empty
				else if (typeof resp.answer === "string") {
					const isValid = resp.answer.trim() !== "";
					console.log(`Text field ${q.id} validation: ${isValid ? "VALID" : "INVALID"}`);
					if (!isValid) {
						allRequiredAnswered = false;
						break;
					}
				}
			}

			console.log(`Form validation result: ${allRequiredAnswered ? "ALL FIELDS VALID" : "SOME FIELDS INVALID"}`);
			this.nextButton.disabled = !allRequiredAnswered || this.submitting;
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
		const currentStep = this.getCurrentStep();

		// If we have multiple questions in the current step and not on the first one
		// AND we're not in a form-style step (insurance or contact)
		const isCurrentFormStep = this.isFormStep(currentStep.id);

		if (currentStep.questions && this.currentQuestionIndex > 0 && !isCurrentFormStep) {
			this.currentQuestionIndex--;
			this.renderCurrentStep();
			this.updateNavigation();
			return;
		}

		// Otherwise, go to the previous step
		if (this.currentStepIndex > 0) {
			this.currentStepIndex--;
			// If the previous step has questions, check if it's a form step
			const prevStep = this.quizData.steps[this.currentStepIndex];
			const isPrevFormStep = this.isFormStep(prevStep.id);

			// For form steps, always set question index to 0 as we display all fields at once
			// For wizard steps, set to the last question
			this.currentQuestionIndex = isPrevFormStep ? 0 : prevStep.questions ? prevStep.questions.length - 1 : 0;

			this.renderCurrentStep();
			this.updateNavigation();
		}
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

		// If we're at the insurance step and they've filled all fields,
		// explicitly handle the consent checkbox
		if (currentStep.id === "step-insurance") {
			// Check if consent exists
			const consentResponse = this.responses.find(r => r.questionId === "consent");
			if (!consentResponse || !Array.isArray(consentResponse.answer) || consentResponse.answer.length === 0) {
				console.log("Consent checkbox not found or not checked");

				// Try to find and check the checkbox directly
				const consentCheckbox = this.questionContainer.querySelector('input[name="question-consent"]');
				if (consentCheckbox && consentCheckbox.checked) {
					console.log("Consent checkbox IS checked but not in responses, adding it");
					this.handleFormAnswer("consent", ["consent_yes"]);
				}
			} else {
				console.log("Consent checkbox is already in responses:", consentResponse.answer);
			}
		}

		// For form steps, special handling for next step
		if (isFormStep) {
			// Manual check for required fields for safety, but we'll force proceed anyway
			let allComplete = true;

			// Log all responses for debugging
			console.log("Current responses:", JSON.stringify(this.responses, null, 2));

			// Force proceed to next step - user has clicked the button
			// and we've already tried to handle any missing fields
			if (this.currentStepIndex < this.quizData.steps.length - 1) {
				console.log(`Moving to next step from ${this.currentStepIndex} to ${this.currentStepIndex + 1}`);
				this.currentStepIndex++;
				this.currentQuestionIndex = 0; // Reset question index for the new step
				this.renderCurrentStep();
				this.updateNavigation();
			} else if (allComplete) {
				// This is the last step, finish the quiz
				console.log("Last step reached, finishing quiz");
				this.finishQuiz();
			} else {
				console.warn("Cannot proceed: Not all required questions answered");
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
			let insuranceMemberId = "";
			let mainReasons = [];
			let medicalConditions = [];
			let dateOfBirth = "";
			let consent = false;

			// Extract individual answers
			this.responses.forEach(response => {
				if (response.questionId === "q9") customerEmail = response.answer || "";
				if (response.questionId === "q7") firstName = response.answer || "";
				if (response.questionId === "q8") lastName = response.answer || "";
				if (response.questionId === "q10") phoneNumber = response.answer || "";
				if (response.questionId === "q5") state = response.answer || "";
				if (response.questionId === "q3") insurance = response.answer || "";
				if (response.questionId === "q4") insuranceMemberId = response.answer || "";
				if (response.questionId === "q1") mainReasons = response.answer || [];
				if (response.questionId === "q2") medicalConditions = response.answer || [];
				if (response.questionId === "q6") dateOfBirth = response.answer || "";
				if (response.questionId === "consent") consent = response.answer && response.answer.includes("consent_yes");
			});

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
				insuranceMemberId,
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

			// Hide questions and show eligibility check indicator
			this._hideElement(this.questions);
			this._showElement(this.eligibilityCheck);

			// Get webhook URL from data attribute
			const webhookUrl = this.container.getAttribute("data-n8n-webhook");
			const bookingUrl = this.container.getAttribute("data-booking-url") || "/appointment-booking";

			if (!webhookUrl) {
				console.warn("No webhook URL provided - proceeding to booking URL without webhook submission");
				this.showResults(bookingUrl);
				return;
			}

			// Try to call the webhook
			let webhookSuccess = false;
			let errorMessage = "";

			try {
				// Set a timeout to avoid waiting too long
				const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Webhook request timed out")), 8000));

				// Try regular CORS request first
				let fetchPromise = fetch(webhookUrl, {
					method: "POST",
					mode: "cors",
					credentials: "include",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
						Origin: window.location.origin
					},
					body: JSON.stringify({
						data: JSON.stringify(payload) // Double wrap as some n8n workflows expect this format
					})
				}).catch(error => {
					console.log("CORS request failed, trying no-cors mode:", error);
					// Fallback to no-cors mode if regular CORS fails
					return fetch(webhookUrl, {
						method: "POST",
						mode: "no-cors",
						headers: {
							"Content-Type": "application/json"
						},
						body: JSON.stringify({
							data: JSON.stringify(payload)
						})
					});
				});

				// Race the timeout against the fetch
				const webhook = await Promise.race([fetchPromise, timeoutPromise]);

				// Check the response status - for no-cors mode, response.type will be 'opaque'
				if (webhook.type === "opaque") {
					console.log("Got opaque response from no-cors request - assuming success");
					webhookSuccess = true;
				} else if (webhook.ok) {
					console.log("Webhook response ok:", webhook.status);
					webhookSuccess = true;

					try {
						const webhookResponse = await webhook.json();
						console.log("Webhook response data:", webhookResponse);
					} catch (jsonError) {
						console.warn("Could not parse webhook JSON response:", jsonError);
					}
				} else {
					errorMessage = `Server returned status ${webhook.status}`;
					console.error("Webhook error:", errorMessage);

					try {
						const errorData = await webhook.text();
						console.error("Error response:", errorData);
					} catch (textError) {
						console.warn("Could not read error response:", textError);
					}
				}
			} catch (error) {
				errorMessage = error.message || "Network error";
				console.error("Error submitting quiz responses:", error);
			}

			// Hide eligibility check indicator
			this._hideElement(this.eligibilityCheck);

			// Show results
			this.showResults(bookingUrl, webhookSuccess);

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
			// Hide eligibility check indicator in case of error
			this._hideElement(this.eligibilityCheck);
			this.showError("Unexpected Error", "There was a problem completing the quiz. Please try again later.");
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

	// New method to show results with booking URL
	showResults(bookingUrl, webhookSuccess = true) {
		// Hide questions, show results
		this._hideElement(this.questions);
		this._showElement(this.results);

		// Check if we have eligibility data to display
		const step = this.quizData.steps.find(s => s.id === "step-eligibility");
		const eligibilityData = step?.eligibilityData || null;
		const isEligible = eligibilityData?.eligible === "true";
		const sessionsCovered = parseInt(eligibilityData?.sessionsCovered || "0", 10);
		const deductible = parseFloat(eligibilityData?.deductible || "0").toFixed(2);
		const copay = parseFloat(eligibilityData?.copay || "0").toFixed(2);
		const message = eligibilityData?.message || "Your eligibility check is complete.";

		// Format date strings if available
		let coverageDates = "";
		if (eligibilityData?.planBegin && eligibilityData?.planEnd) {
			const formatDate = dateStr => {
				if (!dateStr || dateStr.length !== 8) return "N/A";
				const year = dateStr.substring(0, 4);
				const month = dateStr.substring(4, 6);
				const day = dateStr.substring(6, 8);
				return `${month}/${day}/${year}`;
			};

			const beginDate = formatDate(eligibilityData.planBegin);
			const endDate = formatDate(eligibilityData.planEnd);
			coverageDates = `<p class="quiz-coverage-dates">Coverage period: ${beginDate} to ${endDate}</p>`;
		}

		// Generate results content with eligibility information
		let resultsHTML = `
			<div class="quiz-results-container">
				<h2 class="quiz-results-title">Thanks for completing the quiz!</h2>
				<p class="quiz-results-subtitle">We're ready to connect you with a registered dietitian who can help guide your health journey.</p>
				${!webhookSuccess ? `<p class="quiz-warning-text">There was an issue processing your submission, but you can still continue.</p>` : ""}

				<div class="quiz-results-card">
					<h3 class="quiz-results-card-title">
						${isEligible ? "✓ Insurance Coverage Verified" : "Insurance Coverage Information"}
					</h3>
					<p class="quiz-results-message">${message}</p>

					${
						sessionsCovered > 0
							? `
					<div class="quiz-coverage-details">
						<p class="quiz-font-medium">Coverage details:</p>
						<ul class="quiz-coverage-list">
							<li class="quiz-coverage-item">
								<span>Sessions covered:</span>
								<span class="quiz-font-medium">${sessionsCovered}</span>
							</li>
							${
								deductible > 0
									? `
							<li class="quiz-coverage-item">
								<span>Deductible:</span>
								<span class="quiz-font-medium">$${deductible}</span>
							</li>`
									: ""
							}
							${
								copay > 0
									? `
							<li class="quiz-coverage-item">
								<span>Co-pay per session:</span>
								<span class="quiz-font-medium">$${copay}</span>
							</li>`
									: ""
							}
						</ul>
						${coverageDates}
					</div>`
							: ""
					}
				</div>

				<div class="quiz-results-actions quiz-space-y-4">
					<a href="${bookingUrl}" class="quiz-cta-button">
						Book Your Appointment
						<span class="quiz-button-spacing">→</span>
					</a>
				</div>
			</div>
		`;

		this.results.innerHTML = resultsHTML;
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
				});
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

					// If there's validation, check it
					if (question.validation && question.validation.pattern) {
						const regex = new RegExp(question.validation.pattern);
						const errorEl = this.questionContainer.querySelector(`#error-${question.id}`);

						if (regex.test(textInput.value)) {
							textInput.classList.remove("quiz-input-error");
							textInput.classList.add("quiz-input-valid");
							if (errorEl) {
								errorEl.classList.add("quiz-error-hidden");
								errorEl.classList.remove("quiz-error-visible");
							}
							this.handleFormAnswer(question.id, textInput.value);
						} else {
							textInput.classList.remove("quiz-input-valid");
							textInput.classList.add("quiz-input-error");
							if (errorEl && question.validation.message) {
								errorEl.textContent = question.validation.message;
								errorEl.classList.remove("quiz-error-hidden");
								errorEl.classList.add("quiz-error-visible");
							}
							this.handleFormAnswer(question.id, null); // Invalid input
						}
					} else {
						this.handleFormAnswer(question.id, textInput.value);
					}
					this.updateNavigation(); // Ensure navigation updates after handling answer
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

						// Force update navigation
						this.updateNavigation();
					};
				});
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

		console.log(`Handling form answer for question ${questionId}:`, answer);

		// Find or create response for this question
		const responseIndex = this.responses.findIndex(r => r.questionId === questionId);
		if (responseIndex !== -1) {
			this.responses[responseIndex].answer = answer;
		} else {
			this.responses.push({
				stepId: step.id,
				questionId: questionId,
				answer
			});
		}

		// Log all current responses for debugging
		console.log("Current responses:", JSON.stringify(this.responses, null, 2));

		// Note: The enabling/disabling of the next button is now solely handled by
		// this.updateNavigation(), which should be called by the event listener
		// after this function completes.
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
		return required ? ' <span class="quiz-required-marker">*</span>' : "";
	}

	_generateHelpIcon() {
		return '<svg class="quiz-help-icon" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>';
	}

	_generateFormFieldPair(leftQuestion, rightQuestion, leftResponse, rightResponse) {
		const leftInput = leftQuestion.type === "dropdown" ? this.renderDropdown(leftQuestion, leftResponse) : this.renderTextInput(leftQuestion, leftResponse);

		const rightInput = rightQuestion.type === "dropdown" ? this.renderDropdown(rightQuestion, rightResponse) : this.renderTextInput(rightQuestion, rightResponse);

		return `
			<div class="quiz-grid-2-form">
				<div>
					<label class="quiz-label" for="question-${leftQuestion.id}">
						${leftQuestion.text}${this._generateRequiredMarker(leftQuestion.required)}
						${leftQuestion.type === "dropdown" ? this._generateHelpIcon() : ""}
					</label>
					${leftInput}
				</div>
				<div>
					<label class="quiz-label" for="question-${rightQuestion.id}">
						${rightQuestion.text}${this._generateRequiredMarker(rightQuestion.required)}
						${rightQuestion.type === "dropdown" ? this._generateHelpIcon() : ""}
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

			// Check for insurance plan + member ID pair
			const pairs = QUIZ_CONFIG.QUESTION_PAIRS;
			if (question.id === pairs.INSURANCE_FIELDS[0] && questions[i + 1] && questions[i + 1].id === pairs.INSURANCE_FIELDS[1]) {
				const memberIdResponse = this.responses.find(r => r.questionId === questions[i + 1].id) || { answer: null };
				html += this._generateFormFieldPair(question, questions[i + 1], response, memberIdResponse);
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
			html += `
				<div class="quiz-question-section">
					<label class="quiz-label" for="question-${question.id}">
						${question.text}${this._generateRequiredMarker(question.required)}
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

	// Validation helper method
	_validateInput(input, question) {
		if (!question.validation || !question.validation.pattern) {
			this.handleFormAnswer(question.id, input.value);
			return;
		}

		const regex = new RegExp(question.validation.pattern);
		const errorEl = this.questionContainer.querySelector(`#error-${question.id}`);
		const isValid = regex.test(input.value);

		// Update input styling
		input.classList.toggle("quiz-input-error", !isValid);
		input.classList.toggle("quiz-input-valid", isValid);

		// Update error message
		if (errorEl) {
			if (isValid) {
				errorEl.classList.add("quiz-error-hidden");
				errorEl.classList.remove("quiz-error-visible");
			} else if (question.validation.message) {
				errorEl.textContent = question.validation.message;
				errorEl.classList.remove("quiz-error-hidden");
				errorEl.classList.add("quiz-error-visible");
			}
		}

		// Handle the answer
		this.handleFormAnswer(question.id, isValid ? input.value : null);
		this.updateNavigation();
	}
}

// Initialize the quiz when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
	const quiz = new ProductQuiz();
	// Optional: Expose quiz instance for debugging
	// window.productQuiz = quiz;
});
