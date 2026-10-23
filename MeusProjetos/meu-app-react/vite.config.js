import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const projectDir = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(projectDir, '../..')

export default defineConfig({
  root: repositoryRoot,
  cacheDir: resolve(projectDir, 'node_modules/.vite'),
  build: {
    outDir: resolve(projectDir, 'dist'),
    rollupOptions: {
      input: resolve(repositoryRoot, 'frontend/index.html'),
    },
  },
})
