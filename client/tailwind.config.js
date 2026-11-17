/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: { brand: "#D92D20", brandDark: "#B42318", ink: "#151C27", muted: "#575E70", line: "#E5E7EB", page: "#F7F8FA", soft: "#F0F3FF", ok: "#059669", warn: "#D97706", info: "#2563EB" },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"], mono: ["JetBrains Mono", "ui-monospace", "monospace"] }
    }
  },
  plugins: []
};
