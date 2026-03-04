import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    // Node.js polyfills (path, Buffer, etc.) — kuromoji がブラウザで動くために必要
    nodePolyfills({
      include: ['path', 'buffer'],
      globals: { Buffer: true, global: true },
    }),
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/kuromoji/dict/*',
          dest: 'kuromoji',
        },
      ],
    }),
  ],
})
