// Quiz functionality
document.addEventListener("DOMContentLoaded", function () {
	// Get quiz container and data URL
	const quizContainer = document.getElementById("product-quiz");
	if (!quizContainer) return;

	const quizUrl = quizContainer.dataset.quizUrl;
	const n8nWebhookUrl = quizContainer.dataset.n8nWebhook;
	const bookingUrl = quizContainer.dataset.bookingUrl;

	// Quiz state
	let quizData = null;
	let currentStep = 0;
	let userResponses = [];
	let eligibilityData = null;

	// Elements
	const introEl = quizContainer.querySelector(".quiz-intro");
	const loadingEl = quizContainer.querySelector(".quiz-loading");
	const errorEl = quizContainer.querySelector(".quiz-error");
	const questionsEl = quizContainer.querySelector(".quiz-questions");
	const questionContainerEl = quizContainer.querySelector(".quiz-question-container");
	const progressBarEl = quizContainer.querySelector(".quiz-progress-bar");
	const prevButton = quizContainer.querySelector("#quiz-prev-button");
	const nextButton = quizContainer.querySelector("#quiz-next-button");
	const resultsEl = quizContainer.querySelector(".quiz-results");
	const startButton = quizContainer.querySelector("#quiz-start-button");

	// Start the quiz
	startButton.addEventListener("click", loadQuizData);

	function loadQuizData() {
		showLoading();

		fetch(quizUrl)
			.then(response => {
				if (!response.ok) {
					throw new Error("Failed to load quiz data");
				}
				return response.json();
			})
			.then(data => {
				quizData = data;
				hideLoading();
				startQuiz();
			})
			.catch(error => {
				console.error("Error loading quiz:", error);
				showError();
			});
	}

	function startQuiz() {
		introEl.style.display = "none";
		questionsEl.style.display = "block";
		renderCurrentStep();
	}

	function renderCurrentStep() {
		const step = quizData.steps[currentStep];

		// Update progress bar
		if (progressBarEl) {
			const progress = (currentStep / (quizData.steps.length - 1)) * 100;
			progressBarEl.style.width = progress + "%";
		}

		// Clear previous content
		questionContainerEl.innerHTML = "";

		// Handle info-only steps
		if (step.info) {
			const infoEl = document.createElement("div");
			infoEl.className = "quiz-info-step";

			const headingEl = document.createElement("h3");
			headingEl.textContent = step.info.heading;
			infoEl.appendChild(headingEl);

			const textEl = document.createElement("p");
			textEl.textContent = step.info.text;
			infoEl.appendChild(textEl);

			if (step.info.subtext) {
				const subtextEl = document.createElement("p");
				subtextEl.className = "quiz-subtext";
				subtextEl.textContent = step.info.subtext;
				infoEl.appendChild(subtextEl);
			}

			// Add eligibility details for the eligibility step
			if (step.id === "step-eligibility" && eligibilityData) {
				const eligibilityMessageEl = document.createElement("div");
				eligibilityMessageEl.className = "quiz-eligibility-message";

				const messageEl = document.createElement("p");
				messageEl.className = `quiz-eligibility-status ${eligibilityData.eligibilityStatus.toLowerCase()}`;
				messageEl.textContent = eligibilityData.userMessage;
				eligibilityMessageEl.appendChild(messageEl);

				infoEl.appendChild(eligibilityMessageEl);
			} else if (step.id === "step-eligibility") {
				// Default eligibility message if we don't have data
				const eligibilityMessageEl = document.createElement("div");
				eligibilityMessageEl.className = "quiz-eligibility-message";

				const messageEl = document.createElement("p");
				messageEl.textContent = "Based on your insurance benefits, you're eligible for subsidized sessions with a certified dietitian.";
				eligibilityMessageEl.appendChild(messageEl);

				infoEl.appendChild(eligibilityMessageEl);
			}

			questionContainerEl.appendChild(infoEl);
		}

		// Render questions if this step has them
		if (step.questions) {
			step.questions.forEach(question => {
				const questionEl = createQuestionElement(question);
				questionContainerEl.appendChild(questionEl);
			});
		}

		// Show/hide legal text if present
		if (step.legal) {
			const legalEl = document.createElement("p");
			legalEl.className = "quiz-legal";
			legalEl.textContent = step.legal;
			questionContainerEl.appendChild(legalEl);
		}

		// Update navigation buttons
		updateNavigationButtons();
	}

	function createQuestionElement(question) {
		const questionEl = document.createElement("div");
		questionEl.className = "quiz-question";
		questionEl.dataset.questionId = question.id;

		// Question text
		const questionTextEl = document.createElement("label");
		questionTextEl.textContent = question.text;
		if (question.required) {
			const requiredMarker = document.createElement("span");
			requiredMarker.className = "quiz-required-marker";
			requiredMarker.textContent = " *";
			questionTextEl.appendChild(requiredMarker);
		}
		questionEl.appendChild(questionTextEl);

		// Help text if present
		if (question.helpText) {
			const helpTextEl = document.createElement("p");
			helpTextEl.className = "quiz-help-text";
			helpTextEl.textContent = question.helpText;
			questionEl.appendChild(helpTextEl);
		}

		// Create input based on question type
		let inputEl;

		switch (question.type) {
			case "multiple-choice":
				inputEl = createMultipleChoiceInput(question);
				break;
			case "checkbox":
				inputEl = createCheckboxInput(question);
				break;
			case "dropdown":
				inputEl = createDropdownInput(question);
				break;
			case "text":
				inputEl = createTextInput(question);
				break;
			case "date":
				inputEl = createDateInput(question);
				break;
			default:
				inputEl = document.createElement("div");
				inputEl.textContent = "Unsupported question type";
		}

		questionEl.appendChild(inputEl);

		// Check if we have a previous answer
		const existingResponse = userResponses.find(r => r.questionId === question.id);
		if (existingResponse) {
			setQuestionValue(questionEl, existingResponse.answer);
		}

		return questionEl;
	}

	function createMultipleChoiceInput(question) {
		const optionsEl = document.createElement("div");
		optionsEl.className = "quiz-options quiz-radio-options";

		question.options.forEach(option => {
			const optionWrapEl = document.createElement("div");
			optionWrapEl.className = "quiz-option";

			const radioEl = document.createElement("input");
			radioEl.type = "radio";
			radioEl.name = question.id;
			radioEl.id = option.id;
			radioEl.value = option.id;

			const labelEl = document.createElement("label");
			labelEl.setAttribute("for", option.id);
			labelEl.textContent = option.text;

			optionWrapEl.appendChild(radioEl);
			optionWrapEl.appendChild(labelEl);
			optionsEl.appendChild(optionWrapEl);
		});

		return optionsEl;
	}

	function createCheckboxInput(question) {
		const optionsEl = document.createElement("div");
		optionsEl.className = "quiz-options quiz-checkbox-options";

		question.options.forEach(option => {
			const optionWrapEl = document.createElement("div");
			optionWrapEl.className = "quiz-option";

			const checkboxEl = document.createElement("input");
			checkboxEl.type = "checkbox";
			checkboxEl.name = question.id;
			checkboxEl.id = option.id;
			checkboxEl.value = option.id;

			const labelEl = document.createElement("label");
			labelEl.setAttribute("for", option.id);
			labelEl.textContent = option.text;

			optionWrapEl.appendChild(checkboxEl);
			optionWrapEl.appendChild(labelEl);
			optionsEl.appendChild(optionWrapEl);
		});

		return optionsEl;
	}

	function createDropdownInput(question) {
		const selectEl = document.createElement("select");
		selectEl.name = question.id;
		selectEl.className = "quiz-select";

		// Create default/placeholder option
		const defaultOption = document.createElement("option");
		defaultOption.value = "";
		defaultOption.textContent = `Select ${question.text.toLowerCase()}...`;
		defaultOption.disabled = true;
		defaultOption.selected = true;
		selectEl.appendChild(defaultOption);

		// Add options
		question.options.forEach(option => {
			const optionEl = document.createElement("option");
			optionEl.value = option.id;
			optionEl.textContent = option.text;
			selectEl.appendChild(optionEl);
		});

		return selectEl;
	}

	function createTextInput(question) {
		const inputEl = document.createElement("input");
		inputEl.type = "text";
		inputEl.name = question.id;
		inputEl.className = "quiz-text-input";

		if (question.placeholder) {
			inputEl.placeholder = question.placeholder;
		}

		return inputEl;
	}

	function createDateInput(question) {
		const inputEl = document.createElement("input");
		inputEl.type = "date";
		inputEl.name = question.id;
		inputEl.className = "quiz-date-input";
		return inputEl;
	}

	function setQuestionValue(questionEl, value) {
		const questionId = questionEl.dataset.questionId;
		const question = findQuestionById(questionId);

		if (!question) return;

		switch (question.type) {
			case "multiple-choice":
				const radioEl = questionEl.querySelector(`input[value="${value}"]`);
				if (radioEl) radioEl.checked = true;
				break;
			case "checkbox":
				if (Array.isArray(value)) {
					value.forEach(val => {
						const checkboxEl = questionEl.querySelector(`input[value="${val}"]`);
						if (checkboxEl) checkboxEl.checked = true;
					});
				}
				break;
			case "dropdown":
				const selectEl = questionEl.querySelector("select");
				if (selectEl) selectEl.value = value;
				break;
			case "text":
			case "date":
				const inputEl = questionEl.querySelector("input");
				if (inputEl) inputEl.value = value;
				break;
		}
	}

	function findQuestionById(questionId) {
		for (const step of quizData.steps) {
			if (!step.questions) continue;

			const question = step.questions.find(q => q.id === questionId);
			if (question) return question;
		}
		return null;
	}

	function updateNavigationButtons() {
		// Handle first step
		if (currentStep === 0) {
			prevButton.style.display = "none";
		} else {
			prevButton.style.display = "inline-block";
		}

		// Handle last step
		if (currentStep === quizData.steps.length - 1) {
			nextButton.textContent = quizData.steps[currentStep].ctaText || "Submit";
		} else {
			nextButton.textContent = "Next";
			nextButton.innerHTML =
				'Next <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
		}
	}

	// Navigation buttons
	prevButton.addEventListener("click", goToPreviousStep);
	nextButton.addEventListener("click", goToNextStep);

	function goToPreviousStep() {
		if (currentStep > 0) {
			saveCurrentStepResponses();
			currentStep--;
			renderCurrentStep();
			questionsEl.scrollIntoView({ behavior: "smooth" });
		}
	}

	function goToNextStep() {
		// Validate current step if it has questions
		if (!validateCurrentStep()) {
			return;
		}

		// Save responses
		saveCurrentStepResponses();

		// If this is the last step, submit the form
		if (currentStep === quizData.steps.length - 1) {
			submitQuizResponses();
			return;
		}

		// Otherwise move to next step
		currentStep++;
		renderCurrentStep();
		questionsEl.scrollIntoView({ behavior: "smooth" });
	}

	function validateCurrentStep() {
		const currentStepData = quizData.steps[currentStep];

		// If this step doesn't have questions, validation passes
		if (!currentStepData.questions) {
			return true;
		}

		// Check required fields
		let isValid = true;

		currentStepData.questions.forEach(question => {
			if (!question.required) return;

			const questionEl = questionContainerEl.querySelector(`.quiz-question[data-question-id="${question.id}"]`);
			const errorMsgEl = questionEl.querySelector(".quiz-error-message");

			// Remove any existing error message
			if (errorMsgEl) {
				errorMsgEl.remove();
			}

			// Check if question is answered
			let isAnswered = false;

			switch (question.type) {
				case "multiple-choice":
					isAnswered = !!questionEl.querySelector("input:checked");
					break;
				case "checkbox":
					isAnswered = !!questionEl.querySelector("input:checked");
					break;
				case "dropdown":
					isAnswered = questionEl.querySelector("select").value !== "";
					break;
				case "text":
				case "date":
					const inputEl = questionEl.querySelector("input");
					isAnswered = inputEl.value.trim() !== "";

					// Apply validation if specified
					if (isAnswered && question.validation && question.validation.pattern) {
						const regex = new RegExp(question.validation.pattern);
						if (!regex.test(inputEl.value)) {
							isAnswered = false;
						}
					}
					break;
			}

			if (!isAnswered) {
				isValid = false;

				// Add error message
				const errorEl = document.createElement("p");
				errorEl.className = "quiz-error-message";

				// Use validation message if available
				if (question.validation && question.validation.message) {
					errorEl.textContent = question.validation.message;
				} else {
					errorEl.textContent = "This field is required";
				}

				questionEl.appendChild(errorEl);
			}
		});

		return isValid;
	}

	function saveCurrentStepResponses() {
		const currentStepData = quizData.steps[currentStep];

		// If this step doesn't have questions, there's nothing to save
		if (!currentStepData.questions) {
			return;
		}

		currentStepData.questions.forEach(question => {
			const questionEl = questionContainerEl.querySelector(`.quiz-question[data-question-id="${question.id}"]`);
			let answer;

			switch (question.type) {
				case "multiple-choice":
					const checkedRadio = questionEl.querySelector("input:checked");
					answer = checkedRadio ? checkedRadio.value : null;
					break;
				case "checkbox":
					const checkedBoxes = questionEl.querySelectorAll("input:checked");
					answer = Array.from(checkedBoxes).map(cb => cb.value);
					break;
				case "dropdown":
					answer = questionEl.querySelector("select").value;
					break;
				case "text":
				case "date":
					answer = questionEl.querySelector("input").value;
					break;
			}

			// If we have an answer, save or update it
			if (answer !== null && answer !== undefined) {
				const existingIndex = userResponses.findIndex(r => r.questionId === question.id);

				if (existingIndex >= 0) {
					userResponses[existingIndex].answer = answer;
				} else {
					userResponses.push({
						questionId: question.id,
						answer: answer
					});
				}
			}
		});
	}

	function submitQuizResponses() {
		// Show loading state
		showLoading();

		// Prepare data to send
		const quizSubmission = {
			quizId: quizData.id,
			quizTitle: quizData.title,
			responses: userResponses,
			completedAt: new Date().toISOString()
		};

		// Send to n8n webhook
		fetch(n8nWebhookUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ data: JSON.stringify(quizSubmission) })
		})
			.then(response => {
				if (!response.ok) {
					throw new Error("Failed to submit quiz responses");
				}
				return response.json();
			})
			.then(data => {
				// Check if we have eligibility data in the response
				if (data.eligibilityData) {
					eligibilityData = data.eligibilityData;
				}

				hideLoading();
				showResults();
			})
			.catch(error => {
				console.error("Error submitting quiz:", error);
				hideLoading();
				showError();
			});
	}

	function showResults() {
		// Hide questions
		questionsEl.style.display = "none";

		// Generate and show results content
		const resultsContentEl = document.createElement("div");
		resultsContentEl.className = "quiz-results-content";

		// Show eligibility result if available
		if (eligibilityData) {
			const headingEl = document.createElement("h3");
			headingEl.textContent = "Your Eligibility Results";
			resultsContentEl.appendChild(headingEl);

			const messageEl = document.createElement("p");
			messageEl.className = `quiz-eligibility-message ${eligibilityData.eligibilityStatus.toLowerCase()}`;
			messageEl.textContent = eligibilityData.userMessage;
			resultsContentEl.appendChild(messageEl);
		} else {
			// Default message if no eligibility data
			const headingEl = document.createElement("h3");
			headingEl.textContent = "Thank You!";
			resultsContentEl.appendChild(headingEl);

			const messageEl = document.createElement("p");
			messageEl.textContent = "We've received your information and will be in touch shortly.";
			resultsContentEl.appendChild(messageEl);
		}

		// Add booking button
		const bookingBtnEl = document.createElement("a");
		bookingBtnEl.href = bookingUrl;
		bookingBtnEl.className = "quiz-btn quiz-btn-primary";
		bookingBtnEl.textContent = "Book Your Appointment";
		resultsContentEl.appendChild(bookingBtnEl);

		// Clear any previous results and append new content
		resultsEl.innerHTML = "";
		resultsEl.appendChild(resultsContentEl);
		resultsEl.style.display = "block";
		resultsEl.scrollIntoView({ behavior: "smooth" });
	}

	// Utility functions
	function showLoading() {
		introEl.style.display = "none";
		questionsEl.style.display = "none";
		resultsEl.style.display = "none";
		errorEl.style.display = "none";
		loadingEl.style.display = "flex";
	}

	function hideLoading() {
		loadingEl.style.display = "none";
	}

	function showError() {
		introEl.style.display = "none";
		questionsEl.style.display = "none";
		resultsEl.style.display = "none";
		loadingEl.style.display = "none";
		errorEl.style.display = "block";
	}
});
