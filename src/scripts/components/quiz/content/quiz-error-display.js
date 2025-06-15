import { QuizBaseComponent, quizComponentRegistry } from "../base/quiz-base-component.js";

/**
 * Error Display Component
 *
 * A comprehensive component for displaying error messages with different severity levels,
 * technical details, and action buttons.
 *
 * Usage:
 * <quiz-error-display
 *   type="technical"
 *   title="Technical Problem"
 *   message="Unable to process your request">
 *   <div slot="details">
 *     <p>Error Code: STEDI_500</p>
 *     <p>Timestamp: 2024-01-15 10:30:00</p>
 *   </div>
 *   <div slot="actions">
 *     <button class="quiz-retry-button">Try Again</button>
 *   </div>
 * </quiz-error-display>
 */
class QuizErrorDisplay extends QuizBaseComponent {
	static get observedAttributes() {
		return ["type", "title", "message", "error-code", "show-details"];
	}

	getTemplate() {
		const type = this.getAttribute("type") || "general";
		const title = this.getAttribute("title") || "Error";
		const message = this.getAttribute("message") || "An error occurred. Please try again.";
		const errorCode = this.getAttribute("error-code") || "";
		const showDetails = this.getBooleanAttribute("show-details", false);

		return `
      <div class="quiz-error-display" data-type="${type}">
        <div class="quiz-error-content">
          <div class="quiz-error-header">
            <div class="quiz-error-icon">
              ${this.getErrorIcon(type)}
            </div>
            <div class="quiz-error-text">
              <h3 class="quiz-error-title">${this.sanitizeHTML(title)}</h3>
              <p class="quiz-error-message">${this.sanitizeHTML(message)}</p>
            </div>
          </div>

          ${
						errorCode
							? `
            <div class="quiz-error-code">
              <span class="quiz-error-code-label">Error Code:</span>
              <span class="quiz-error-code-value">${this.sanitizeHTML(errorCode)}</span>
            </div>
          `
							: ""
					}

          ${
						showDetails
							? `
            <div class="quiz-error-details">
              <details class="quiz-error-details-toggle">
                <summary class="quiz-error-details-summary">Technical Details</summary>
                <div class="quiz-error-details-content">
                  <slot name="details"></slot>
                </div>
              </details>
            </div>
          `
							: ""
					}

          <div class="quiz-error-actions">
            <slot name="actions"></slot>
          </div>

          <!-- Default slot for additional content -->
          <slot></slot>
        </div>
      </div>
    `;
	}

	getErrorIcon(type) {
		const iconColor = this.getIconColor(type);

		switch (type) {
			case "warning":
				return `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Warning">
            <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;

			case "technical":
				return `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Technical Error">
            <path d="M12 8V12M12 16H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M8 12L16 12" stroke="${iconColor}" stroke-width="1" stroke-linecap="round"/>
          </svg>
        `;

			case "network":
				return `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Network Error">
            <path d="M3 12H21M12 3L12 21" stroke="${iconColor}" stroke-width="2" stroke-linecap="round"/>
            <path d="M8.5 8.5L15.5 15.5M15.5 8.5L8.5 15.5" stroke="${iconColor}" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        `;

			case "general":
			default:
				return `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Error">
            <circle cx="12" cy="12" r="9" stroke="${iconColor}" stroke-width="2"/>
            <path d="M15 9L9 15M9 9L15 15" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
		}
	}

	getIconColor(type) {
		switch (type) {
			case "warning":
				return "#ed8936";
			case "technical":
				return "#e53e3e";
			case "network":
				return "#3182ce";
			case "general":
			default:
				return "#e53e3e";
		}
	}

