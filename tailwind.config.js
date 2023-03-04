module.exports = {
  content: [
    './src/liquid/sections/*.liquid',
    './src/liquid/snippets/*.liquid'
  ],
  theme: {
    screens: {
      sm: { max: "640px" },
      md: { max: "768px" },
      lg: { max: "1024px" },
      xl: { max: "1200px" },
      'sm-mobile': { max: "640px" },
      'mobile': { max: "768px" },
      'tablet': { max: "1024px" },
      'desktop': { max: "1200px" },
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
      '6xl': '128px',
      '7xl': '192px',
      '8xl': '256px'
    },
    maxWidth: {
      '1/2': '50%',
      '1/3': '33.333333%',
    },
    maxHeight: {
      '250px': '250px',
      '448px': '448px',
      '500px': '500px',
    },
    extend: {
      spacing: {
        '500': '500px',
      },
      colors: {
        darkGrey: '#222222',
        grey: '#838383',
        lightGrey: '#C4C4C4',
        darkerGreen: '#2d3224',
        darkGreen: '#404733',
        green: '#4B643D',
        darkTurquoise: '#5D8F8F',
        lightTurquoise: '#F9FFFF',
        lightGreen: '#9EB069',
        lighterGreen: '#E1E8CF',
        vomit: '#E8E8B0',
        lightVomit: '#FAFAEF',
        lighterVomit: '#FFFFF4',
        darkPurple: '#897389',
        purple: '#D6C7D6',
        lightPurple: '#FCF9FC',
        darkBrown: '#a86129',
        brown: '#C0956B',
        lightBrown: '#F0D4A6',
        lighterBrown: '#FFFAF5',
        darkOrange: '#E58638',
        orange: '#FFB22D',
        red: '#ED073E',
        darkPeach: '#CC6F4F',
        peach: '#F59E80',
        lightPeach: '#f6cdbf',
        lighterPeach: '#FFF6F8',
        lightPink: '#FFF1E8'
      }
    },
  },
  variants: {
    textColor: ['odd', 'even']
  },
  plugins: [],
}
