import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#2f363d",
        sidebar: "#4f5a65",
        panel: "#ffffff",
        line: "#dfe8d8",
        electric: "#76b82a",
        urgent: "#d9233f",
        verified: "#4b8f1f"
      },
      fontFamily: {
        sans: ["Inter", "Arial", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
