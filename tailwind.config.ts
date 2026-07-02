import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pitch: {
          950: "#04110a",
          900: "#07230f",
          800: "#0d3818",
        },
        pulse: {
          DEFAULT: "#22c55e",
          soft: "#4ade80",
        },
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.8" },
          "70%": { transform: "scale(1.4)", opacity: "0" },
          "100%": { transform: "scale(1.4)", opacity: "0" },
        },
        "slide-in": {
          "0%": { transform: "translateY(-8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "goal-flash": {
          "0%": { opacity: "0" },
          "15%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "goal-text": {
          "0%": { transform: "scale(0.3) rotate(-6deg)", opacity: "0" },
          "40%": { transform: "scale(1.15) rotate(2deg)", opacity: "1" },
          "60%": { transform: "scale(0.95) rotate(0deg)" },
          "80%": { transform: "scale(1.02)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        confetti: {
          "0%": { transform: "translateY(-10vh) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(110vh) rotate(720deg)", opacity: "0.4" },
        },
        "score-pop": {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.35)" },
          "100%": { transform: "scale(1)" },
        },
        "hype-tap": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(0.92)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-in": "slide-in 0.35s ease-out",
        "goal-flash": "goal-flash 1.4s ease-out forwards",
        "goal-text": "goal-text 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "score-pop": "score-pop 0.5s ease-out",
        "hype-tap": "hype-tap 0.18s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
