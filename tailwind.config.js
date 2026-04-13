/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark Navy/Charcoal Professional Theme
        dark: {
          navy: {
            50: '#e6e8eb',
            100: '#b3b8c0',
            200: '#808896',
            300: '#4d576b',
            400: '#1a2641',
            500: '#0f1629', // Primary dark navy
            600: '#0c1121',
            700: '#090d19',
            800: '#060910',
            900: '#030508',
          },
          charcoal: {
            50: '#f5f5f5',
            100: '#e0e0e0',
            200: '#bdbdbd',
            300: '#9e9e9e',
            400: '#757575',
            500: '#424242', // Primary charcoal
            600: '#2d2d2d',
            700: '#1f1f1f',
            800: '#141414',
            900: '#0a0a0a',
          },
          accent: {
            blue: '#3b82f6',
            green: '#10b981',
            red: '#ef4444',
            yellow: '#f59e0b',
            purple: '#8b5cf6',
          },
        },
      },
      backgroundColor: {
        primary: 'var(--bg-primary)',
        secondary: 'var(--bg-secondary)',
        tertiary: 'var(--bg-tertiary)',
      },
      textColor: {
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        accent: 'var(--text-accent)',
      },
    },
  },
  plugins: [],
}

