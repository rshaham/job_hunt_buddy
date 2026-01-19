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
        // Semantic colors using CSS variables (auto dark mode)
        foreground: {
          DEFAULT: 'rgb(var(--color-foreground) / <alpha-value>)',
          muted: 'rgb(var(--color-foreground-muted) / <alpha-value>)',
          subtle: 'rgb(var(--color-foreground-subtle) / <alpha-value>)',
        },
        background: 'rgb(var(--color-background) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          raised: 'rgb(var(--color-surface-raised) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--color-border) / <alpha-value>)',
          muted: 'rgb(var(--color-border-muted) / <alpha-value>)',
        },
        // Static colors
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
