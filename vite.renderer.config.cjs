const { defineConfig } = require('vite')
const react = require('@vitejs/plugin-react')
const { resolve } = require('path')

module.exports = defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  plugins: [react()],
  base: './',
  build: {
    outDir: resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
  }
})
