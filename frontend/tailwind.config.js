/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        isro: {
          blue: '#0d1b2a',
          navy: '#1b263b',
          slate: '#415a77',
          orange: '#e07a5f',
          cyan: '#06b6d4',
          accent: '#0ea5e9',
          dark: '#070b14',
          emerald: '#10b981',
          crimson: '#ef4444'
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace']
      },
      boxShadow: {
        'bezel-outer': '0 0 0 1px rgba(255, 255, 255, 0.08), 0 20px 40px -15px rgba(0, 0, 0, 0.5)',
        'bezel-inner': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.1)',
        'glow-cyan': '0 0 20px -3px rgba(6, 182, 212, 0.35)',
        'glow-emerald': '0 0 20px -3px rgba(16, 185, 129, 0.35)'
      }
    },
  },
  plugins: [],
}
