import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        alpine: "#1f7a68",
        lake: "#2b6cb0",
        signal: "#d97706",
      },
      boxShadow: {
        soft: "0 16px 40px rgba(23, 32, 38, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
