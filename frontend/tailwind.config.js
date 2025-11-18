import forms from "@tailwindcss/forms";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eef5ff",
          100: "#d6e7ff",
          200: "#adceff",
          300: "#7caeff",
          400: "#4b88ff",
          500: "#2563eb",
          600: "#1e4fd1",
          700: "#1b3fad",
          800: "#1a348c",
          900: "#182d72",
        },
      },
    },
  },
  plugins: [forms],
};
