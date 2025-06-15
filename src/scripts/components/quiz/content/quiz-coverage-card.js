import { QuizBaseComponent, quizComponentRegistry } from "../base/quiz-base-component.js";

/**
 * Coverage Card Component
 *
 * A reusable card component for displaying insurance coverage information.
 * Supports different types (success, error, warning) with appropriate styling.
 *
 * Usage:
 * <quiz-coverage-card title="What's Covered" type="success">
 *   <quiz-benefit-item icon="checkmark" text="5 sessions covered"></quiz-benefit-item>
 *   <quiz-benefit-item icon="calendar" text="Coverage expires Dec 31, 2025"></quiz-benefit-item>
 * </quiz-coverage-card>
 */
class QuizCoverageCard extends QuizBaseComponent {
	static get observedAttributes() {
		return ["title", "sessions-covered", "plan-end"];
	}

	connectedCallback() {
		this.render();
	}

	attributeChangedCallback() {
		if (this.isConnected) {
			this.render();
		}
	}

	render() {
		const title = this.getAttribute("title") || "Here's Your Offer";
		const sessionsCovered = this.getAttribute("sessions-covered") || "5";
		const planEnd = this.getAttribute("plan-end") || "Dec 31, 2025";

		this.shadowRoot.innerHTML = `
			<style>
							:host {
				display: block;
				margin-bottom: 36px;
				margin-top: 52px;
				align-self: stretch;
			}

				.quiz-coverage-card {
					border: 1px solid #bdddc9;
					border-radius: 20px;
					padding: 32px;
					background-color: white;
					align-self: stretch;
				}

				.quiz-coverage-card-title {
					font-family: "PP Radio Grotesk", sans-serif;
					font-size: 24px;
					font-weight: 700;
					line-height: 1.3333333333333333em;
					color: #121212;
					margin-bottom: 16px;
				}

				.quiz-coverage-pricing {
					display: flex;
					flex-direction: column;
					gap: 8px;
					margin-bottom: 16px;
					width: fit-content;
				}

				.quiz-coverage-service-item {
					display: flex;
					align-items: center;
					gap: 32px;
					width: fit-content;
				}

				.quiz-coverage-service {
					font-family: "DM Sans", sans-serif;
					font-size: 18px;
					font-weight: 400;
					line-height: 1.4444444444444444em;
					color: #121212;
					flex: 1;
					width: 312px;
				}

				.quiz-coverage-cost {
					display: flex;
					align-items: center;
					gap: 4px;
				}

				.quiz-coverage-copay {
					font-family: "DM Sans", sans-serif;
					font-size: 18px;
					font-weight: 800;
					line-height: 1.4444444444444444em;
					color: #121212;
				}

				.quiz-coverage-original-price {
					font-family: "DM Sans", sans-serif;
					font-size: 18px;
					font-weight: 400;
					line-height: 1.3333333333333333em;
					color: #6d6d6d;
					text-decoration: line-through;
				}

				.quiz-coverage-divider {
					width: 100%;
					height: 0.5px;
					background-color: #bdddc9;
					margin: 16px 0;
				}

				.quiz-coverage-benefits {
					display: flex;
					flex-direction: column;
					gap: 12px;
				}

				.quiz-coverage-benefit {
					display: flex;
					align-items: center;
					gap: 8px;
				}

				.quiz-coverage-benefit-icon {
					width: 20px;
					height: 20px;
					flex-shrink: 0;
				}

				.quiz-coverage-benefit-text {
					font-family: "DM Sans", sans-serif;
					font-size: 16px;
					font-weight: 400;
					line-height: 1.5em;
					color: #4f4f4f;
				}

				@media (max-width: 768px) {
					:host {
						margin-bottom: 28px;
						margin-top: 32px;
						width: 100%;
					}

					.quiz-coverage-card {
						padding: 20px;
						align-self: stretch;
						width: 100%;
					}

					.quiz-coverage-card-title {
						font-size: 24px;
						line-height: 1.3333333333333333em;
						margin-bottom: 12px;
					}

					.quiz-coverage-pricing {
						flex-direction: column;
						gap: 16px;
						align-items: stretch;
						margin-bottom: 16px;
					}

					.quiz-coverage-service-item {
						display: flex;
						flex-direction: column;
						gap: 8px;
						width: 100%;
						align-items: start;
					}

					.quiz-coverage-service {
						font-size: 18px;
						line-height: 1.3333333333333333em;
						width: unset;
					}

					.quiz-coverage-cost {
						display: flex;
						align-items: center;
						gap: 4px;
					}

					.quiz-coverage-copay {
						font-size: 18px;
						font-weight: 700;
						line-height: 1.3333333333333333em;
					}

					.quiz-coverage-original-price {
						font-size: 18px;
						line-height: 1.3333333333333333em;
					}

					.quiz-coverage-benefits {
						gap: 12px;
					}

					.quiz-coverage-benefit-text {
						font-size: 16px;
						line-height: 1.5em;
					}

					.quiz-coverage-divider {
						margin: 16px 0;
					}
				}
			</style>

			<div class="quiz-coverage-card">
				<div class="quiz-coverage-card-title">${title}</div>

				<div class="quiz-coverage-pricing">
					<div class="quiz-coverage-service-item">
						<div class="quiz-coverage-service">Initial consultation – 60 minutes</div>
						<div class="quiz-coverage-cost">
							<div class="quiz-coverage-copay">Co-pay: $0*</div>
							<div class="quiz-coverage-original-price">$100</div>
						</div>
					</div>
					<div class="quiz-coverage-service-item">
						<div class="quiz-coverage-service">Follow-up consultation – 30 minutes</div>
						<div class="quiz-coverage-cost">
							<div class="quiz-coverage-copay">Co-pay: $0*</div>
							<div class="quiz-coverage-original-price">$50</div>
						</div>
					</div>
				</div>

				<div class="quiz-coverage-divider"></div>

				<div class="quiz-coverage-benefits">
					<div class="quiz-coverage-benefit">
						<div class="quiz-coverage-benefit-icon">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M10.4163 1.66663H7.08301L7.49967 2.49996H9.99967L10.4163 1.66663Z" stroke="#418865" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M14.1663 14.1666V17.0833C14.1663 17.7736 13.6067 18.3333 12.9163 18.3333H4.58301C3.89265 18.3333 3.33301 17.7736 3.33301 17.0833V2.91663C3.33301 2.22627 3.89265 1.66663 4.58301 1.66663H12.9163C13.6067 1.66663 14.1663 2.22627 14.1663 2.91663V5.83329" stroke="#418865" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M10 10.4167L12.0833 12.5L16.6667 7.5" stroke="#418865" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
</svg>

						</div>
						<div class="quiz-coverage-benefit-text">${sessionsCovered} covered sessions remaining</div>
					</div>
					<div class="quiz-coverage-benefit">
						<div class="quiz-coverage-benefit-icon">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M15.2223 15.5842L14.1663 15V13.5556M17.4997 15C17.4997 16.8409 16.0073 18.3333 14.1663 18.3333C12.3254 18.3333 10.833 16.8409 10.833 15C10.833 13.159 12.3254 11.6666 14.1663 11.6666C16.0073 11.6666 17.4997 13.159 17.4997 15Z" stroke="#418865" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M13.75 1.66663V4.99996M6.25 1.66663V4.99996" stroke="#418865" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M17.5 10V5.00004C17.5 4.07957 16.7538 3.33337 15.8333 3.33337H4.16667C3.24619 3.33337 2.5 4.07957 2.5 5.00004V16.6667C2.5 17.5872 3.24619 18.3334 4.16667 18.3334H9.16667" stroke="#418865" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M2.5 8.33337H17.5" stroke="#418865" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
</svg>

						</div>
						<div class="quiz-coverage-benefit-text">Coverage expires ${planEnd}</div>
					</div>
				</div>
			</div>
		`;
	}
}

// Register the component
if (!customElements.get("quiz-coverage-card")) {
	quizComponentRegistry.register("quiz-coverage-card", QuizCoverageCard);
}

export default QuizCoverageCard;
