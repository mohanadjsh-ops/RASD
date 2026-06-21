import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#f6f8f3",
        panel: "#ffffff",
        line: "#dfe8d8",
        electric: "#76b82a",
        urgent: "#ef4444",
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
