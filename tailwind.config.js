/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#1b1b1b', // Black background
        primary: '#ffd700', // Golden accent color
        secondary: '#4b0082', // Purple accent color (adjusted from your previous palette)
        accent: '#8a2be2', // Secondary accent color (adjusted from your previous palette)
        text: '#ffffff', // White text
        'text-secondary': '#d3d3d3', // Light gray secondary text
        'card-background': '#292929', // Dark card background
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
