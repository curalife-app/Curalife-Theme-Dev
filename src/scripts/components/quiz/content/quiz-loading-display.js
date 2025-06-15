import { QuizBaseComponent, quizComponentRegistry } from "../base/quiz-base-component.js";

/**
 * Loading Display Component
 *
 * A comprehensive component for displaying loading states with progress bars,
 * step indicators, and customizable messages.
 *
 * Usage:
 * <quiz-loading-display
 *   type="comprehensive"
 *   title="Processing your request"
 *   progress="45"
 *   current-step="2"
 *   total-steps="4">
 *   <div slot="steps">
 *     <div class="loading-step" data-step="1">Validating information</div>
 *     <div class="loading-step active" data-step="2">Checking eligibility</div>
 *     <div class="loading-step" data-step="3">Creating account</div>
 *     <div class="loading-step" data-step="4">Finalizing</div>
 *   </div>
 * </quiz-loading-display>
 */
class QuizLoadingDisplay extends QuizBaseComponent {
	static get observedAttributes() {
		return ["type", "title", "message", "progress", "current-step", "total-steps", "show-spinner"];
	}

	getTemplate() {
		const type = this.getAttribute("type") || "simple";
		const title = this.getAttribute("title") || "Loading...";
		const message = this.getAttribute("message") || "";
		const progress = this.getAttribute("progress") || "0";
		const currentStep = this.getAttribute("current-step") || "1";
		const totalSteps = this.getAttribute("total-steps") || "1";
		const showSpinner = this.getBooleanAttribute("show-spinner", true);

		if (type === "comprehensive") {
			return this.getComprehensiveTemplate(title, message, progress, currentStep, totalSteps, showSpinner);
		} else {
			return this.getSimpleTemplate(title, message, showSpinner);
		}
	}

	getSimpleTemplate(title, message, showSpinner) {
		return `
      <div class="quiz-loading-display simple">
        <div class="quiz-loading-content">
          ${
						showSpinner
							? `
            <div class="quiz-loading-icon">
              <div class="quiz-loading-spinner"></div>
            </div>
          `
							: ""
					}

          <div class="quiz-loading-text">
            <h3 class="quiz-loading-title">${this.sanitizeHTML(title)}</h3>
            ${message ? `<p class="quiz-loading-message">${this.sanitizeHTML(message)}</p>` : ""}
          </div>

          <!-- Default slot for additional content -->
          <slot></slot>
        </div>
      </div>
    `;
	}

	getComprehensiveTemplate(title, message, progress, currentStep, totalSteps, showSpinner) {
		return `
      <div class="quiz-comprehensive-loading">
        <div class="quiz-loading-content">
          ${
						showSpinner
							? `
            <div class="quiz-loading-icon">
              <div class="quiz-loading-spinner-large"></div>
            </div>
          `
							: ""
					}

          <div class="quiz-loading-step">
            <h3 class="quiz-loading-step-title">${this.sanitizeHTML(title)}</h3>
            ${message ? `<p class="quiz-loading-step-description">${this.sanitizeHTML(message)}</p>` : ""}
          </div>

          <!-- Default slot for additional content -->
          <slot></slot>
        </div>
      </div>
    `;
	}

