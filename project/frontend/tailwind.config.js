// project/frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        amber: {
          300: '#fcd34d',
          400: '#f59e0b',
          500: '#d97706',
          600: '#b45309',
        },
        surface: { DEFAULT: '#1a1710', 2: '#111008' },
        border:  { DEFAULT: '#2a2418' },
        muted:   { DEFAULT: '#7a6a4a' },
        warm:    { DEFAULT: '#e8d5a3' },
      },
      animation: {
        'float':          'float 6s ease-in-out infinite',
        'pulse-amber':    'pulse-amber 3s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 3s ease infinite',
        'shimmer':        'shimmer 2.5s ease-in-out infinite',
        'scanline':       'scanline 4s linear infinite',
        'ticker':         'scroll-ticker 24s linear infinite',
        'fade-up':        'fadeUp 0.7s ease both',
        'draw-line':      'draw-line 2s ease 0.5s forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-8px)' },
        },
        'pulse-amber': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(245,158,11,0)' },
          '50%':       { boxShadow: '0 0 24px 4px rgba(245,158,11,0.25)' },
        },
        'gradient-shift': {
          '0%':   { backgroundPosition: '0% 50%' },
          '50%':  { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        shimmer: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
        scanline: {
          '0%':   { top: '-2px' },
          '100%': { top: '100%' },
        },
        'scroll-ticker': {
          from: { transform: 'translateX(0)' },
          to:   { transform: 'translateX(-50%)' },
        },
        'draw-line': {
          from: { strokeDashoffset: '800' },
          to:   { strokeDashoffset: '0' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(28px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundSize: { '200': '200% 200%' },
    },
  },
  plugins: [],
}
