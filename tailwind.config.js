/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        themeBg: 'hsl(var(--color-background) / <alpha-value>)',
        themeCard: 'hsl(var(--color-card) / <alpha-value>)',
        themePrimary: 'hsl(var(--color-primary) / <alpha-value>)',
        themeSecondary: 'hsl(var(--color-secondary) / <alpha-value>)',
        themeAccent: 'hsl(var(--color-accent) / <alpha-value>)',
        themeText: 'hsl(var(--color-text-primary) / <alpha-value>)',
        themeTextMuted: 'hsl(var(--color-text-secondary) / <alpha-value>)',
        themeBorder: 'hsl(var(--color-border) / <alpha-value>)',
        primary: {
          light: '#19c3e6',
          DEFAULT: '#19c3e6',
          dark: '#0099b3',
        },
        gradient: {
          start: '#20afe7',
          mid: '#2c8aec',
          end: '#586ce9',
        },
        background: {
          light: '#f0f1f5',
          DEFAULT: '#ffffff',
          secondary: '#f8f9fa',
          dark: '#0f172a',
        },
        accent: {
          cyan: '#19c3e6',
          blue: '#2c8aec',
          purple: '#586ce9',
        },
      },
      linearGradient: {
        'btn-gradient': ['90deg', '#20afe7 0%', '#2c8aec 50%', '#586ce9 100%'],
      },
    },
  },
  plugins: [],
};
