
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        premiumBg: "#020617",
      },
      fontFamily:{
        jetbrains: ["'JetBrains Mono'", "monospace"],

      },
    },
  },
  plugins: [],
};


