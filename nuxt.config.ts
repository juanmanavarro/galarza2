import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    head: {
      title: 'Configurador para líneas conductoras LM',
      link: [
        { rel: 'icon', type: 'image/png', href: '/logo.png' }
      ]
    }
  },
  css: ['~/assets/css/tailwind.css'],
  postcss: {
    plugins: {
      autoprefixer: {}
    }
  },
  vite: {
    plugins: [tailwindcss()]
  }
})
