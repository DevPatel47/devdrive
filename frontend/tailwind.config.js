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
          50: "#f4f6f8",
          100: "#e1e5ea",
          200: "#c6ced7",
          300: "#a2b0bf",
          400: "#7a8a9f",
          500: "#55687e",
          600: "#3a4d64",
          700: "#232f3e",
          800: "#1b2532",
          900: "#131a23",
        },
        accent: {
          50: "#f2f8ff",
          100: "#d7e9ff",
          200: "#b2d4ff",
          300: "#84bcff",
          400: "#4e9ef5",
          500: "#1a73e8",
          600: "#0f62d0",
          700: "#0a4faa",
          800: "#084085",
          900: "#062d5f",
        },
        neutral: {
          50: "#f2f3f3",
          100: "#eaecf0",
          200: "#d5d7dc",
          300: "#bfc2c9",
          400: "#a4a8b0",
          500: "#7f8793",
          600: "#4a5568",
          700: "#384152",
          800: "#242b38",
          900: "#161b27",
        },
        slate: {
          50: "#f2f3f3",
          100: "#eaecf0",
          200: "#d5d7dc",
          300: "#bfc2c9",
          400: "#a4a8b0",
          500: "#7f8793",
          600: "#4a5568",
          700: "#384152",
          800: "#242b38",
          900: "#161b27",
        },
      },
    },
  },
  plugins: [forms],
};
