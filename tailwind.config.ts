import type { Config } from 'tailwindcss'

// هوية ترباوية — درجات البني الفاتح (السماوي)، هادية وواضحة
const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#2E9CCA',      // أزرق فاتح أساسي — CTA وعناوين (بديل الأحمر السابق)
          'red-dark': '#1E6E96', // أزرق أغمق — hover / أزرار داكنة
          orange: '#5AC8E8',   // أزرق سماوي فاتح — لمسات وشارات (بديل البرتقالي السابق)
          amber: '#9FE0F2',    // أزرق فاتح جدًا — تمييز وخلفيات لطيفة (بديل الكهرماني السابق)
          cream: '#F0FAFD',    // خلفية عامة بلون أزرق فاتح جدًا
          ink: '#122B36',      // نص أساسي غامق بتدرج أزرق داكن (بدل البني المحروق)
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
