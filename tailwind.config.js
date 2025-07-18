/** @type {import('tailwindcss').Config} */
export default {
  content: [],
  theme: {
    extend: {
      colors: {
        bg: {
          dark: "#0c0b10",
          light: "#f7fafc",
        },
        primary: {
          light: "#8ecae6",
          DEFAULT: "#219ebc",
          dark: "#023047",
        },
        secondary: {
          light: "#ffb703",
          DEFAULT: "#fb8500",
          dark: "#e07a5f",
        },
        // Add more custom colors as needed
      },
      backgroundColor: {
        dark: "#0c0b10", // Dark mode background
        "dark-secondary": "#1f1e25", // Dark mode secondary background
        "dark-card": "#151419",
      },
      textColor: {
        light: "#f7fafc", // Light text color for dark mode
        dark: "white", // Dark text color for light mode
      },
    },
  },
  plugins: [],
};