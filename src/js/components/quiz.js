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
		this.currentQuestionIndex = 0;
		this.responses = [];
		this.submitting = false;

		// Initialize
		this.init();
	}

	async init() {
		// Add event listeners
		if (this.startButton) {
			this.startButton.addEventListener("click", () => this.startQuiz());
		}

		if (this.prevButton) {
			this.prevButton.addEventListener("click", () => this.goToPreviousQuestion());
		}

		if (this.nextButton) {
			this.nextButton.addEventListener("click", () => this.goToNextQuestion());
		}
	}

	async startQuiz() {
		// Hide intro, show questions
		this.intro.style.display = "none";
		this.questions.style.display = "block";
		this.loading.style.display = "flex";

		try {
			// Fetch quiz data
			await this.loadQuizData();

			// Initialize responses array with empty values
			this.responses = this.quizData.questions.map(q => ({ questionId: q.id, answer: null }));

			// Hide loading indicator
			this.loading.style.display = "none";

			// Render the first question
			this.renderCurrentQuestion();
			this.updateNavigation();
		} catch (error) {
			console.error("Failed to load quiz data:", error);
			this.loading.style.display = "none";
			this.error.style.display = "block";
		}
	}

	async loadQuizData() {
		const response = await fetch(this.dataUrl);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		this.quizData = await response.json();
		return this.quizData;
	}

	renderCurrentQuestion() {
		const question = this.quizData.questions[this.currentQuestionIndex];
		const response = this.responses[this.currentQuestionIndex];

		// Update progress bar
		const progress = ((this.currentQuestionIndex + 1) / this.quizData.questions.length) * 100;
		this.progressBar.style.width = `${progress}%`;

		// Create question HTML
		let questionHTML = `
      <div class="quiz-fade-in">
    `;

		// Check if this is an info type (not an actual question)
		if (question.type === "info") {
			questionHTML += `
        <h3 class="quiz-question-title">${question.heading}</h3>
        <p class="quiz-question-description">${question.text}</p>
        ${question.subtext ? `<p class="quiz-subtext">${question.subtext}</p>` : ""}
      `;
		} else {
			// Regular question
			questionHTML += `
        <h3 class="quiz-question-title">${question.text}</h3>
        ${question.helpText ? `<p class="quiz-question-description">${question.helpText}</p>` : ""}
      `;

			// Add question type specific HTML
			switch (question.type) {
				case "multiple-choice":
					questionHTML += this.renderMultipleChoice(question, response);
					break;
				case "checkbox":
					questionHTML += this.renderCheckbox(question, response);
					break;
				case "dropdown":
					questionHTML += this.renderDropdown(question, response);
					break;
				case "text":
					questionHTML += this.renderTextInput(question, response);
					break;
				case "textarea":
					questionHTML += this.renderTextarea(question, response);
					break;
				case "rating":
					questionHTML += this.renderRating(question, response);
					break;
				default:
					questionHTML += '<p class="quiz-error">Unknown question type</p>';
			}
		}

		questionHTML += "</div>";

		// Set the HTML
		this.questionContainer.innerHTML = questionHTML;

		// Add event listeners for the new question
		this.attachQuestionEventListeners(question);
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
		// Handle dynamic options sources
		let options = [];
		if (question.options) {
			options = question.options;
		} else if (question.optionsSource === "US_STATES") {
			options = this.getUSStates();
		} else if (question.optionsSource === "INSURANCE_PROVIDERS") {
			options = this.getInsuranceProviders();
		}

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
		// Skip event listeners for info type
		if (question.type === "info") {
			// No input to listen for, just enable the next button
			this.handleAnswer("info-acknowledged");
			return;
		}

		switch (question.type) {
			case "multiple-choice":
				const radioInputs = this.questionContainer.querySelectorAll(`input[name="question-${question.id}"]`);
				radioInputs.forEach(input => {
					input.addEventListener("change", () => {
						this.handleAnswer(input.value);
					});
				});
				break;

			case "checkbox":
				const checkboxInputs = this.questionContainer.querySelectorAll(`input[name="question-${question.id}"]`);
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
				dropdownInput.addEventListener("change", () => {
					this.handleAnswer(dropdownInput.value);
				});
				break;

			case "text":
			case "textarea":
				const textInput = this.questionContainer.querySelector(`#question-${question.id}`);
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

			case "rating":
				const ratingInput = this.questionContainer.querySelector(`#question-${question.id}`);
				ratingInput.addEventListener("input", () => {
					this.handleAnswer(Number.parseInt(ratingInput.value, 10));
				});
				break;
		}
	}

	handleAnswer(answer) {
		if (!this.quizData) return;

		this.responses[this.currentQuestionIndex] = {
			questionId: this.quizData.questions[this.currentQuestionIndex].id,
			answer
		};

		this.updateNavigation();
	}

	updateNavigation() {
		// Disable/enable previous button
		this.prevButton.disabled = this.currentQuestionIndex === 0 || this.submitting;

		// Update next button text and state
		const isLastQuestion = this.currentQuestionIndex === this.quizData.questions.length - 1;
		this.nextButton.innerHTML = isLastQuestion
			? "Finish Quiz"
			: 'Next <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';

		// Check if current question has an answer
		const currentResponse = this.responses[this.currentQuestionIndex];
		const hasAnswer = currentResponse && currentResponse.answer !== null && (typeof currentResponse.answer !== "string" || currentResponse.answer.trim() !== "");

		this.nextButton.disabled = !hasAnswer || this.submitting;
	}

	goToPreviousQuestion() {
		if (this.currentQuestionIndex > 0) {
			this.currentQuestionIndex--;
			this.renderCurrentQuestion();
			this.updateNavigation();
		}
	}

	goToNextQuestion() {
		const currentQuestion = this.quizData.questions[this.currentQuestionIndex];
		const currentResponse = this.responses[this.currentQuestionIndex];

		// Check for conditional logic
		if (currentQuestion.conditionalNext && currentResponse.answer) {
			const nextQuestionId = currentQuestion.conditionalNext[currentResponse.answer.toString()];
			if (nextQuestionId) {
				const nextIndex = this.quizData.questions.findIndex(q => q.id === nextQuestionId);
				if (nextIndex !== -1) {
					this.currentQuestionIndex = nextIndex;
					this.renderCurrentQuestion();
					this.updateNavigation();
					return;
				}
			}
		}

		// If no conditional logic or condition not met, go to next question
		if (this.currentQuestionIndex < this.quizData.questions.length - 1) {
			this.currentQuestionIndex++;
			this.renderCurrentQuestion();
			this.updateNavigation();
		} else {
			// Submit the quiz
			this.finishQuiz();
		}
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
			responses: this.responses,
			completedAt: new Date().toISOString()
		};

		// Get the webhook URL
		const n8nWebhookUrl = this.container.getAttribute("data-n8n-webhook") || "/api/quiz-webhook";

		// Log for debugging
		console.log("Submitting quiz data to:", n8nWebhookUrl);

		// Send data to backend - attempt multiple methods if needed
		let dataSent = false;

		try {
			// Try the form submission approach first (most reliable for CORS issues)
			const formSubmitResult = await this.submitViaForm(n8nWebhookUrl, payload);
			if (formSubmitResult) {
				console.log("Quiz data sent successfully via form");
				dataSent = true;
			}
		} catch (formError) {
			console.warn("Form submission failed:", formError);
		}

		if (!dataSent) {
			try {
				// Fall back to XMLHttpRequest
				const xhr = new XMLHttpRequest();
				xhr.open("POST", n8nWebhookUrl, true);
				xhr.setRequestHeader("Content-Type", "application/json");

				// Set up a promise to track completion
				const xhrPromise = new Promise((resolve, reject) => {
					xhr.onload = function () {
						if (this.status >= 200 && this.status < 300) {
							console.log("Quiz data sent successfully via XHR");
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

		// Even if data sending failed, show completion
		// Wait a moment to make the loading state visible
		await new Promise(resolve => setTimeout(resolve, 500));

		// Hide questions and show a completion message
		this.questions.style.display = "none";
		this.results.style.display = "block"; // Re-purpose the results container
		this.results.innerHTML = `
      <div class="quiz-results-header quiz-fade-in">
        <h2>Quiz Complete!</h2>
        <p>Thank you for taking the quiz.</p>
        <button class="quiz-btn quiz-btn-primary" onclick="window.location.reload()">Take Again</button>
				<a href="/" class="quiz-btn quiz-btn-secondary">Return Home</a>
      </div>
    `;

		this.submitting = false; // Reset submitting state (though UI is now different)
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

	// Helper methods for dropdown options
	getUSStates() {
		return [
			{ id: "AL", text: "Alabama" },
			{ id: "AK", text: "Alaska" },
			{ id: "AZ", text: "Arizona" },
			{ id: "AR", text: "Arkansas" },
			{ id: "CA", text: "California" },
			{ id: "CO", text: "Colorado" },
			{ id: "CT", text: "Connecticut" },
			{ id: "DE", text: "Delaware" },
			{ id: "FL", text: "Florida" },
			{ id: "GA", text: "Georgia" },
			{ id: "HI", text: "Hawaii" },
			{ id: "ID", text: "Idaho" },
			{ id: "IL", text: "Illinois" },
			{ id: "IN", text: "Indiana" },
			{ id: "IA", text: "Iowa" },
			{ id: "KS", text: "Kansas" },
			{ id: "KY", text: "Kentucky" },
			{ id: "LA", text: "Louisiana" },
			{ id: "ME", text: "Maine" },
			{ id: "MD", text: "Maryland" },
			{ id: "MA", text: "Massachusetts" },
			{ id: "MI", text: "Michigan" },
			{ id: "MN", text: "Minnesota" },
			{ id: "MS", text: "Mississippi" },
			{ id: "MO", text: "Missouri" },
			{ id: "MT", text: "Montana" },
			{ id: "NE", text: "Nebraska" },
			{ id: "NV", text: "Nevada" },
			{ id: "NH", text: "New Hampshire" },
			{ id: "NJ", text: "New Jersey" },
			{ id: "NM", text: "New Mexico" },
			{ id: "NY", text: "New York" },
			{ id: "NC", text: "North Carolina" },
			{ id: "ND", text: "North Dakota" },
			{ id: "OH", text: "Ohio" },
			{ id: "OK", text: "Oklahoma" },
			{ id: "OR", text: "Oregon" },
			{ id: "PA", text: "Pennsylvania" },
			{ id: "RI", text: "Rhode Island" },
			{ id: "SC", text: "South Carolina" },
			{ id: "SD", text: "South Dakota" },
			{ id: "TN", text: "Tennessee" },
			{ id: "TX", text: "Texas" },
			{ id: "UT", text: "Utah" },
			{ id: "VT", text: "Vermont" },
			{ id: "VA", text: "Virginia" },
			{ id: "WA", text: "Washington" },
			{ id: "WV", text: "West Virginia" },
			{ id: "WI", text: "Wisconsin" },
			{ id: "WY", text: "Wyoming" },
			{ id: "DC", text: "District of Columbia" }
		];
	}

	getInsuranceProviders() {
		return [
			{ id: "aetna", text: "Aetna" },
			{ id: "bcbs", text: "Blue Cross Blue Shield" },
			{ id: "cigna", text: "Cigna" },
			{ id: "humana", text: "Humana" },
			{ id: "kaiser", text: "Kaiser Permanente" },
			{ id: "medicare", text: "Medicare" },
			{ id: "medicaid", text: "Medicaid" },
			{ id: "uhc", text: "UnitedHealthcare" },
			{ id: "other", text: "Other Insurance" },
			{ id: "none", text: "No Insurance / Self Pay" }
		];
	}
}

// Initialize the quiz when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
	new ProductQuiz();
});
