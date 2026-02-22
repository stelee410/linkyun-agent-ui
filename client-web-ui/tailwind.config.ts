import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "var(--theme-primary)",
        background: "var(--theme-background)",
        surface: "var(--theme-surface)",
        border: "var(--theme-border)",
        "text-primary": "var(--theme-text-primary)",
        "text-secondary": "var(--theme-text-secondary)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["ui-monospace", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0.75rem",
      },
    },
  },
  plugins: [],
};
export default config;
