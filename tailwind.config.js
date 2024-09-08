/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {
      colors:{
        'primary-blue-500': '#0073E6',
        'primary-blue-400':'#3c57f0',
        'peach': "#FFDAB9",
        'hero-bg': '#F2CCAB',
        'primary-orange-600': '#E67E22',
        'primary-orange-500': '#FF8C42',
        'primary-orange-400': '#F9BD86',
        'dark-blue-500': '#002D62',
        'dark-blue-600': '#00396F',
        'primary-gray-100': "#F5F5F5",
        'primary-gray-200': '#FAFAFA',
        'primary-gray-300': '#A9A9A9',
      },
      fontFamily:{
        'roboto': "Roboto",
        'outfit': 'Outfit',
        'poppins': 'Poppins',
        'open-sans': 'Open Sans',
      }
    },
  },
  plugins: [],
}
