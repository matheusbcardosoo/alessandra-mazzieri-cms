import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.API_PORT || 4000}`,
      },
      // robots.txt/sitemap.xml/llms.txt são servidos pela API na raiz do
      // domínio (não sob /api) — sem isso o dev server tentaria renderizar
      // essas rotas via SSR em vez de encaminhar para o Express real.
      '/robots.txt': {
        target: `http://localhost:${process.env.API_PORT || 4000}`,
      },
      '/sitemap.xml': {
        target: `http://localhost:${process.env.API_PORT || 4000}`,
      },
      '/llms.txt': {
        target: `http://localhost:${process.env.API_PORT || 4000}`,
      },
    },
  },
  build: {
    // Otimizações para produção
    minify: 'esbuild', // Mais rápido que terser
    target: 'es2020',
    sourcemap: false,
  },
  ssr: {
    // O bundle de produção (dist/server/entry-server.js) roda a partir de
    // server.js (raiz do projeto), que tem sua própria árvore de
    // node_modules — sem react/react-dom/etc. Empacotar tudo aqui deixa o
    // arquivo autossuficiente, sem depender de resolução entre pastas do
    // repo. Em dev, o `vite.ssrLoadModule` (client/dev-server.js) espera
    // que dependências de node_modules continuem externas/via require
    // nativo — com noExternal ligado em dev, módulos CJS como
    // react/jsx-dev-runtime quebram ("module is not defined").
    noExternal: command === 'build' ? true : undefined,
  },
}))
