import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
        50: "#fdf2ff",
        100: "#f5d0ff",
        500: "#e879f9",
        600: "#c026d3",
        900: "#0b1f4a"
        }
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem"
      },
      boxShadow: {
        soft: "0 10px 40px rgba(15,23,42,0.12)"
      }
    }
  },
  plugins: [],
};

export default config;
