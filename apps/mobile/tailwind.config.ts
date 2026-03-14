import type { Config } from "tailwindcss";

function cssVar(name: string) {
  return `rgb(var(--${name}) / <alpha-value>)`;
}

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: cssVar("background"),
        foreground: cssVar("foreground"),
        card: {
          DEFAULT: cssVar("card"),
          foreground: cssVar("card-foreground"),
        },
        primary: {
          DEFAULT: cssVar("primary"),
          foreground: cssVar("primary-foreground"),
        },
        secondary: {
          DEFAULT: cssVar("secondary"),
          foreground: cssVar("secondary-foreground"),
        },
        muted: {
          DEFAULT: cssVar("muted"),
          foreground: cssVar("muted-foreground"),
        },
        accent: {
          DEFAULT: cssVar("accent"),
          foreground: cssVar("accent-foreground"),
        },
        destructive: {
          DEFAULT: cssVar("destructive"),
          foreground: cssVar("destructive-foreground"),
        },
        border: cssVar("border"),
        input: cssVar("input"),
        ring: cssVar("ring"),
        popover: {
          DEFAULT: cssVar("popover"),
          foreground: cssVar("popover-foreground"),
        },
      },
      fontFamily: {
        thaana: ['"MV Typewriter"', "sans-serif"],
        "thaana-heading": ['"Sangu Suruhee"', '"MV Typewriter"', "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", '"SF Mono"', "Menlo", "Consolas", "monospace"],
      },
    },
  },
  presets: [require("nativewind/preset")],
  plugins: [],
};

export default config;
