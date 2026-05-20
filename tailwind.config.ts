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
        primary: "hsl(148, 100%, 38%)",
        "on-primary": "hsl(0, 0%, 100%)",
        "primary-container": "hsl(139, 73%, 57%)",
        "on-primary-container": "hsl(145, 100%, 16%)",
        secondary: "hsl(151, 88%, 23%)",
        "on-secondary": "hsl(0, 0%, 100%)",
        "secondary-container": "hsl(139, 53%, 68%)",
        "on-secondary-container": "hsl(151, 100%, 16%)",
        tertiary: "hsl(141, 20%, 33%)",
        error: "hsl(0, 75%, 50%)",
        "on-error": "hsl(0, 0%, 100%)",
        "error-container": "hsl(0, 75%, 90%)",
        background: "hsl(90, 29%, 97%)",
        "on-background": "hsl(140, 6%, 10%)",
        surface: "hsl(90, 29%, 97%)",
        "on-surface": "hsl(140, 6%, 10%)",
        "surface-variant": "hsl(111, 11%, 88%)",
        "on-surface-variant": "hsl(130, 4%, 27%)",
        outline: "hsl(129, 3%, 46%)",
        "outline-variant": "hsl(111, 6%, 77%)",
      },
    },
  },
  plugins: [],
};

export default config;
