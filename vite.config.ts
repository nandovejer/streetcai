import { defineConfig } from 'vite';
// __BUILD__ identifica cada compilación: el service worker lo recibe en su URL y estrena caché en cada despliegue.
export default defineConfig({
  base: './',
  server: { host: true, port: 5173 },
  build: { target: 'es2020' },
  define: { __BUILD__: JSON.stringify(Date.now().toString(36)) },
});
