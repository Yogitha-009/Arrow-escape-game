import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        board: {
          bg: "#212233",
          cell: "#2a2c47",
          line: "#3a3d63",
        },
      },
      fontFamily: {
        game: ["var(--font-game)", "sans-serif"],
      },
      keyframes: {
        "flash-red": {
          "0%, 100%": { opacity: "0" },
          "50%": { opacity: "1" },
        },
        "flash-green": {
          "0%, 100%": { opacity: "0" },
          "50%": { opacity: "1" },
        },
        "heart-lost": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.4)" },
          "100%": { transform: "scale(1)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "flash-red": "flash-red 0.4s ease-in-out",
        "flash-green": "flash-green 0.4s ease-in-out",
        "heart-lost": "heart-lost 0.3s ease-in-out",
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
