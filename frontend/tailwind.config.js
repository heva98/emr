/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#00857C',
        'primary-dark': '#006b63',
        'sidebar-bg': '#1e2a3a',
        'sidebar-text': '#cbd5e1',
        'page-bg': '#f4f4f4',
      },
    },
  },
  plugins: [],
}
