/**
 * Product Quiz for Shopify
 *
 * This script handles the product quiz functionality.
 * It loads quiz data from a JSON file and guides the user through
 * a series of questions to provide product recommendations.
 */

class ProductQuiz {
	constructor(options = {}) {
		// DOM elements
		this.container = document.getElementById("product-quiz");
		if (!this.container) return;

		this.intro = this.container.querySelector(".quiz-intro");
		this.questions = this.container.querySelector(".quiz-questions");
		this.results = this.container.querySelector(".quiz-results");
		this.error = this.container.querySelector(".quiz-error");
		this.loading = this.container.querySelector(".quiz-loading");

		this.progressBar = this.container.querySelector(".quiz-progress-bar");
		this.questionContainer = this.container.querySelector(".quiz-question-container");
		this.navigationButtons = this.container.querySelector(".quiz-navigation");
		this.prevButton = this.container.querySelector("#quiz-prev-button");
		this.nextButton = this.container.querySelector("#quiz-next-button");
		this.startButton = this.container.querySelector("#quiz-start-button");

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

	async init() {
		console.log("Initializing quiz...");

		// Remove any existing event listeners to prevent duplicates
		if (this.startButton) {
			this.startButton.removeEventListener("click", this.startQuizHandler);
			this.startQuizHandler = () => this.startQuiz();
			this.startButton.addEventListener("click", this.startQuizHandler);
		}

		if (this.prevButton) {
			this.prevButton.removeEventListener("click", this.prevButtonHandler);
			this.prevButtonHandler = () => {
				console.log("Previous button clicked");
				this.goToPreviousStep();
			};
			this.prevButton.addEventListener("click", this.prevButtonHandler);
		}

		if (this.nextButton) {
			this.nextButton.removeEventListener("click", this.nextButtonHandler);
			this.nextButtonHandler = () => {
				console.log("Next button clicked");
				this.goToNextStep();
			};
			this.nextButton.addEventListener("click", this.nextButtonHandler);
		}

		console.log("Quiz initialization complete");
	}

	async startQuiz() {
		// Hide intro, show questions
		this.intro.style.display = "none";
		this.questions.style.display = "block";
		this.loading.style.display = "flex";

		try {
			// Fetch quiz data
			await this.loadQuizData();

			// Initialize responses array
			this.responses = [];

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

			// Hide loading indicator
			this.loading.style.display = "none";

			// Render the first step
			this.renderCurrentStep();
			this.updateNavigation();
		} catch (error) {
			console.error("Failed to load quiz data:", error);
			this.loading.style.display = "none";
			this.error.style.display = "block";
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
		return stepId === "step-insurance" || stepId === "step-contact";
	}

	renderCurrentStep() {
		const step = this.getCurrentStep();
		if (!step) {
			console.error("No step found at index", this.currentStepIndex);
			return;
		}

		console.log("Rendering step:", step.id, step.info ? "has-info" : "", step.questions ? `has-${step.questions.length}-questions` : "");

		// Update progress bar
		const progress = ((this.currentStepIndex + 1) / this.quizData.steps.length) * 100;
		this.progressBar.style.width = `${progress}%`;

		// Create step HTML
		let stepHTML = `<div class="quiz-fade-in">`;

		// Add the info section if present
		if (step.info) {
			stepHTML += `
				<h3 class="quiz-question-title">${step.info.heading}</h3>
				<p class="quiz-question-description">${step.info.text}</p>
				${step.info.subtext ? `<p class="quiz-subtext">${step.info.subtext}</p>` : ""}
			`;

			// Mark this step's info as acknowledged
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
		}

		// Check if this is a multi-field form step (like insurance or contact)
		const isFormStep = this.isFormStep(step.id);

		// Add the questions section if present
		if (step.questions && step.questions.length > 0) {
			if (isFormStep) {
				// For form-style steps, render all questions at once
				stepHTML += `<div class="quiz-form-container">`;

				step.questions.forEach((question, index) => {
					// Find response for this question
					const response = this.responses.find(r => r.questionId === question.id) || { answer: null };

					stepHTML += `
						<div class="quiz-form-field">
							<label class="quiz-form-label" for="question-${question.id}">${question.text}${question.required ? ' <span class="required">*</span>' : ""}</label>
							${question.helpText ? `<p class="quiz-help-text">${question.helpText}</p>` : ""}
					`;

					// Add input based on question type
					switch (question.type) {
						case "dropdown":
							stepHTML += this.renderDropdown(question, response);
							break;
						case "text":
							stepHTML += this.renderTextInput(question, response);
							break;
						case "date":
							stepHTML += this.renderDateInput(question, response);
							break;
						default:
							stepHTML += `<p class="quiz-error">Unsupported field type: ${question.type}</p>`;
					}

					stepHTML += `</div>`;
				});

				stepHTML += `</div>`;
			} else {
				// For wizard-style steps, render one question at a time
				const question = step.questions[this.currentQuestionIndex];
				const response = this.getResponseForCurrentQuestion();

				if (!question) {
					console.error("No question found at index", this.currentQuestionIndex, "for step", step.id);
					stepHTML += `<p class="quiz-error">Question not found. Please try again.</p>`;
				} else {
					console.log("Rendering question:", question.id, question.type);

					// Add the question title and help text if they weren't already added via info
					if (!step.info) {
						stepHTML += `
							<h3 class="quiz-question-title">${question.text}</h3>
							${question.helpText ? `<p class="quiz-question-description">${question.helpText}</p>` : ""}
						`;
					} else {
						// If we have both info and questions, still show the question text
						stepHTML += `
							<div class="quiz-question-form">
								<h4 class="quiz-form-label">${question.text}</h4>
								${question.helpText ? `<p class="quiz-help-text">${question.helpText}</p>` : ""}
							</div>
						`;
					}

					// Add question type specific HTML
					switch (question.type) {
						case "multiple-choice":
							stepHTML += this.renderMultipleChoice(question, response);
							break;
						case "checkbox":
							stepHTML += this.renderCheckbox(question, response);
							break;
						case "dropdown":
							stepHTML += this.renderDropdown(question, response);
							break;
						case "text":
							stepHTML += this.renderTextInput(question, response);
							break;
						case "date":
							stepHTML += this.renderDateInput(question, response);
							break;
						case "textarea":
							stepHTML += this.renderTextarea(question, response);
							break;
						case "rating":
							stepHTML += this.renderRating(question, response);
							break;
						default:
							stepHTML += '<p class="quiz-error">Unknown question type</p>';
					}
				}
			}
		} else if (!step.info) {
			// Neither info nor questions found
			console.error("Step has neither info nor questions:", step.id);
			stepHTML += `<p class="quiz-error">Step configuration error. Please contact support.</p>`;
		}

		// Add legal text if present
		if (step.legal) {
			stepHTML += `<p class="quiz-legal">${step.legal}</p>`;
		}

		stepHTML += "</div>";

		// Set the HTML
		this.questionContainer.innerHTML = stepHTML;

		// Add event listeners for the questions
		if (step.questions && step.questions.length > 0) {
			if (isFormStep) {
				// For form steps, attach listeners to all questions
				step.questions.forEach(question => {
					this.attachFormQuestionListener(question);
				});
			} else {
				// For wizard steps, attach listener to the current question
				const currentQuestion = step.questions[this.currentQuestionIndex];
				if (currentQuestion) {
					this.attachQuestionEventListeners(currentQuestion);
				}
			}
		}

		// If this is a step with only info (no questions), enable the next button
		if (step.info && (!step.questions || step.questions.length === 0)) {
			setTimeout(() => {
				this.nextButton.disabled = false;
			}, 0);
		}

		// Always update navigation to ensure buttons are correctly enabled/disabled
		this.updateNavigation();
	}

	renderMultipleChoice(question, response) {
		let html = '<div class="quiz-options">';

		question.options.forEach(option => {
			html += `
				<div class="quiz-option-item">
					<input type="radio" id="${option.id}" name="question-${question.id}" value="${option.id}"
						${response.answer === option.id ? "checked" : ""}>
					<label class="quiz-option-label" for="${option.id}">${option.text}</label>
				</div>
			`;
		});

		html += "</div>";
		return html;
	}

	renderCheckbox(question, response) {
		const selectedOptions = Array.isArray(response.answer) ? response.answer : [];

		let html = '<div class="quiz-options">';

		question.options.forEach(option => {
			html += `
				<div class="quiz-option-item">
					<input type="checkbox" id="${option.id}" name="question-${question.id}" value="${option.id}"
						${selectedOptions.includes(option.id) ? "checked" : ""}>
					<label class="quiz-option-label" for="${option.id}">${option.text}</label>
				</div>
			`;
		});

		html += "</div>";
		return html;
	}

	renderDropdown(question, response) {
		let options = question.options || [];

		let html = `
			<div class="quiz-dropdown">
				<select id="question-${question.id}" class="quiz-select">
					<option value="">Select an option</option>
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
			<div class="quiz-text-answer">
				<input type="text" id="question-${question.id}" class="quiz-text-input"
					placeholder="${question.placeholder || "Type your answer here..."}"
					value="${response.answer || ""}">
			</div>
		`;
	}

	renderDateInput(question, response) {
		return `
			<div class="quiz-text-answer">
				<input type="date" id="question-${question.id}" class="quiz-text-input"
					placeholder="${question.helpText || "MM/DD/YYYY"}"
					value="${response.answer || ""}">
				${question.helpText ? `<p class="quiz-help-text">${question.helpText}</p>` : ""}
			</div>
		`;
	}

	renderTextarea(question, response) {
		return `
			<div class="quiz-text-answer">
				<textarea id="question-${question.id}" class="quiz-textarea" rows="4"
					placeholder="${question.placeholder || "Type your answer here..."}">${response.answer || ""}</textarea>
			</div>
		`;
	}

	renderRating(question, response) {
		return `
			<div class="quiz-rating-answer">
				<input type="range" id="question-${question.id}" class="quiz-rating-slider"
					min="1" max="10" step="1" value="${response.answer || 5}">
				<div class="quiz-rating-labels">
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
				checkboxInputs.forEach(input => {
					input.addEventListener("change", () => {
						const selectedOptions = Array.from(checkboxInputs)
							.filter(cb => cb.checked)
							.map(cb => cb.value);
						this.handleAnswer(selectedOptions);
					});
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
				textInput.addEventListener("input", () => {
					// If there's validation, check it
					if (question.validation && question.validation.pattern) {
						const regex = new RegExp(question.validation.pattern);
						if (regex.test(textInput.value)) {
							textInput.classList.remove("quiz-input-error");
							this.handleAnswer(textInput.value);
						} else {
							textInput.classList.add("quiz-input-error");
							this.handleAnswer(null); // Invalid input
						}
					} else {
						this.handleAnswer(textInput.value);
					}
				});
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

		console.log(`Handling answer for step ${step.id}:`, answer);

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

	updateNavigation() {
		// Disable/enable previous button
		this.prevButton.disabled = this.currentStepIndex === 0 || this.submitting;

		const step = this.getCurrentStep();
		if (!step) {
			console.error("Cannot update navigation: No step found at index", this.currentStepIndex);
			this.nextButton.disabled = true;
			return;
		}

		// Check if this is a form-style step
		const isFormStep = this.isFormStep(step.id);

		// Check if we need to show Next or Finish
		const isLastStep = this.currentStepIndex === this.quizData.steps.length - 1;
		const isLastQuestionInStep = isFormStep ? true : step.questions ? this.currentQuestionIndex === step.questions.length - 1 : true;

		// Update the button text based on the current step's ctaText
		if (isLastStep && isLastQuestionInStep) {
			this.nextButton.innerHTML = step.ctaText || "Finish Quiz";
		} else {
			this.nextButton.innerHTML =
				step.ctaText ||
				'Next <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
		}

		// For form-style steps, check if all required fields have answers
		if (isFormStep && step.questions) {
			const allRequiredAnswered = step.questions
				.filter(q => q.required)
				.every(q => {
					const resp = this.responses.find(r => r.questionId === q.id);
					return resp && resp.answer !== null && (typeof resp.answer !== "string" || resp.answer.trim() !== "") && (!Array.isArray(resp.answer) || resp.answer.length > 0);
				});

			this.nextButton.disabled = !allRequiredAnswered || this.submitting;
			return;
		}

		// For other steps, check if current question has an answer or if it's an info step
		let hasAnswer = true;

		if (step.questions && step.questions.length > 0 && !isFormStep) {
			const question = step.questions[this.currentQuestionIndex];
			if (!question) {
				console.error("Cannot update navigation: No question found at index", this.currentQuestionIndex);
				this.nextButton.disabled = true;
				return;
			}

			const response = this.responses.find(r => r.questionId === question.id);

			// Check if the question is required and has an answer
			if (question.required) {
				hasAnswer = response && response.answer !== null && (typeof response.answer !== "string" || response.answer.trim() !== "") && (!Array.isArray(response.answer) || response.answer.length > 0);
			}
		} else if (step.info) {
			// For info steps, always allow proceeding
			hasAnswer = true;
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

		console.log("Attempting to go to next step from", currentStep.id);

		// Check if this is a form-style step
		const isFormStep = this.isFormStep(currentStep.id);

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

		// If this is a form step, proceed to the next step directly
		if (isFormStep) {
			// Check if all required questions have been answered
			const allRequiredAnswered = currentStep.questions
				.filter(q => q.required)
				.every(q => {
					const resp = this.responses.find(r => r.questionId === q.id);
					return resp && resp.answer !== null && (typeof resp.answer !== "string" || resp.answer.trim() !== "") && (!Array.isArray(resp.answer) || resp.answer.length > 0);
				});

			if (!allRequiredAnswered) {
				console.warn("Cannot proceed: Not all required questions answered");
				this.nextButton.disabled = true;
				return;
			}

			// Proceed to next step
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
		if (!this.quizData || this.submitting) return;

		this.submitting = true;
		this.updateNavigation();

		// Show completion state
		this.nextButton.innerHTML = '<span class="quiz-spinner-small"></span> Finishing...';
		this.nextButton.disabled = true;
		this.prevButton.disabled = true;

		// Store responses (optional, maybe useful for analytics later)
		sessionStorage.setItem("quizResponses", JSON.stringify(this.responses));
		sessionStorage.setItem("quizId", this.quizData.id);

		// Prepare the quiz data payload
		const payload = {
			quizId: this.quizData.id,
			quizTitle: this.quizData.title,
			responses: this.responses.map(r => ({
				questionId: r.questionId,
				answer: r.answer
			})),
			completedAt: new Date().toISOString()
		};

		// Get the webhook URL
		const n8nWebhookUrl = this.container.getAttribute("data-n8n-webhook") || "https://n8n.curalife.com/webhook/quiz-webhook";

		// Log for debugging
		console.log("Submitting quiz data to:", n8nWebhookUrl);

		// Send data to backend - attempt multiple methods if needed
		let dataSent = false;
		let responseData = null;

		try {
			// Try direct fetch first for better response handling
			const response = await fetch(n8nWebhookUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify(payload)
			});

			if (response.ok) {
				responseData = await response.json();
				console.log("Quiz data sent successfully via fetch, received response:", responseData);
				dataSent = true;
			}
		} catch (fetchError) {
			console.warn("Fetch submission failed:", fetchError);
		}

		// If fetch failed, try alternative methods
		if (!dataSent) {
			try {
				// Try the form submission approach (most reliable for CORS issues)
				const formSubmitResult = await this.submitViaForm(n8nWebhookUrl, payload);
				if (formSubmitResult) {
					console.log("Quiz data sent successfully via form");
					dataSent = true;
				}
			} catch (formError) {
				console.warn("Form submission failed:", formError);
			}
		}

		if (!dataSent) {
			try {
				// Fall back to XMLHttpRequest
				const xhr = new XMLHttpRequest();
				xhr.open("POST", n8nWebhookUrl, true);
				xhr.setRequestHeader("Content-Type", "application/json");
				xhr.responseType = "json";

				// Set up a promise to track completion
				const xhrPromise = new Promise((resolve, reject) => {
					xhr.onload = function () {
						if (this.status >= 200 && this.status < 300) {
							console.log("Quiz data sent successfully via XHR");
							responseData = xhr.response;
							dataSent = true;
							resolve(true);
						} else {
							console.warn(`Server returned ${this.status} ${this.statusText}`, this.responseText);
							reject(new Error(`Server error: ${this.status}`));
						}
					};

					xhr.onerror = function () {
						console.error("Network error occurred with XHR");
						reject(new Error("Network error"));
					};
				});

				// Send the request
				xhr.send(JSON.stringify(payload));

				// Wait for completion or timeout after 3 seconds
				await Promise.race([xhrPromise, new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000))]);
			} catch (error) {
				console.warn("XHR failed:", error.message);

				// Try navigator.sendBeacon as fallback
				if (!dataSent) {
					try {
						const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
						dataSent = navigator.sendBeacon(n8nWebhookUrl, blob);
						if (dataSent) {
							console.log("Quiz data sent successfully via Beacon API");
						} else {
							console.warn("Beacon API failed to send data");
						}
					} catch (beaconError) {
						console.warn("Beacon API error:", beaconError);
					}
				}
			}
		}

		// Wait a moment to make the loading state visible
		await new Promise(resolve => setTimeout(resolve, 500));

		// Process eligibility data if we received a response and we're on the eligibility step
		const lastStep = this.quizData.steps[this.quizData.steps.length - 1];
		if (lastStep && lastStep.id === "step-eligibility" && responseData) {
			// Check if we have eligibility data in the response
			const eligibilityData = responseData.eligibilityData;

			if (eligibilityData) {
				console.log("Processing eligibility data:", eligibilityData);

				// Store eligibility data for use in template
				this.eligibilityData = eligibilityData;

				// Render the eligibility step with the data
				this.questions.style.display = "none";
				this.results.style.display = "block";

				// Process the eligibility template
				let template = `
					<div class="quiz-results-header quiz-fade-in">
						<h2>${lastStep.info.heading}</h2>
						<p>${lastStep.info.text}</p>
						${lastStep.info.subtext ? `<p class="quiz-subtext">${lastStep.info.subtext}</p>` : ""}

						<div class="eligibility-results">
							<div class="eligibility-message">${eligibilityData.userMessage || "Your eligibility results are ready."}</div>
						</div>

						<a href="${this.container.getAttribute("data-booking-url") || "/appointment-booking"}" class="quiz-btn quiz-btn-primary">
							${lastStep.ctaText || "Book Your Appointment"}
						</a>
					</div>
				`;

				// Process any template variables in the HTML
				template = template.replace(/{{eligibilityData\.(\w+)}}/g, (match, key) => {
					return eligibilityData[key] || "";
				});

				template = template.replace(/{{eligibilityData\.deductible\.individual}}/g, () => {
					return eligibilityData.deductible?.individual || "standard";
				});

				this.results.innerHTML = template;
				this.submitting = false;
				return;
			}
		}

		// Check if we should redirect to appointment booking
		if (lastStep && lastStep.id === "step-eligibility") {
			// Get the booking URL from the section settings or use a default
			const bookingUrl = this.container.getAttribute("data-booking-url") || "/appointment-booking";
			console.log("Redirecting to booking URL:", bookingUrl);

			// Redirect to appointment booking page
			window.location.href = bookingUrl;
			return;
		}

		// Otherwise show completion message
		this.questions.style.display = "none";
		this.results.style.display = "block";
		this.results.innerHTML = `
			<div class="quiz-results-header quiz-fade-in">
				<h2>Quiz Complete!</h2>
				<p>Thank you for taking the quiz.</p>
				<button class="quiz-btn quiz-btn-primary" onclick="window.location.reload()">Take Again</button>
				<a href="/" class="quiz-btn quiz-btn-secondary">Return Home</a>
			</div>
		`;

		this.submitting = false;
	}

	// Helper method to submit data via a hidden form (gets around CORS)
	submitViaForm(url, data) {
		return new Promise((resolve, reject) => {
			try {
				// Create a hidden iframe to target the form
				const iframeId = "quiz-submit-iframe";
				let iframe = document.getElementById(iframeId);

				if (!iframe) {
					iframe = document.createElement("iframe");
					iframe.id = iframeId;
					iframe.name = iframeId;
					iframe.style.display = "none";
					document.body.appendChild(iframe);
				}

				// Create a form
				const form = document.createElement("form");
				form.method = "POST";
				form.action = url;
				form.target = iframeId;
				form.style.display = "none";

				// Add the data field
				const input = document.createElement("input");
				input.type = "hidden";
				input.name = "data";
				input.value = JSON.stringify(data);
				form.appendChild(input);

				// Add the form to the document
				document.body.appendChild(form);

				// Handle iframe load event
				iframe.onload = () => {
					try {
						resolve(true);
					} catch (err) {
						resolve(true); // Assume success even if we can't read the iframe content
					}

					// Clean up after a delay
					setTimeout(() => {
						if (form && form.parentNode) {
							form.parentNode.removeChild(form);
						}
					}, 1000);
				};

				// Set a timeout in case iframe never loads
				setTimeout(() => {
					resolve(true); // Assume success after timeout
				}, 3000);

				// Submit the form
				form.submit();
			} catch (error) {
				console.error("Error in submitViaForm:", error);
				reject(error);
			}
		});
	}

	// New method to attach event listeners for form fields
	attachFormQuestionListener(question) {
		if (!question) return;

		console.log("Attaching form listener for", question.id, question.type);

		switch (question.type) {
			case "dropdown":
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
				textInput.addEventListener("input", () => {
					// If there's validation, check it
					if (question.validation && question.validation.pattern) {
						const regex = new RegExp(question.validation.pattern);
						if (regex.test(textInput.value)) {
							textInput.classList.remove("quiz-input-error");
							this.handleFormAnswer(question.id, textInput.value);
						} else {
							textInput.classList.add("quiz-input-error");
							this.handleFormAnswer(question.id, null); // Invalid input
						}
					} else {
						this.handleFormAnswer(question.id, textInput.value);
					}
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

		// Check if all required questions in the form have answers
		const allRequiredAnswered = step.questions
			.filter(q => q.required)
			.every(q => {
				const resp = this.responses.find(r => r.questionId === q.id);
				return resp && resp.answer !== null && (typeof resp.answer !== "string" || resp.answer.trim() !== "") && (!Array.isArray(resp.answer) || resp.answer.length > 0);
			});

		// Enable/disable the next button based on whether all required fields are filled
		this.nextButton.disabled = !allRequiredAnswered;
	}
}

// Initialize the quiz when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
	new ProductQuiz();
});