	getStyles() {
		return `
      ${super.getStyles()}

      :host {
        display: block;
      }

      .quiz-loading-display {
        background: white;
        border-radius: 8px;
        padding: 32px 24px;
        text-align: center;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        min-height: 200px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .quiz-loading-display.simple {
        min-height: 120px;
        padding: 24px;
      }

      .quiz-comprehensive-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 400px;
        padding: 2rem;
        text-align: center;
      }

      .quiz-loading-content {
        max-width: 500px;
        width: 100%;
      }

      .quiz-loading-icon {
        margin-bottom: 2rem;
        display: flex;
        justify-content: center;
      }

      .quiz-loading-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #f3f4f6;
        border-top: 3px solid #10b981;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      .quiz-loading-spinner-large {
        width: 60px;
        height: 60px;
        border: 4px solid #f3f4f6;
        border-top: 4px solid #10b981;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .quiz-loading-step {
        margin-bottom: 2rem;
      }

      .quiz-loading-step-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
        display: block;
        transition: opacity 0.3s ease-in-out;
        transform: scale(1);
        animation: pulseIcon 2s ease-in-out infinite;
      }

      .quiz-loading-step-title {
        font-size: 1.5rem;
        font-weight: 600;
        color: #111827;
        margin-bottom: 0.5rem;
        transition: opacity 0.3s ease-in-out;
      }

      .quiz-loading-step-description {
        font-size: 1rem;
        color: #6b7280;
        margin-bottom: 0;
        transition: opacity 0.3s ease-in-out;
      }

      .quiz-loading-progress {
        margin-top: 2rem;
      }

      .quiz-loading-progress-bar {
        width: 100%;
        height: 8px;
        background-color: #f3f4f6;
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 1rem;
      }

      .quiz-loading-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #10b981, #059669);
        border-radius: 4px;
        transition: width 0.8s ease-in-out;
        position: relative;
      }

      .quiz-loading-progress-fill::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
        animation: shimmer 2s infinite;
      }

      .quiz-loading-progress-text {
        font-size: 0.875rem;
        color: #6b7280;
        font-weight: 500;
      }

      @keyframes pulseIcon {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.1);
        }
      }

      @keyframes shimmer {
        0% {
          transform: translateX(-100%);
        }
        100% {
          transform: translateX(100%);
        }
      }

      /* Mobile responsive styles */
      @media (max-width: 768px) {
        .quiz-comprehensive-loading {
          padding: 2rem;
        }

        .quiz-loading-content {
          .quiz-loading-icon {
            .quiz-loading-spinner-large {
              width: 48px;
              height: 48px;
              border-width: 3px;
            }
          }

          .quiz-loading-step {
            .quiz-loading-step-icon {
              font-size: 2.5rem;
            }

            .quiz-loading-step-title {
              font-size: 1.25rem;
            }

            .quiz-loading-step-description {
              font-size: 0.875rem;
            }
          }
        }
      }

      .quiz-loading-steps ::slotted(.loading-step.active) {
        background: #f0f9ff;
        color: var(--quiz-primary-color);
        border: 1px solid #bfdbfe;
      }

      .quiz-loading-steps ::slotted(.loading-step.active::before) {
        background: var(--quiz-secondary-color);
        color: white;
      }

      .quiz-loading-steps ::slotted(.loading-step.completed) {
        background: #f0fdf4;
        color: #16a34a;
        border: 1px solid #bbf7d0;
      }

      .quiz-loading-steps ::slotted(.loading-step.completed::before) {
        background: #16a34a;
        color: white;
        content: "✓";
      }

      .quiz-loading-progress {
        width: 100%;
        margin-top: 8px;
      }

      .quiz-loading-progress-bar {
        width: 100%;
        height: 8px;
        background: #e5e7eb;
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 8px;
      }

      .quiz-loading-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--quiz-secondary-color), #4ade80);
        border-radius: 4px;
        transition: width 0.3s ease;
        position: relative;
      }

      .quiz-loading-progress-fill::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.3),
          transparent
        );
        animation: shimmer 2s infinite;
      }

      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }

      .quiz-loading-progress-text {
        font-size: 13px;
        color: #6b7280;
        font-weight: 500;
      }

      /* Responsive design */
      @media (max-width: 768px) {
        .quiz-loading-display {
          padding: 24px 20px;
          min-height: 160px;
        }

        .quiz-loading-display.simple {
          min-height: 100px;
          padding: 20px 16px;
        }

        .quiz-loading-content {
          gap: 16px;
        }

        .quiz-loading-title {
          font-size: 18px;
        }

        .quiz-loading-message {
          font-size: 13px;
        }

        .quiz-loading-spinner-large {
          width: 40px;
          height: 40px;
          border-width: 3px;
        }

        .quiz-loading-steps ::slotted(.loading-step) {
          padding: 10px 14px;
          font-size: 13px;
        }

        .quiz-loading-steps ::slotted(.loading-step::before) {
          width: 20px;
          height: 20px;
          font-size: 11px;
          margin-right: 10px;
        }
      }

      @media (max-width: 480px) {
        .quiz-loading-display {
          padding: 20px 16px;
        }

        .quiz-loading-title {
          font-size: 16px;
        }

        .quiz-loading-steps {
          gap: 8px;
        }

        .quiz-loading-steps ::slotted(.loading-step) {
          padding: 8px 12px;
          font-size: 12px;
        }
      }
    `;
	}

	render() {
		this.renderTemplate();
	}

	handleAttributeChange(name, oldValue, newValue) {
		if (this.isConnected) {
			if (name === "progress") {
				this.updateProgress(newValue);
			} else {
				this.render();
			}
		}
	}

	updateProgress(progress) {
		const progressFill = this.querySelector(".quiz-loading-progress-fill");
		const progressText = this.querySelector(".quiz-loading-progress-text");

		if (progressFill) {
			progressFill.style.width = `${progress}%`;
		}

		if (progressText) {
			const currentStep = this.getAttribute("current-step") || "1";
			const totalSteps = this.getAttribute("total-steps") || "1";
			progressText.textContent = `${progress}% complete (${currentStep}/${totalSteps})`;
		}
	}

	onConnected() {
		// Dispatch event when loading display is ready
		this.dispatchCustomEvent("quiz-loading-display-ready", {
			type: this.getAttribute("type"),
			title: this.getAttribute("title"),
			progress: this.getAttribute("progress")
		});
	}

	/**
	 * Utility method to set loading data programmatically
	 */
	setLoading(type, title, message = "", progress = 0, currentStep = 1, totalSteps = 1) {
		this.setAttributes({
			type,
			title,
			message,
			progress: progress.toString(),
			"current-step": currentStep.toString(),
			"total-steps": totalSteps.toString()
		});
	}

	/**
	 * Update progress programmatically
	 */
	setProgress(progress, currentStep = null) {
		this.setAttribute("progress", progress.toString());
		if (currentStep !== null) {
			this.setAttribute("current-step", currentStep.toString());
		}
	}

	/**
	 * Get loading data
	 */
	getLoading() {
		return {
			type: this.getAttribute("type"),
			title: this.getAttribute("title"),
			message: this.getAttribute("message"),
			progress: parseInt(this.getAttribute("progress") || "0"),
			currentStep: parseInt(this.getAttribute("current-step") || "1"),
			totalSteps: parseInt(this.getAttribute("total-steps") || "1")
		};
	}

	/**
	 * Show/hide spinner
	 */
	toggleSpinner(show = null) {
		const currentShow = this.getBooleanAttribute("show-spinner", true);
		const newShow = show !== null ? show : !currentShow;
		this.setAttribute("show-spinner", newShow);
	}
}

// Register the component
if (!customElements.get("quiz-loading-display")) {
	quizComponentRegistry.register("quiz-loading-display", QuizLoadingDisplay);
}

export default QuizLoadingDisplay;
