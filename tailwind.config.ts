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
        bg: {
          primary: "#0C0C0E",
          secondary: "#121215",
          tertiary: "#1C1C22",
          card: "#16161A",
          elevated: "#1E1E24",
          hover: "#26262E",
        },
        accent: {
          DEFAULT: "#F5A623",
          hover: "#FFB84D",
          muted: "rgba(245, 166, 35, 0.12)",
        },
        text: {
          primary: "#E4E4E7",
          secondary: "#8B8B96",
          muted: "#56565F",
        },
        border: {
          DEFAULT: "#2A2A32",
          hover: "#38384A",
        },
        priority: {
          urgente: "#EF4444",
          alta: "#EAB308",
          normal: "#A1A1AA",
        },
        tag: {
          editar: "#3B82F6",
          ajuste: "#F59E0B",
          mix: "#8B5CF6",
          entregue: "#22C55E",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)',
        'elevated': '0 8px 24px rgba(0, 0, 0, 0.5), 0 4px 8px rgba(0, 0, 0, 0.3)',
        'dropdown': '0 12px 32px rgba(0, 0, 0, 0.6)',
      },
    },
  },
  plugins: [],
};
export default config;
