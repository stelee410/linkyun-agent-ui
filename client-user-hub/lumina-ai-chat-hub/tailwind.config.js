/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{js,ts,jsx,tsx}',
    './contexts/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
    './services/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary-color)',
        'background-dark': 'var(--background-color)',
        'surface-dark': 'var(--surface-color)',
        'border-dark': 'rgba(128,128,128,0.2)',
        secondary: 'var(--secondary-color)',
        'theme-text': 'var(--text-color)',
      },
      borderRadius: {
        custom: 'var(--border-radius)',
      },
      fontFamily: {
        sans: ['var(--font-family)', 'Plus Jakarta Sans', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};
