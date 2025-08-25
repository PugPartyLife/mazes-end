// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // site: "https://mazesend.com",
  integrations: [react()],
  server: {
    host: true, // Allow external connections
    port: 4321
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: [
        'ctc-dev.io',
        'localhost',
        '127.0.0.1'
      ]
    }
  }
});
