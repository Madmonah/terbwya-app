import type { Config } from 'tailwindcss'

// هوية ترباوية — أحمر/برتقالي دافئ وحماسي، مبني على شراكة مع بلوجر الأكل "ترباوية"
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
          red: '#D62828',      // أحمر أساسي — CTA وعناوين
          'red-dark': '#A31E1E', // hover / أزرار داكنة
          orange: '#F77F00',   // برتقالي حماسي — لمسات وشارات
          amber: '#FCBF49',    // برتقالي فاتح/دافئ — تمييز وخلفيات لطيفة
          cream: '#FFF8F0',    // خلفية عامة دافئة
          ink: '#241A17',      // نص أساسي غامق دافئ (بني محروق مش أسود بحت)
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
