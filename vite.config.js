import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: true,       // bind to 0.0.0.0 — accessible from LAN devices
    https: true,      // HTTPS required for Geolocation API on LAN
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        secure: false,
        ws: true,
      }
    }
  }
});


