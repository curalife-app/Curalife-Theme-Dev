import tailwindcssEmpty from "tailwindcss-empty";

export default {
	content: ["./src/liquid/**/*.liquid", "./src/scripts/**/*.js"],
	theme: {
		fontSize: { xs: ["12px", "16px"], sm: ["16px", "20px"], base: ["18px", "24px"], lg: ["20px", "28px"], xl: ["24px", "32px"] },
		screens: { sm: { max: "640px" }, md: { max: "768px" }, lg: { max: "1024px" }, xl: { max: "1200px" }, mbl: { max: "768px" }, dsk: { min: "768px" } },
		extend: {
			spacing: { "45%": "45%", "50%": "50%", "70%": "70%", "250px": "250px", "448px": "448px", "500px": "500px" },
			maxWidth: { "1/2": "50%", "1/3": "33.333333%", "1/4": "25%", "30%": "30%" },
			minWidth: { "1/2": "50%" },
			colors: { primary: "var(--primary-color)" }
		}
	},
	variants: { textColor: ["odd", "even"] },
	modules: { display: ["responsive", "empty"] },
	plugins: [tailwindcssEmpty()],
	corePlugins: {
		container: false
	}
};
