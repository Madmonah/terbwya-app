import type { Config } from 'tailwindcss'

// هوية ترباوية — موف وأبيض، بساطة وأناقة
const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // درجات الموف — اللون الأساسي الوحيد
        violet: {
          50: '#F6F0FC',
          100: '#EBDFF9',
          200: '#D6BFF2',
          300: '#BC98E8',
          400: '#A374DC',
          500: '#8B4FD1',
          600: '#7238B5',
          700: '#5C2C93',
          800: '#452170',
          900: '#2C1548',
        },
        brand: {
          red: '#7238B5',        // = violet-600 — أساسي CTA وعناوين (موف)
          'red-dark': '#5C2C93', // = violet-700 — hover / أزرار داكنة
          orange: '#8B4FD1',     // = violet-500 — لمسات وشارات
          amber: '#D6BFF2',      // = violet-200 — تمييز فاتح وحدود لطيفة
          cream: '#FFFFFF',      // أبيض — خلفية عامة (الماين أبيض)
          ink: '#2C1548',        // = violet-900 — نص أساسي غامق بتدرج موف
        },
      },
      fontFamily: {
        sans: ['var(--font-cairo)', 'system-ui', '-apple-system', 'Segoe UI', 'Tahoma', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
}

export default config
