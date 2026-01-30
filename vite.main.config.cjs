const { defineConfig } = require('vite')
const electron = require('vite-plugin-electron').default
const { resolve } = require('path')

module.exports = defineConfig({
  plugins: [
    electron([
      {
        entry: resolve(__dirname, 'src/main/index.ts'),
        vite: {
          build: {
            outDir: resolve(__dirname, 'dist/main'),
          },
        },
      },
      {
        entry: resolve(__dirname, 'src/preload/index.ts'),
        vite: {
          build: {
            outDir: resolve(__dirname, 'dist/preload'),
          },
        },
      }
    ]),
  ],
})
