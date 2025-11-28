/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
          light: '#818cf8',
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        status: {
          interested: '#8b5cf6',
          applied: '#3b82f6',
          screening: '#06b6d4',
          interviewing: '#f59e0b',
          offer: '#10b981',
          rejected: '#6b7280',
          withdrawn: '#9ca3af',
        }
      },
      spacing: {
        '18': '4.5rem',
      }
    },
  },
  plugins: [],
}
