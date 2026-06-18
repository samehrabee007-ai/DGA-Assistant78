/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1f4e79',
        secondary: '#0ea5e9',
        background: '#f1f5f9',
        surface: '#ffffff',
      }
    },
  },
  plugins: [],
}
