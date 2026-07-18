/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/components/**/*.jsx', './src/react-entry.jsx'],
  theme: {
    extend: {
      colors: {
        primary: '#e50914',
        'bg-dark': '#06080f',
        'bg-sidebar': '#0a0d17',
        'text-main': '#f8fafc',
        'text-muted': '#94a3b8',
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        bebas: ['Bebas Neue', 'sans-serif'],
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        marquee: 'marquee 40s linear infinite',
      },
    },
  },
  plugins: [],
};
