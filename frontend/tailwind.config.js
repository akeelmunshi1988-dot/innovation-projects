/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep luxury rug palette
        rug: {
          50:  '#fdf8f0',
          100: '#f9eedb',
          200: '#f2d9b0',
          300: '#e8be7d',
          400: '#dca048',
          500: '#c8862a',
          600: '#a86920',
          700: '#86501c',
          800: '#6e3f1c',
          900: '#5c341b',
          950: '#321a0a',
        },
        gold: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        cream: {
          50:  '#fefefe',
          100: '#fdfbf7',
          200: '#f9f4ec',
          300: '#f3e9d6',
          400: '#ead5b5',
          500: '#ddbf91',
          600: '#c9a26a',
          700: '#a87f4a',
          800: '#89633b',
          900: '#6f4f30',
        },
        dark: {
          50:  '#f6f6f5',
          100: '#eaeae8',
          200: '#d3d3d0',
          300: '#b4b4b0',
          400: '#929290',
          500: '#767675',
          600: '#5e5e5d',
          700: '#4c4c4b',
          800: '#3e3e3d',
          900: '#313130',
          950: '#1c1c1b',
        },
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'Cambria', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
