/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',300:'#93c5fd',400:'#60a5fa',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8',800:'#1e40af',900:'#1e3a8a',950:'#172554' },
        coal: { 50:'#f8fafc',100:'#f1f5f9',200:'#e2e8f0',300:'#cbd5e1',400:'#94a3b8',500:'#64748b',600:'#475569',700:'#334155',800:'#1e293b',900:'#0f172a',950:'#020617' },
        danger: { 50:'#fef2f2',500:'#ef4444',600:'#dc2626',700:'#b91c1c' },
        warning: { 50:'#fffbeb',500:'#f59e0b',600:'#d97706',700:'#b45309' },
        success: { 50:'#f0fdf4',500:'#22c55e',600:'#16a34a',700:'#15803d' },
        gov: { 700:'#1a3a5c', 800:'#12294a', 900:'#0d1f36' },
      },
      fontFamily: { sans: ['Inter','system-ui','sans-serif'] },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        hover: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [],
};