	getStyles() {
		return `
      ${super.getStyles()}

      :host {
        display: block;
        margin: 20px 0;
      }

      .quiz-error-display {
        background: white;
        border-radius: var(--quiz-border-radius);
        padding: 24px;
        box-shadow: var(--quiz-shadow);
        border-left: 4px solid var(--quiz-error-color);
      }

      :host([type="warning"]) .quiz-error-display {
        border-left-color: var(--quiz-warning-color);
        background-color: #fffaf0;
      }

      :host([type="technical"]) .quiz-error-display {
        border-left-color: #e53e3e;
        background-color: #fed7d7;
      }

      :host([type="network"]) .quiz-error-display {
        border-left-color: #3182ce;
        background-color: #ebf8ff;
      }

      .quiz-error-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .quiz-error-header {
        display: flex;
        align-items: flex-start;
        gap: 16px;
      }

      .quiz-error-icon {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.8);
      }

      .quiz-error-text {
        flex: 1;
      }

      .quiz-error-title {
        font-size: 18px;
        font-weight: 600;
        color: var(--quiz-primary-color);
        margin: 0 0 8px 0;
        line-height: 1.3;
      }

      :host([type="warning"]) .quiz-error-title {
        color: #c05621;
      }

      :host([type="technical"]) .quiz-error-title {
        color: #c53030;
      }

      :host([type="network"]) .quiz-error-title {
        color: #2c5282;
      }

      .quiz-error-message {
        font-size: 14px;
        line-height: 1.5;
        color: #4a5568;
        margin: 0;
      }

      .quiz-error-code {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: rgba(0, 0, 0, 0.05);
        border-radius: 6px;
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 13px;
      }

      .quiz-error-code-label {
        font-weight: 600;
        color: #4a5568;
      }

      .quiz-error-code-value {
        color: #2d3748;
        background: rgba(255, 255, 255, 0.8);
        padding: 2px 6px;
        border-radius: 4px;
      }

      .quiz-error-details {
        border-top: 1px solid rgba(0, 0, 0, 0.1);
        padding-top: 16px;
      }

      .quiz-error-details-toggle {
        cursor: pointer;
      }

      .quiz-error-details-summary {
        font-weight: 600;
        color: var(--quiz-primary-color);
        padding: 8px 0;
        list-style: none;
        outline: none;
      }

      .quiz-error-details-summary::-webkit-details-marker {
        display: none;
      }

      .quiz-error-details-summary::before {
        content: "▶";
        display: inline-block;
        margin-right: 8px;
        transition: transform 0.2s ease;
      }

      .quiz-error-details-toggle[open] .quiz-error-details-summary::before {
        transform: rotate(90deg);
      }

      .quiz-error-details-content {
        padding: 12px 0;
        color: #4a5568;
        font-size: 14px;
        line-height: 1.5;
      }

      .quiz-error-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        justify-content: center;
        padding-top: 8px;
      }

      /* Style slotted action buttons */
      .quiz-error-actions ::slotted(.quiz-retry-button) {
        background: var(--quiz-secondary-color);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: var(--quiz-border-radius);
        font-weight: 600;
        cursor: pointer;
        transition: var(--quiz-transition);
      }

      .quiz-error-actions ::slotted(.quiz-retry-button:hover) {
        background: #2a5d42;
        transform: translateY(-1px);
      }

      .quiz-error-actions ::slotted(.quiz-retry-button:active) {
        transform: translateY(0);
      }

      /* Responsive design */
      @media (max-width: 768px) {
        .quiz-error-display {
          padding: 20px 16px;
        }

        .quiz-error-header {
          gap: 12px;
        }

        .quiz-error-icon {
          width: 36px;
          height: 36px;
        }

        .quiz-error-title {
          font-size: 16px;
        }

        .quiz-error-message {
          font-size: 13px;
        }

        .quiz-error-actions {
          flex-direction: column;
          align-items: center;
        }

        .quiz-error-actions ::slotted(.quiz-retry-button) {
          width: 100%;
          max-width: 200px;
        }
      }
    `;
	}

	render() {
		this.renderTemplate();
	}

	handleAttributeChange(name, oldValue, newValue) {
		// Re-render when any attribute changes
		if (this.isConnected) {
			this.render();
		}
	}

	onConnected() {
		// Dispatch event when error display is ready
		this.dispatchCustomEvent("quiz-error-display-ready", {
			type: this.getAttribute("type"),
			title: this.getAttribute("title"),
			errorCode: this.getAttribute("error-code")
		});
	}

	/**
	 * Utility method to set error data programmatically
	 */
	setError(type, title, message, errorCode = null, showDetails = false) {
		this.setAttributes({
			type,
			title,
			message,
			"error-code": errorCode,
			"show-details": showDetails
		});
	}

	/**
	 * Get error data
	 */
	getError() {
		return {
			type: this.getAttribute("type"),
			title: this.getAttribute("title"),
			message: this.getAttribute("message"),
			errorCode: this.getAttribute("error-code"),
			showDetails: this.getBooleanAttribute("show-details")
		};
	}

	/**
	 * Show/hide technical details
	 */
	toggleDetails(show = null) {
		const currentShow = this.getBooleanAttribute("show-details");
		const newShow = show !== null ? show : !currentShow;
		this.setAttribute("show-details", newShow);
	}
}

// Register the component
if (!customElements.get("quiz-error-display")) {
	quizComponentRegistry.register("quiz-error-display", QuizErrorDisplay);
}

export default QuizErrorDisplay;
