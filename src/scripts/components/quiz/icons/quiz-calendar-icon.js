import { QuizBaseComponent, quizComponentRegistry } from "../base/quiz-base-component.js";

/**
 * Calendar Icon Component
 *
 * Usage:
 * <quiz-calendar-icon size="20" color="#306E51"></quiz-calendar-icon>
 * <quiz-calendar-icon size="24" color="currentColor"></quiz-calendar-icon>
 */
class QuizCalendarIcon extends QuizBaseComponent {
	constructor() {
		super();
		this.config.useShadowDOM = false; // Icons don't need shadow DOM
	}

	static get observedAttributes() {
		return ["size", "color", "stroke-width"];
	}

	getTemplate() {
		const size = this.getAttribute("size") || "20";
		const color = this.getAttribute("color") || "currentColor";
		const strokeWidth = this.getAttribute("stroke-width") || "1.5";

		return `
      <svg
        width="${size}"
        height="${size}"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Calendar icon"
      >
        <path
          d="M6.66666 2.5V5.83333M13.3333 2.5V5.83333M2.5 9.16667H17.5M4.16666 3.33333H15.8333C16.7538 3.33333 17.5 4.07952 17.5 5V16.6667C17.5 17.5871 16.7538 18.3333 15.8333 18.3333H4.16666C3.24619 18.3333 2.5 17.5871 2.5 16.6667V5C2.5 4.07952 3.24619 3.33333 4.16666 3.33333Z"
          stroke="${color}"
          stroke-width="${strokeWidth}"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    `;
	}

	render() {
		this.innerHTML = this.getTemplate();
	}
}

// Register the component
if (!customElements.get("quiz-calendar-icon")) {
	quizComponentRegistry.register("quiz-calendar-icon", QuizCalendarIcon);
}

export default QuizCalendarIcon;
