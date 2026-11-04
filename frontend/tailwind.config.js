/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#07090e',
        surface: {
          50: '#141824',
          100: '#111520',
          200: '#0d101a',
          300: '#090c14',
          border: 'rgba(255, 255, 255, 0.08)',
          card: 'rgba(17, 21, 32, 0.7)',
        },
        brand: {
          purple: '#8b5cf6',
          violet: '#7c3aed',
          blue: '#3b82f6',
          cyan: '#06b6d4',
          glow: 'rgba(139, 92, 246, 0.25)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        glow: '0 0 25px -5px rgba(139, 92, 246, 0.3)',
        'blue-glow': '0 0 25px -5px rgba(59, 130, 246, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

