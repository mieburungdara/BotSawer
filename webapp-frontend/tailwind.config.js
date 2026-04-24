/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'tg-bg': 'var(--tg-theme-bg-color, #0e1621)',
        'tg-secondary': 'var(--tg-theme-secondary-bg-color, #17212b)',
        'tg-text': 'var(--tg-theme-text-color, #ffffff)',
        'tg-hint': 'var(--tg-theme-hint-color, #708499)',
        'tg-link': 'var(--tg-theme-link-color, #24a1de)',
        'tg-button': 'var(--tg-theme-button-color, #24a1de)',
        'tg-button-text': 'var(--tg-theme-button-text-color, #ffffff)',
        'brand': {
          '50': '#f0f9ff',
          '100': '#e0f2fe',
          '200': '#bae6fd',
          '300': '#7dd3fc',
          '400': '#38bdf8',
          '500': '#0ea5e9',
          '600': '#0284c7',
          '700': '#0369a1',
          '800': '#075985',
          '900': '#0c4a6e',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
