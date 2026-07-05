/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // <--- ADD THIS LINE
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: '#6366f1',
        'primary-dark': '#4f46e5',
        secondary: '#ec4899',
        dark: '#0f172a',
        light: '#f8fafc',
      }
    },
  },
  plugins: [],
}
