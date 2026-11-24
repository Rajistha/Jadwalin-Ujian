import type { Config } from "tailwindcss";

// Tailwind v4 — config is minimal; design tokens live in globals.css @theme
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
};

export default config;
