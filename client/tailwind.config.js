/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'org-primary': 'var(--org-primary, #4f46e5)',
      },
    },
  },
  plugins: [],
};
