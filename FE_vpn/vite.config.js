import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Output to 'dist' for Docker, or backend static folder for local dev
    outDir: process.env.DOCKER_BUILD ? 'dist' : path.resolve(__dirname, '../BE_vpn/app/static'),
    emptyOutDir: true,
  },
})
