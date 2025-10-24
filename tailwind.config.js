/** @type {import('tailwindcss').Config} */
const { fontFamily } = require("tailwindcss/defaultTheme");

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // 'your-custom-font-name': ['Font Name from Google Fonts', 'fallback-font'],
        roboto: ["Poppins", "sans-serif"],
      },
    },
  },
  plugins: [],
};
