
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const projectDir = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(projectDir, '../..')
const frontendDir = resolve(repositoryRoot, 'frontend')

export default defineConfig({
  root: frontendDir,
  cacheDir: resolve(projectDir, 'node_modules/.vite'),
  build: {
    outDir: resolve(projectDir, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(frontendDir, 'index.html'),
    },
  },
})
