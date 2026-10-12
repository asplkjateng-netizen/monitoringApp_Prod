import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Terhubung langsung dengan CSS Variables di globals.css
        canvas: {
          DEFAULT: 'var(--bg-canvas)',
          subtle: 'var(--bg-input)',
          dark: '#0B0F17',
          'dark-card': '#131B26',
        },
        surface: {
          DEFAULT: 'var(--bg-card)',
          muted: 'var(--bg-input)',
          dark: '#131B26',
          'dark-muted': '#1A2332',
        },
        theme: {
          canvas: 'var(--bg-canvas)',
          card: 'var(--bg-card)',
          input: 'var(--bg-input)',
          border: 'var(--border-color)',
          text: 'var(--text-primary)',
          muted: 'var(--text-secondary)',
        },
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          subtle: '#FCEEF2',
          glow: '#F43F5E',
        },
      },
      borderColor: {
        theme: 'var(--border-color)',
        'dark-border': 'rgba(255, 255, 255, 0.08)',
        'dark-border-subtle': 'rgba(255, 255, 255, 0.12)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        card: '0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.03)',
        'dark-card': '0 4px 20px -2px rgba(0, 0, 0, 0.65)',
        'dark-elevated': '0 8px 30px rgba(0, 0, 0, 0.8)',
      },
    },
  },
  plugins: [],
};

export default config;
