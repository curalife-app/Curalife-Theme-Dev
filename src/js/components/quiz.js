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

		// Use the specific class names we added to the HTML
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

		// Check if we found all the required elements
		console.log("Quiz elements found:", {
			intro: !!this.intro,
			questions: !!this.questions,
			results: !!this.results,
			error: !!this.error,
			loading: !!this.loading,
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
		// Check that we have all required elements before proceeding
		if (!this.intro || !this.questions || !this.loading) {
			console.error("Required quiz elements are missing:", {
				intro: !!this.intro,
				questions: !!this.questions,
				loading: !!this.loading
			});
			return;
		}

		// Hide intro, show questions
		this.intro.style.display = "none";
		this.questions.classList.remove("hidden");
		this.loading.classList.remove("hidden");

		try {
			// Fetch quiz data
			await this.loadQuizData();

			// Initialize responses array
			this.responses = [];

			// Check that quiz data was loaded properly
			if (!this.quizData || !this.quizData.steps) {
				console.error("Quiz data is missing or incomplete:", this.quizData);
				this.loading.classList.add("hidden");
				if (this.error) this.error.classList.remove("hidden");
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

			// Hide loading indicator
			this.loading.classList.add("hidden");

			// Render the first step
			this.renderCurrentStep();
			this.updateNavigation();
		} catch (error) {
			console.error("Failed to load quiz data:", error);
			this.loading.classList.add("hidden");
			if (this.error) this.error.classList.remove("hidden");
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

		// Create step HTML with Tailwind classes
		let stepHTML = `<div class="animate-fade-in">`;

		// Add the info section if present
		if (step.info) {
			stepHTML += `
				<h3 class="text-2xl font-semibold mb-2">${step.info.heading}</h3>
				<p class="text-slate-500 mb-6">${step.info.text}</p>
				${step.info.subtext ? `<p class="text-slate-500 text-sm mt-2 italic">${step.info.subtext}</p>` : ""}
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
				stepHTML += `<div class="space-y-6">`;

				step.questions.forEach((question, index) => {
					// Find response for this question
					const response = this.responses.find(r => r.questionId === question.id) || { answer: null };

					stepHTML += `
						<div class="mb-6">
							<label class="text-lg font-semibold text-slate-800 block mb-2" for="question-${question.id}">${question.text}${question.required ? ' <span class="text-red-500">*</span>' : ""}</label>
							${question.helpText ? `<p class="text-slate-500 text-sm mb-2">${question.helpText}</p>` : ""}
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
							stepHTML += `<p class="text-red-500">Unsupported field type: ${question.type}</p>`;
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
					stepHTML += `<p class="text-red-500">Question not found. Please try again.</p>`;
				} else {
					console.log("Rendering question:", question.id, question.type);

					// Add the question title and help text if they weren't already added via info
					if (!step.info) {
						stepHTML += `
							<h3 class="text-2xl font-semibold mb-2">${question.text}</h3>
							${question.helpText ? `<p class="text-slate-500 mb-6">${question.helpText}</p>` : ""}
						`;
					} else {
						// If we have both info and questions, still show the question text
						stepHTML += `
							<div class="mt-6 pt-4 border-t border-slate-200">
								<h4 class="text-lg font-semibold text-slate-800 mb-2">${question.text}</h4>
								${question.helpText ? `<p class="text-slate-500 text-sm mb-2">${question.helpText}</p>` : ""}
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
							stepHTML += '<p class="text-red-500">Unknown question type</p>';
					}
				}
			}
		} else if (!step.info) {
			// Neither info nor questions found
			console.error("Step has neither info nor questions:", step.id);
			stepHTML += `<p class="text-red-500">Step configuration error. Please contact support.</p>`;
		}

		// Add legal text if present
		if (step.legal) {
			stepHTML += `<p class="text-xs text-slate-500 mt-6 pt-2 border-t border-slate-200 leading-relaxed">${step.legal}</p>`;
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
		let html = '<div class="space-y-3 mt-6">';

		question.options.forEach(option => {
			html += `
				<div class="flex items-center">
					<input type="radio" id="${option.id}" name="question-${question.id}" value="${option.id}" class="mr-2"
						${response.answer === option.id ? "checked" : ""}>
					<label class="cursor-pointer" for="${option.id}">${option.text}</label>
				</div>
			`;
		});

		html += "</div>";
		return html;
	}

	renderCheckbox(question, response) {
		const selectedOptions = Array.isArray(response.answer) ? response.answer : [];

		let html = '<div class="space-y-3 mt-6">';

		question.options.forEach(option => {
			html += `
				<div class="flex items-center">
					<input type="checkbox" id="${option.id}" name="question-${question.id}" value="${option.id}" class="mr-2"
						${selectedOptions.includes(option.id) ? "checked" : ""}>
					<label class="cursor-pointer" for="${option.id}">${option.text}</label>
				</div>
			`;
		});

		html += "</div>";
		return html;
	}

	renderDropdown(question, response) {
		let options = question.options || [];

		let html = `
			<div class="mb-6">
				<select id="question-${question.id}" class="w-full p-3 text-base border border-slate-200 rounded-lg bg-white appearance-none shadow-sm focus:outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-800/10 cursor-pointer">
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
			<div class="mb-6">
				<input type="text" id="question-${question.id}" class="w-full p-3 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-800/10"
					placeholder="${question.placeholder || "Type your answer here..."}"
					value="${response.answer || ""}">
			</div>
		`;
	}

	renderDateInput(question, response) {
		return `
			<div class="mb-6">
				<input type="date" id="question-${question.id}" class="w-full p-3 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-800/10"
					placeholder="${question.helpText || "MM/DD/YYYY"}"
					value="${response.answer || ""}">
				${question.helpText ? `<p class="text-slate-500 text-sm mt-2">${question.helpText}</p>` : ""}
			</div>
		`;
	}

	renderTextarea(question, response) {
		return `
			<div class="mb-6">
				<textarea id="question-${question.id}" class="w-full p-3 border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-800/10" rows="4"
					placeholder="${question.placeholder || "Type your answer here..."}">${response.answer || ""}</textarea>
			</div>
		`;
	}

	renderRating(question, response) {
		return `
			<div class="mt-6">
				<input type="range" id="question-${question.id}" class="w-full mb-2"
					min="1" max="10" step="1" value="${response.answer || 5}">
				<div class="flex justify-between text-sm text-slate-500">
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
							textInput.classList.remove("border-red-500");
							this.handleAnswer(textInput.value);
						} else {
							textInput.classList.add("border-red-500");
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
		try {
			this.submitting = true;
			this.nextButton.disabled = true;
			this.nextButton.innerHTML = `
				<div class="w-4 h-4 border-2 border-white/30 border-l-white rounded-full animate-spin mr-2 inline-block"></div>
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
			let mainReason = "";
			let secondaryReasons = [];
			let dateOfBirth = "";

			// Extract individual answers
			this.responses.forEach(response => {
				if (response.questionId === "q9") customerEmail = response.answer || "";
				if (response.questionId === "q7") firstName = response.answer || "";
				if (response.questionId === "q8") lastName = response.answer || "";
				if (response.questionId === "q10") phoneNumber = response.answer || "";
				if (response.questionId === "q5") state = response.answer || "";
				if (response.questionId === "q3") insurance = response.answer || "";
				if (response.questionId === "q4") insuranceMemberId = response.answer || "";
				if (response.questionId === "q1") mainReason = response.answer || "";
				if (response.questionId === "q2") secondaryReasons = response.answer || [];
				if (response.questionId === "q6") dateOfBirth = response.answer || "";
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
				mainReason,
				secondaryReasons,
				// Provide the full responses array exactly as n8n expects
				allResponses: this.responses.map(r => ({
					stepId: r.stepId,
					questionId: r.questionId,
					answer: r.answer
				}))
			};

			console.log("Sending payload to webhook:", payload);

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

			// Always show results, even if webhook fails
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
			this.showError("Unexpected Error", "There was a problem completing the quiz. Please try again later.");
		} finally {
			this.submitting = false;
			this.nextButton.disabled = false;
			this.nextButton.innerHTML = `
				Next
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-2">
					<path d="M5 12h14M12 5l7 7-7 7"/>
				</svg>
			`;
		}
	}

	// New method to show results with booking URL
	showResults(bookingUrl, webhookSuccess = true) {
		// Hide questions, show results
		this.questions.classList.add("hidden");
		this.results.classList.remove("hidden");

		// Generate results content
		let resultsHTML = `
			<div class="text-center mb-8">
				<h2 class="text-4xl font-bold mb-4 leading-tight md:text-5xl">Thanks for completing the quiz!</h2>
				<p class="text-lg text-slate-500 max-w-xl mx-auto mb-8">We're ready to connect you with a registered dietitian who can help guide your health journey.</p>
				${!webhookSuccess ? `<p class="text-amber-600 mb-6">There was an issue processing your submission, but you can still continue.</p>` : ""}
				<div class="space-y-4 md:space-y-0 md:space-x-4">
					<a href="${bookingUrl}" class="inline-flex items-center justify-center px-6 py-3 text-base font-medium rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition duration-200 relative md:px-8">
						Book Your Appointment
						<span class="ml-2 transform transition-transform duration-200">→</span>
					</a>
				</div>
			</div>
		`;

		this.results.innerHTML = resultsHTML;
	}

	showError(title, message) {
		this.questions.classList.add("hidden");
		this.error.classList.remove("hidden");

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
							textInput.classList.remove("border-red-500");
							this.handleFormAnswer(question.id, textInput.value);
						} else {
							textInput.classList.add("border-red-500");
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

// Initialize the quiz when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
	const quiz = new ProductQuiz();
});
