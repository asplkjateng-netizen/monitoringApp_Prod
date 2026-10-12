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
        // Light & Dark Canvas Base
        canvas: {
          DEFAULT: '#F9F6F0',      // Light Cream Ivory
          subtle: '#F2EDE4',
          dark: '#121212',        // Level 0 Base (Sesuai Referensi Gambar)
          'dark-card': '#1E1E1E', // Level 1 Elevation (Panel & Card)
        },
        // Tingkatan Elevasi Mode Gelap (Material Elevation)
        elevation: {
          level0: '#121212', // Background Kanvas
          level1: '#1E1E1E', // Panel & Card
          level2: '#242424', // Surface & Input
          level3: '#2C2C2C', // Hover / Chip Aktif
          level4: '#333333', // Border Pop / Dialog
          level5: '#383838', // Floating Tooltip
        },
        // Tipografi Standar WCAG Dark Mode
        darktext: {
          high: 'rgba(255, 255, 255, 0.87)',  // Text 87% (Judul & Heading)
          med: 'rgba(255, 255, 255, 0.60)',   // Text 60% (Sub-label & Body)
          low: 'rgba(255, 255, 255, 0.38)',   // Text 38% (Placeholder & Muted)
        },
        // Brand Primary & Semantik Redup Ramah Mata
        primary: {
          DEFAULT: '#DF3B68',
          hover: '#C72F58',
          subtle: '#FCEEF2',
          glow: '#F43F5E',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#FAF8F5',
          dark: '#1E1E1E',
          'dark-muted': '#242424',
        },
      },
      borderColor: {
        'dark-border': 'rgba(255, 255, 255, 0.08)',
        'dark-border-subtle': 'rgba(255, 255, 255, 0.12)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(44, 38, 34, 0.05)',
        card: '0 1px 3px rgba(0,0,0,0.02), 0 4px 12px rgba(0,0,0,0.03)',
        'dark-card': '0 4px 20px -2px rgba(0, 0, 0, 0.65)',
        'dark-elevated': '0 8px 30px rgba(0, 0, 0, 0.8)',
      },
    },
  },
  plugins: [],
};

export default config;
