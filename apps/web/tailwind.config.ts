import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm surface tones
        cream: {
          DEFAULT: '#FBF6EC',
          50: '#FFFCF6',
          100: '#FBF6EC',
          200: '#F5EBD8',
        },
        // Deep, warm greens for primary
        emerald: {
          DEFAULT: '#254D32',
          50: '#F1F7F2',
          100: '#DEEBE0',
          200: '#B7D3BB',
          500: '#3E7A4C',
          600: '#2F6A3E',
          700: '#254D32',
          900: '#123020',
        },
        // Warm saffron accent
        saffron: {
          DEFAULT: '#EA9042',
          400: '#F4A96A',
          500: '#EA9042',
          600: '#D97F2F',
          700: '#B26421',
        },
        // Neutrals
        ink: {
          DEFAULT: '#1D1D1B',
          50: '#F7F5F1',
          100: '#EAE6DE',
          200: '#D2CCC0',
          300: '#B0A99B',
          400: '#847E71',
          500: '#5F5A50',
          700: '#3A3731',
          900: '#1D1D1B',
        },
        rose: {
          400: '#C97466',
        },
        // Named aliases for continuity with previous code
        deepGreen: '#254D32',
        charcoal: '#1D1D1B',
        mutedGray: '#847E71',
        softGray: '#EAE6DE',
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-serif', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        pill: '9999px',
        card: '20px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(29, 29, 27, 0.04), 0 8px 24px -12px rgba(29, 29, 27, 0.12)',
        cardHover: '0 2px 4px rgba(29, 29, 27, 0.06), 0 16px 40px -14px rgba(29, 29, 27, 0.20)',
        pop: '0 24px 48px -20px rgba(29, 29, 27, 0.28)',
      },
      backgroundImage: {
        grain:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/></svg>\")",
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 260ms ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
