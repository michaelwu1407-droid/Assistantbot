import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Tie Tailwind rounded corners to the shared radius tokens.
      // This makes `rounded`, `rounded-lg`, etc align with `--radius: 18px`.
      borderRadius: {
        DEFAULT: "var(--radius)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius)",
        xl: "var(--radius)",
        "2xl": "var(--radius)",
        full: "var(--radius-full)",
      },
    },
  },
  plugins: [],
};

export default config;
