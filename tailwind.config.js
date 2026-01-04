/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // TTU Official Colors
        scarlet: {
          DEFAULT: '#CC0000',
          50: '#FFE5E5',
          100: '#FFCCCC',
          200: '#FF9999',
          300: '#FF6666',
          400: '#FF3333',
          500: '#CC0000',
          600: '#A30000',
          700: '#7A0000',
          800: '#520000',
          900: '#290000',
        },
        // iOS System Colors
        ios: {
          blue: '#007AFF',
          green: '#34C759',
          yellow: '#FFCC00',
          orange: '#FF9500',
          red: '#FF3B30',
          purple: '#AF52DE',
          pink: '#FF2D55',
          gray: '#8E8E93',
          gray2: '#AEAEB2',
          gray3: '#C7C7CC',
          gray4: '#D1D1D6',
          gray5: '#E5E5EA',
          gray6: '#F2F2F7',
        },
        // Parking Status Colors
        parking: {
          open: '#34C759',      // Green
          busy: '#FFCC00',      // Yellow
          filling: '#FF9500',   // Orange
          full: '#FF3B30',      // Red
          closed: '#8E8E93',    // Gray
        },
      },
      fontFamily: {
        // iOS System Font
        sans: ['System'],
        'sf-pro': ['SF Pro Display'],
        'sf-pro-rounded': ['SF Pro Rounded'],
      },
      borderRadius: {
        'ios': '10px',
        'ios-lg': '14px',
        'ios-xl': '20px',
      },
      boxShadow: {
        'ios': '0 2px 8px rgba(0, 0, 0, 0.12)',
        'ios-lg': '0 4px 16px rgba(0, 0, 0, 0.16)',
      },
    },
  },
  plugins: [],
};
