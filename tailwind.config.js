module.exports = {
  content: [
    './src/liquid/sections/*.liquid',
    './src/liquid/snippets/*.liquid'
  ],
  theme: {
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px"
    },
    fontSize: {
      sm: '14px',
      base: '16px',
      lg: '20px',
      xl: '24px',
      '2xl': '32px',
      '3xl': '48px',
      '4xl': '64px',
      '5xl': '96px',
      '6xl': '128px'
    },
    extend: {},
  },
  plugins: [],
}
