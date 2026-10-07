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
        canvas: {
          DEFAULT: '#F9F6F0',
          subtle: '#F2EDE4',
          dark: '#090D16',
          'dark-card': '#0F172A',
        },
        primary: {
          DEFAULT: '#DF3B68',
          hover: '#C72F58',
          subtle: '#FCEEF2',
          glow: '#F43F5E',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#FAF8F5',
          dark: '#0F172A',
          'dark-muted': '#1E293B',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(44, 38, 34, 0.05)',
        card: '0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.03)',
        'dark-card': '0 4px 24px -2px rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
};

export default config;
