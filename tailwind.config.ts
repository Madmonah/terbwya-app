import type { Config } from 'tailwindcss'

// هوية ترباوية — باليت كاملة بدرجات البني الفاتح (الأزرق السماوي)، من فاتح جدًا لغامق
const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // باليت كاملة بـ 10 درجات من الأزرق الفاتح — من الأفتح للأغمق
        sky: {
          50: '#F0FAFD',   // أفتح خلفية — تقريبًا أبيض بلمسة زرقاء
          100: '#DCF2FA',  // خلفيات لطيفة، كروت فاتحة
          200: '#B8E6F5',  // حدود فاتحة، خلفيات ثانوية
          300: '#8FD7ED',  // تمييز فاتح، شارات
          400: '#5AC8E8',  // لمسات وشارات حماسية
          500: '#2E9CCA',  // اللون الأساسي — أزرار وعناوين CTA
          600: '#2382AC',  // hover / تفاعل
          700: '#1E6E96',  // أزرار داكنة، نص مؤكد
          800: '#184F6E',  // عناوين غامقة، تباين قوي
          900: '#122B36',  // نص أساسي غامق جدًا، خلفية الفوتر
        },
        brand: {
          red: '#2E9CCA',      // = sky-500 — أساسي CTA وعناوين (بديل الأحمر السابق)
          'red-dark': '#1E6E96', // = sky-700 — hover / أزرار داكنة
          orange: '#5AC8E8',   // = sky-400 — لمسات وشارات (بديل البرتقالي السابق)
          amber: '#8FD7ED',    // = sky-300 — تمييز وخلفيات لطيفة (بديل الكهرماني السابق)
          cream: '#F0FAFD',    // = sky-50 — خلفية عامة
          ink: '#122B36',      // = sky-900 — نص أساسي غامق
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
