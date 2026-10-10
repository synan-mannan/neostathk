/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        primary: 'rgb(var(--primary) / <alpha-value>)',
        highlight: 'rgb(var(--highlight) / <alpha-value>)',
        text: 'rgb(var(--text) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
      },
      borderRadius: {
        xl: '0.875rem',
      },
      boxShadow: {
        glow: '0 0 24px rgb(var(--highlight) / 0.25)',
        'glow-sm': '0 0 12px rgb(var(--highlight) / 0.15)',
        'card-glow': '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 16px -4px rgb(var(--highlight) / 0.08)',
      },
      backgroundImage: {
        'radial-emerald': 'radial-gradient(circle at 50% 0%, rgb(var(--primary) / 0.18), transparent 70%)',
        'radial-glow': 'radial-gradient(ellipse at top, rgb(var(--highlight) / 0.12), transparent 50%)',
      },
    },
  },
  plugins: [],
};
