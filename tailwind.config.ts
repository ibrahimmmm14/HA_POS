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
        primary: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#bae0fd",
          300: "#7cc5fb",
          400: "#36a6f7",
          500: "#0b88e7",
          600: "#016bc4",
          700: "#02559f",
          800: "#064883",
          900: "#0b3d6d",
        },
        hearing: {
          blue: "#2563eb",
          red: "#dc2626",
          teal: "#0d9488",
          purple: "#7c3aed",
          amber: "#d97706",
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        arabic: ["Cairo", "Tahoma", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
