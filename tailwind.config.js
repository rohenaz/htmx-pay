/** @type {import('tailwindcss').Config} */
export default {
  content: ["./www/**/*.html", "./www/**/*.js", "./www/**/*.ts"],
  theme: {
    extend: {},
  },
  daisyui: {
    themes: [
      {
        cyberdark: {
          'primary' : '#ffee00',
          'primary-focus' : '#ff5784',
          'primary-content' : '#000000',

          'secondary' : '#75d1f0',
          'secondary-focus' : '#5bbedc',
          'secondary-content' : '#000000',

          'accent' : '#c07eec',
          'accent-focus' : '#ad55e7',
          'accent-content' : '#000000',

          'neutral' : '#3d3a00',
          'neutral-focus' : '#090901',
          'neutral-content' : '#ffee00',

          "base-100": "#000000",
          "base-200": "#111111", 
          "base-300": "#1a1a1a", 
          "base-content": "#ffee00", 

          info: "#1c92f2", 
          success: "#009485", 
          warning: "#c07eec", 
          error: "#1c92f2", 

          "--rounded-box": "0",
          "--rounded-btn": "0",
          "--rounded-badge": "0",

          "--animation-btn": ".25s",
          "--animation-input": ".2s",

          "--btn-text-case": "uppercase",
          "--navbar-padding": ".5rem",
          "--border-btn": "1px",
        },
      },

      "coffee",
      "cyberpunk",
      "dark",
      "forest",
      "halloween",
      "wireframe",
      "bumblebee",
    ],
  },
  plugins: [require("@tailwindcss/typography"), require("daisyui")],
};
