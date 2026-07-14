/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        brand: {
          ink: "#2D2A2A",
          crema: "#EAD5C0",
          "crema-light": "#F3E5D4",
          "crema-dark": "#D4BA9E",
          mauve: "#B8A9C9",
          "mauve-light": "#D4C9E0",
          "mauve-dark": "#9584A8",
          blush: "#FDF5F4",
          pearl: "#FAF8F7",
          gold: "#C9A96E",
          "gold-light": "#DEC89A",
        },
      },
      fontFamily: {
        rounded: ['"Outfit"', "sans-serif"],
        script: ['"Dancing Script"', "cursive"],
        serif: ['"Playfair Display"', "serif"],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      keyframes: {
        "float-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "float-subtle": "float-subtle 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
