import { QuizBaseComponent, quizComponentRegistry } from "../base/quiz-base-component.js";

/**
 * Clock Icon Component
 *
 * Usage:
 * <quiz-clock-icon size="24" color="#306E51"></quiz-clock-icon>
 * <quiz-clock-icon size="20" color="currentColor"></quiz-clock-icon>
 */
class QuizClockIcon extends QuizBaseComponent {
	constructor() {
		super();
		this.config.useShadowDOM = false; // Icons don't need shadow DOM
	}

	static get observedAttributes() {
		return ["size", "color", "stroke-width"];
	}

	getTemplate() {
		const size = this.getAttribute("size") || "24";
		const color = this.getAttribute("color") || "#306E51";
		const strokeWidth = this.getAttribute("stroke-width") || "2";

		return `
      <svg
        width="${size}"
        height="${size}"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Clock icon"
      >
        <path
          d="M12 8V12L15 15"
          stroke="${color}"
          stroke-width="${strokeWidth}"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="${color}"
          stroke-width="${strokeWidth}"
        />
      </svg>
    `;
	}

	render() {
		this.innerHTML = this.getTemplate();
	}
}

// Register the component
if (!customElements.get("quiz-clock-icon")) {
	quizComponentRegistry.register("quiz-clock-icon", QuizClockIcon);
}

export default QuizClockIcon;
