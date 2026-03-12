import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f3f4ee",
          100: "#e2e5d5",
          500: "#6E7450",
          700: "#565b3f",
          900: "#3d412d"
        }
      },
      boxShadow: {
        soft: "0 20px 40px rgba(15, 23, 42, 0.12)",
      }
    },
  },
  plugins: [],
} satisfies Config;
