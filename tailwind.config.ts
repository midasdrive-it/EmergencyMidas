import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1B1913",
        paper: "#F6F3EC",
        surface: "#FFFFFF",
        line: "#E2DCCB",
        rust: {
          DEFAULT: "#C43E1C",
          dark: "#9E3115",
        },
        signal: {
          green: "#3F7D53",
          greenBg: "#E6F0E8",
          amber: "#C98A1E",
          amberBg: "#F5EBD6",
        },
        muted: "#8C8570",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
