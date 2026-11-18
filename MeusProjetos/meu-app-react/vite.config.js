
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

const projectDir = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(projectDir, '../..')
const frontendDir = resolve(repositoryRoot, 'frontend')

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repositoryRoot, '')
  const apiPort = Number(env.API_PORT) || 3000

  return {
    root: frontendDir,
    envDir: repositoryRoot,
    cacheDir: resolve(projectDir, 'node_modules/.vite'),
    server: {
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: resolve(projectDir, 'dist'),
      emptyOutDir: true,
      rollupOptions: {
        input: resolve(frontendDir, 'index.html'),
      },
    },
  }
})
