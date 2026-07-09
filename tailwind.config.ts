import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        ink: "var(--ink)",
        "ink-muted": "var(--ink-muted)",
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "status-open": "var(--status-open)",
        "status-progress": "var(--status-progress)",
        "status-resolved": "var(--status-resolved)",
        border: "var(--border)",
      },
    },
  },
  plugins: [],
};
export default config;
