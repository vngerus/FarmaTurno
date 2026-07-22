// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.farmaturno.cl',
  // Astro 5+ removed "hybrid": "static" now prerenders by default while still
  // allowing individual routes to opt out via `export const prerender = false`,
  // which is what later tasks' on-demand API routes rely on.
  output: 'static',
  adapter: vercel(),
  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['leaflet', 'react-leaflet'],
    },
  },
});