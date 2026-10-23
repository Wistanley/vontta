export default {
  content: ['./index.html', './*.tsx', './components/**/*.tsx'],
  theme: {
    extend: {
      colors: {
        navy: { 900: '#101114', 800: '#191a1f', 700: '#23252c' },
        primary: { DEFAULT: '#a3e6bf', glow: '#b5efcd' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
