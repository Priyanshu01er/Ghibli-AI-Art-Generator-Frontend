/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'], // ./public/index.html does not exist — Vite serves ./index.html from the project root
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#0f766e',
          600: '#0b5f59',
          700: '#084d49',
          800: '#06403d', // Was missing, so `text-brand-800` in CreatePage silently did nothing
          900: '#032a29',
        },
        accent: {
          100: '#fff7e6',
          300: '#ffe0a8',
          500: '#ffbe55',
        },
      },
      boxShadow: {
        card: '0 12px 30px rgba(15, 23, 42, 0.08)',
        glow: '0 18px 40px rgba(15, 118, 110, 0.25)',
      },
    },
  },
  plugins: [],
}

