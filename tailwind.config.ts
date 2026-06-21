import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#07111f",
        panel: "#0d1b2d",
        line: "#1b3454",
        electric: "#1e8bff",
        urgent: "#ef4444",
        verified: "#16a34a"
      },
      fontFamily: {
        sans: ["Inter", "Arial", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
