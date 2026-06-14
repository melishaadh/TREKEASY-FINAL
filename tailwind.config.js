/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './screens/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0f5238',
          light: '#197a53',
          dark: '#0a3928',
        },
        dark: {
          bg: '#121212',
          surface: '#1E1E1E',
          elevated: '#2A2A2A',
          border: '#333333',
        },
      },
    },
  },
  plugins: [],
};
