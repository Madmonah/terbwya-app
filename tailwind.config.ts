import type { Config } from 'tailwindcss'

// هوية ترباوية — ميكس صيفي: موف (أساسي) + أزرق سماوي (ثانوي) + برتقالي (لمسات حماسية)
const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // درجات الموف — اللون الأساسي الجديد
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
        // درجات الأزرق السماوي — ثانوي، للمسات هادئة
        sky: {
          50: '#F0FAFD',
          100: '#DCF2FA',
          200: '#B8E6F5',
          300: '#8FD7ED',
          400: '#5AC8E8',
          500: '#2E9CCA',
          600: '#2382AC',
          700: '#1E6E96',
          800: '#184F6E',
          900: '#122B36',
        },
        // درجات البرتقالي — لمسة حماسية صيفية للشارات والتمييز
        sunset: {
          50: '#FFF3E8',
          100: '#FFE2C6',
          200: '#FFC98F',
          300: '#FFAD57',
          400: '#FF9130',
          500: '#F97316',
          600: '#DB5C0A',
          700: '#B4470A',
          800: '#8A3610',
          900: '#5C2410',
        },
        brand: {
          red: '#8B4FD1',        // = violet-500 — أساسي CTA وعناوين (موف)
          'red-dark': '#5C2C93', // = violet-700 — hover / أزرار داكنة
          orange: '#F97316',     // = sunset-500 — لمسات وشارات حماسية (برتقالي)
          amber: '#5AC8E8',      // = sky-400 — تمييز ثانوي (أزرق سماوي)
          cream: '#F6F0FC',      // = violet-50 — خلفية عامة بلمسة موف فاتحة
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
