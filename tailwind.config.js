/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9ebff',
          500: '#2f6fed',
          600: '#2558c4',
          700: '#1c449a',
        },
      },
    },
  },
  plugins: [],
}
