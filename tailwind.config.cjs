/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app.vue',
    './app/**/*.{vue,js,ts}',
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.{vue,js,ts}',
    './pages/**/*.{vue,js,ts}',
    './plugins/**/*.{js,ts}',
    './nuxt.config.{js,ts}'
  ],
  theme: {
    extend: {}
  },
  plugins: []
}
