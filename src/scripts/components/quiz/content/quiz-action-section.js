import { QuizBaseComponent, quizComponentRegistry } from "../base/quiz-base-component.js";

/**
 * Action Section Component
 *
 * A reusable component for displaying call-to-action sections with buttons,
 * information text, and feature highlights.
 *
 * Usage:
 * <quiz-action-section title="Schedule your consultation" type="primary">
 *   <div slot="info">
 *     <quiz-benefit-item icon="checkmark" text="Usually recommend 6 consultations"></quiz-benefit-item>
 *   </div>
 *   <div slot="action">
 *     <a href="/booking" class="quiz-booking-button">Proceed to booking</a>
 *   </div>
 * </quiz-action-section>
 */
class QuizActionSection extends QuizBaseComponent {
	static get observedAttributes() {
		return ["title", "type", "background-color", "result-url"];
	}

	getTemplate() {
		const title = this.getAttribute("title") || "Schedule your initial online consultation now";
		const type = this.getAttribute("type") || "default";
		const backgroundColor = this.getAttribute("background-color") || "#F1F8F4";
		const resultUrl = this.getAttribute("result-url") || "#";

		return `
      <div class="quiz-action-section" data-type="${type}" style="background-color: ${backgroundColor};">
        <div class="quiz-action-content">
          <div class="quiz-action-header">
            <h3 class="quiz-action-title">${this.sanitizeHTML(title)}</h3>
          </div>
          <div class="quiz-action-details">
            <div class="quiz-action-info">
              <div class="quiz-action-info-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M12.4214 14.5583C12.4709 14.3109 12.6316 14.1021 12.8477 13.972C14.3893 13.0437 15.4163 11.5305 15.4163 9.58378C15.4163 6.59224 12.9913 4.16711 9.99967 4.16711C7.00813 4.16711 4.58301 6.59224 4.58301 9.58378C4.58301 11.5305 5.60997 13.0437 7.15168 13.972C7.36778 14.1021 7.52844 14.3109 7.57791 14.5583L7.78236 15.5805C7.86027 15.97 8.20227 16.2504 8.59951 16.2504H11.3998C11.7971 16.2504 12.1391 15.97 12.217 15.5805L12.4214 14.5583Z" stroke="#418865" stroke-width="1.25" stroke-linejoin="round"/>
<path d="M17.4997 9.58378H17.9163M2.08301 9.58378H2.49967M15.3024 4.28048L15.597 3.98586M4.16634 15.4171L4.58301 15.0004M15.4163 15.0004L15.833 15.4171M4.40234 3.98644L4.69697 4.28106M9.99967 2.08378V1.66711" stroke="#418865" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M11.6663 16.25V17.5C11.6663 17.9602 11.2933 18.3333 10.833 18.3333H9.16634C8.70609 18.3333 8.33301 17.9602 8.33301 17.5V16.25" stroke="#418865" stroke-width="1.25" stroke-linejoin="round"/>
</svg>

              </div>
              <div class="quiz-action-info-text">Our dietitians usually recommend minimum 6 consultations over 6 months, Today, just book your first.</div>
            </div>
            <div class="quiz-action-feature">
              <div class="quiz-action-feature-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M10.417 2.5031C9.67107 2.49199 8.92091 2.51074 8.19149 2.55923C4.70565 2.79094 1.929 5.60698 1.70052 9.14225C1.65582 9.83408 1.65582 10.5506 1.70052 11.2424C1.78374 12.53 2.35318 13.7222 3.02358 14.7288C3.41283 15.4336 3.15594 16.3132 2.7505 17.0815C2.45817 17.6355 2.312 17.9125 2.42936 18.1126C2.54672 18.3127 2.80887 18.3191 3.33318 18.3318C4.37005 18.3571 5.06922 18.0631 5.62422 17.6538C5.93899 17.4218 6.09638 17.3057 6.20486 17.2923C6.31332 17.279 6.5268 17.3669 6.95367 17.5427C7.33732 17.7007 7.78279 17.7982 8.19149 17.8254C9.37832 17.9043 10.6199 17.9045 11.8092 17.8254C15.295 17.5937 18.0717 14.7777 18.3002 11.2424C18.3354 10.6967 18.3428 10.1356 18.3225 9.58333" stroke="#418865" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M18.333 6.66663L13.333 1.66663M18.333 1.66663L13.333 6.66663" stroke="#418865" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M9.99658 10.4166H10.004M13.3262 10.4166H13.3337M6.66699 10.4166H6.67447" stroke="#418865" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
</svg>

              </div>
              <div class="quiz-action-feature-text">Free cancellation up to 24h before</div>
            </div>
          </div>
          <a href="${resultUrl}" class="quiz-booking-button">Proceed to booking</a>

          <!-- Slots for additional content -->
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
        margin-bottom: 72px;
        align-self: stretch;
      }

      .quiz-action-section {
        background-color: #f1f8f4;
        border-radius: 20px;
        padding: 32px;
        align-self: stretch;
      }

      .quiz-action-content {
        display: flex;
        flex-direction: column;
        gap: 28px;
        align-self: stretch;
      }

      .quiz-action-header {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .quiz-action-title {
        font-family: "PP Radio Grotesk", sans-serif;
        font-size: 24px;
        font-weight: 700;
        line-height: 1.3333333333333333em;
        color: #121212;
				margin: 0;
      }

      .quiz-action-details {
        display: flex;
        flex-direction: column;
        gap: 12px;
        align-self: stretch;
        max-width: 550px;
      }

      .quiz-action-info {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        align-self: stretch;
      }

      .quiz-action-info-icon {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
        margin-top: 2px;
      }

      .quiz-action-info-text {
        line-height: 1.4444444444444444em;
        color: #121212;
        flex: 1;
      }

      .quiz-action-feature {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .quiz-action-feature-icon {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }

      .quiz-action-feature-text {
        font-family: "DM Sans", sans-serif;
        font-size: 18px;
        font-weight: 400;
        line-height: 1.4444444444444444em;
        color: #121212;
      }

      .quiz-booking-button {
        background-color: #306e51;
        color: white;
        border: none;
        border-radius: 300px;
        padding: 14px 40px;
        font-family: "DM Sans", sans-serif;
        font-size: 18px;
        font-weight: 600;
        line-height: 1.3333333333333333em;
        text-align: center;
        cursor: pointer;
        transition: all var(--quiz-transition-fast);
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: fit-content;
        margin-top: 0;
      }

      .quiz-booking-button:hover {
        background-color: var(--quiz-primary-hover);
        transform: translateY(-1px);
      }

      .quiz-booking-button:disabled {
        background-color: #6c757d;
        cursor: not-allowed;
        transform: none;
      }

      .quiz-booking-button:disabled:hover {
        background-color: #6c757d;
        transform: none;
      }

      /* Mobile responsive styles */
      @media (max-width: 768px) {
        :host {
          margin-bottom: 72px;
        }

        .quiz-action-section {
          padding: 32px;
        }

        .quiz-action-title {
          font-size: 24px;
        }

        .quiz-action-details {
          gap: 12px;
        }

        .quiz-booking-button {
          padding: 14px 40px;
          font-size: 18px;
          margin-top: 0;
        }
      }
    `;
	}

	render() {
		this.renderTemplate();
		this.updateBackgroundColor();
	}

	handleAttributeChange(name, oldValue, newValue) {
		if (name === "background-color") {
			this.updateBackgroundColor();
		}
	}

	updateBackgroundColor() {
		const backgroundColor = this.getAttribute("background-color");
		if (backgroundColor) {
			const section = this.querySelector(".quiz-action-section");
			if (section) {
				section.style.background = backgroundColor;
			}
		}
	}

	onConnected() {
		// Dispatch event when action section is ready
		this.dispatchCustomEvent("quiz-action-section-ready", {
			title: this.getAttribute("title"),
			type: this.getAttribute("type")
		});
	}

	/**
	 * Utility method to set action data programmatically
	 */
	setAction(title, type = "default", backgroundColor = null) {
		this.setAttributes({
			title,
			type,
			"background-color": backgroundColor
		});
	}

	/**
	 * Get action data
	 */
	getAction() {
		return {
			title: this.getAttribute("title"),
			type: this.getAttribute("type"),
			backgroundColor: this.getAttribute("background-color")
		};
	}
}

// Register the component
if (!customElements.get("quiz-action-section")) {
	quizComponentRegistry.register("quiz-action-section", QuizActionSection);
}

export default QuizActionSection;
