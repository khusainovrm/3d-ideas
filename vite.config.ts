import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  build: {
    target: 'es2020',
    sourcemap: mode !== 'production',
  },
}))
