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
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          hover: 'rgb(var(--color-primary-hover) / <alpha-value>)',
          subtle: 'rgb(var(--color-primary-subtle) / <alpha-value>)',
        },
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
        // Status colors (muted for calm aesthetic)
        status: {
          interested: '#8B7EC8',
          applied: '#5B93D4',
          screening: '#06b6d4',
          interviewing: '#D4A056',
          offer: '#5BAD7A',
          rejected: '#8C8C88',
          withdrawn: '#9ca3af',
        },
        // Legacy support
        success: '#5BAD7A',
        warning: '#D4A056',
        danger: '#ef4444',
      },
      fontFamily: {
        display: ['DM Sans', 'system-ui', 'sans-serif'],
        body: ['Source Sans 3', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display': ['1.75rem', { lineHeight: '1.2', fontWeight: '600' }],
        'heading-lg': ['1.25rem', { lineHeight: '1.3', fontWeight: '600' }],
        'heading': ['1rem', { lineHeight: '1.4', fontWeight: '500' }],
        'heading-sm': ['0.875rem', { lineHeight: '1.4', fontWeight: '500' }],
      },
      spacing: {
        '18': '4.5rem',
        'sidebar-collapsed': '64px',
        'sidebar-expanded': '200px',
      },
      transitionDuration: {
        'instant': '100ms',
        'fast': '150ms',
        'normal': '250ms',
        'slow': '400ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      animation: {
        'slide-in-right': 'slideInRight 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-out-right': 'slideOutRight 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        'fade-in': 'fadeIn 150ms ease-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOutRight: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      boxShadow: {
        'panel': '-4px 0 24px -4px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 4px 12px -2px rgba(0, 0, 0, 0.08)',
      },
      borderRadius: {
        'card': '12px',
      },
    },
  },
  plugins: [],
}
