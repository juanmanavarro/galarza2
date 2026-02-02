import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    head: {
      title: 'Configurador para líneas conductoras LM',
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  },
  css: ['~/assets/css/tailwind.css'],
  nitro: {
    devProxy: {
      '/mail.php': {
        target: 'http://localhost:8001',
        changeOrigin: true
      }
    }
  },
  postcss: {
    plugins: {
      autoprefixer: {}
    }
  },
  vite: {
    plugins: [tailwindcss()]
  }
})
