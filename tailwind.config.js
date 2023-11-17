module.exports = {
  daisyui: {
    themes: [
      {
        mytheme: {
          primary: "#075985",
          secondary: "#57534e",
          accent: "#fb923c",
          neutral: "#1f2937",
          "base-100": "#111827",
          info: "#164e63",
          success: "#047857",
          warning: "#713f12",
          error: "#fca5a5",
        },
      },
      "coffee",
      "dark",
      "emerald",
      "forest",
      "halloween",
      "lofi",
      "wireframe",
    ],
  },
  plugins: [require("@tailwindcss/typography"), require("daisyui")],
};
