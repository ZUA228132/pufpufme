import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f7ff",
          100: "#dbe9ff",
          500: "#2563eb",
          600: "#1d4ed8",
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
