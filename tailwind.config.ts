import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg)",
        bg: "var(--bg)",
        surface: "var(--surface)",
        card: "var(--card)",
        popover: "var(--card)",
        text: "var(--text)",
        muted: "var(--text-muted)",
        "muted-foreground": "var(--text-muted)",
        brand: "var(--brand)",
        brandDeep: "var(--brand-deep)",
        brandShade: "var(--brand-shade)",
        brandBright: "var(--brand-bright)",
        border: "var(--border)"
      },
      boxShadow: {
        brand: "0 0 0 1px rgba(176,80,0,0.25), 0 10px 30px rgba(176,80,0,0.15)"
      },
      backgroundImage: {
        "brand-radial": "radial-gradient(circle at 20% 20%, rgba(176,80,0,0.18), transparent 60%)",
        "brand-linear": "linear-gradient(120deg, rgba(176,80,0,0.15), rgba(128,48,0,0.05))"
      }
    }
  },
  plugins: []
};

export default config;
