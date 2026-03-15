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
          primary: "#0A0A0C",
          secondary: "#141416",
          tertiary: "#1C1C1E",
          card: "#1A1A1D",
          elevated: "#1C1C1E",
          hover: "#252528",
          input: "#111113",
        },
        accent: {
          DEFAULT: "#4A90D9",
          hover: "#5BA0E9",
          muted: "rgba(74, 144, 217, 0.12)",
        },
        text: {
          primary: "#E5E5E7",
          secondary: "#8E8E93",
          muted: "#5A5A5E",
        },
        border: {
          DEFAULT: "#2A2A2C",
          hover: "#3A3A3C",
        },
        // Figma-inspired vibrant palette
        fig: {
          red: "#F24822",
          orange: "#FF8C00",
          yellow: "#FFCD29",
          green: "#14AE5C",
          blue: "#0D99FF",
          indigo: "#5B5FC7",
          purple: "#9747FF",
          pink: "#E84393",
          cyan: "#00C2CB",
          gray: "#8E8E93",
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
        display: ["'Playfair Display'", "Georgia", "serif"],
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
