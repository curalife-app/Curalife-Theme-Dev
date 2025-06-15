import { QuizBaseComponent, quizComponentRegistry } from "../base/quiz-base-component.js";

/**
 * Benefit Item Component
 *
 * Displays individual benefit items with icons and text.
 * Designed to be used within quiz-coverage-card components.
 *
 * Usage:
 * <quiz-benefit-item icon="checkmark" text="5 covered sessions remaining"></quiz-benefit-item>
 * <quiz-benefit-item icon="calendar" text="Coverage expires Dec 31, 2025"></quiz-benefit-item>
 * <quiz-benefit-item icon="clock" text="30-60 Minutes per session"></quiz-benefit-item>
 */
class QuizBenefitItem extends QuizBaseComponent {
	static get observedAttributes() {
		return ["icon", "text", "icon-color", "icon-size"];
	}

	getTemplate() {
		const iconType = this.getAttribute("icon") || "checkmark";
		const text = this.getAttribute("text") || "";
		const iconColor = this.getAttribute("icon-color") || "#306E51";
		const iconSize = this.getAttribute("icon-size") || "20";

		return `
      <div class="quiz-benefit-item">
        <div class="quiz-benefit-icon">
          ${this.getIconHTML(iconType, iconColor, iconSize)}
        </div>
        <div class="quiz-benefit-text">
          ${this.sanitizeHTML(text)}
        </div>
      </div>
    `;
	}

	getIconHTML(type, color, size) {
		const commonAttrs = `width="${size}" height="${size}" role="img"`;

		switch (type) {
			case "calendar":
				return `
          <svg ${commonAttrs} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Calendar">
            <path d="M6.66666 2.5V5.83333M13.3333 2.5V5.83333M2.5 9.16667H17.5M4.16666 3.33333H15.8333C16.7538 3.33333 17.5 4.07952 17.5 5V16.6667C17.5 17.5871 16.7538 18.3333 15.8333 18.3333H4.16666C3.24619 18.3333 2.5 17.5871 2.5 16.6667V5C2.5 4.07952 3.24619 3.33333 4.16666 3.33333Z" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;

			case "clock":
				return `
          <svg ${commonAttrs} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Clock">
            <path d="M12 8V12L15 15" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="12" r="9" stroke="${color}" stroke-width="2"/>
          </svg>
        `;

			case "checkmark":
			default:
				return `
          <svg ${commonAttrs} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Checkmark">
            <path d="M10 18.3333C14.6023 18.3333 18.3333 14.6023 18.3333 9.99996C18.3333 5.39759 14.6023 1.66663 10 1.66663C5.39762 1.66663 1.66666 5.39759 1.66666 9.99996C1.66666 14.6023 5.39762 18.3333 10 18.3333Z" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M7.5 9.99996L9.16667 11.6666L12.5 8.33329" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
		}
	}

	getStyles() {
		return `
      ${super.getStyles()}

      :host {
        display: block;
        margin: 8px 0;
      }

      .quiz-benefit-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 8px 0;
      }

      .quiz-benefit-icon {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        margin-top: -2px; /* Optical alignment */
      }

      .quiz-benefit-icon svg {
        display: block;
      }

      .quiz-benefit-text {
        flex: 1;
        font-size: 14px;
        line-height: 1.5;
        color: var(--quiz-primary-color);
      }

      /* Strong text formatting */
      .quiz-benefit-text strong {
        font-weight: 600;
        color: var(--quiz-secondary-color);
      }

      /* Mobile responsive */
      @media (max-width: 768px) {
        .quiz-benefit-item {
          gap: 10px;
          padding: 6px 0;
        }

        .quiz-benefit-icon {
          width: 28px;
          height: 28px;
        }

        .quiz-benefit-text {
          font-size: 13px;
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

	/**
	 * Utility method to set benefit data programmatically
	 */
	setBenefit(icon, text, iconColor = "#306E51") {
		this.setAttributes({
			icon,
			text,
			"icon-color": iconColor
		});
	}

	/**
	 * Get benefit data
	 */
	getBenefit() {
		return {
			icon: this.getAttribute("icon"),
			text: this.getAttribute("text"),
			iconColor: this.getAttribute("icon-color"),
			iconSize: this.getAttribute("icon-size")
		};
	}
}

// Register the component
if (!customElements.get("quiz-benefit-item")) {
	quizComponentRegistry.register("quiz-benefit-item", QuizBenefitItem);
}

export default QuizBenefitItem;
