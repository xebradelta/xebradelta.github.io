import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relative base: works at xebradelta.github.io/archetype/ without
  // hard-coding the mount path.
  base: './',
  plugins: [react()],
  build: {
    outDir: '../../archetype',
    emptyOutDir: true,
    sourcemap: false,
  },
})
