import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Treat .geojson files as JSON modules (Vite's built-in JSON plugin only covers .json)
const geojsonPlugin = {
  name: 'geojson',
  transform(src, id) {
    if (id.endsWith('.geojson')) {
      return { code: `export default ${src}`, map: null }
    }
  },
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    geojsonPlugin,
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})