import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
const buildId = process.env.NUXT_PUBLIC_BUILD_ID || 'dev'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    head: {
      title: 'Configurador para líneas conductoras LM',
      link: [
        { rel: 'icon', type: 'image/png', href: `/favicon.png?v=${buildId}` },
        { rel: 'icon', type: 'image/x-icon', href: `/favicon.ico?v=${buildId}` }
      ]
    }
  },
  css: ['~/assets/css/tailwind.css'],
  runtimeConfig: {
    public: {
      buildId
    }
  },
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
