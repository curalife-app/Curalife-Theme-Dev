import { QuizBaseComponent, quizComponentRegistry } from "../base/quiz-base-component.js";

/**
 * Checkmark Icon Component
 *
 * Usage:
 * <quiz-checkmark-icon size="20" color="#306E51"></quiz-checkmark-icon>
 * <quiz-checkmark-icon size="16" color="currentColor" type="circle"></quiz-checkmark-icon>
 */
class QuizCheckmarkIcon extends QuizBaseComponent {
	constructor() {
		super();
		this.config.useShadowDOM = false; // Icons don't need shadow DOM
	}

	static get observedAttributes() {
		return ["size", "color", "stroke-width", "type"];
	}

	getTemplate() {
		const size = this.getAttribute("size") || "20";
		const color = this.getAttribute("color") || "#306E51";
		const strokeWidth = this.getAttribute("stroke-width") || "1.5";
		const type = this.getAttribute("type") || "simple"; // 'simple' or 'circle'

		if (type === "circle") {
			return `
        <svg
          width="${size}"
          height="${size}"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Checkmark in circle icon"
        >
          <path
            d="M10 18.3333C14.6023 18.3333 18.3333 14.6023 18.3333 9.99996C18.3333 5.39759 14.6023 1.66663 10 1.66663C5.39762 1.66663 1.66666 5.39759 1.66666 9.99996C1.66666 14.6023 5.39762 18.3333 10 18.3333Z"
            stroke="${color}"
            stroke-width="${strokeWidth}"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M7.5 9.99996L9.16667 11.6666L12.5 8.33329"
            stroke="${color}"
            stroke-width="${strokeWidth}"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      `;
		}

		return `
      <svg
        width="${size}"
        height="${size}"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Checkmark icon"
      >
        <path
          d="M7.5 9.99996L9.16667 11.6666L12.5 8.33329"
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
if (!customElements.get("quiz-checkmark-icon")) {
	quizComponentRegistry.register("quiz-checkmark-icon", QuizCheckmarkIcon);
}

export default QuizCheckmarkIcon;
