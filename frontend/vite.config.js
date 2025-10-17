import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  define: {
    __APP_TITLE__: '"V-Kitchen"',
    __BUILD_TIME__: `"${new Date().toISOString()}"`
  },
  build: {
    // Optimize build performance
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-${Date.now()}-[hash].js`,
        chunkFileNames: `assets/[name]-${Date.now()}-[hash].js`,
        assetFileNames: `assets/[name]-${Date.now()}-[hash].[ext]`,
        manualChunks: (id) => {
          // Core React libraries
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }
          // Router
          if (id.includes('react-router')) {
            return 'router';
          }
          // UI libraries
          if (id.includes('@heroicons') || id.includes('lucide-react')) {
            return 'ui-icons';
          }
          // Utility libraries
          if (id.includes('axios') || id.includes('date-fns')) {
            return 'utils';
          }
          // Stripe payment
          if (id.includes('@stripe') || id.includes('stripe')) {
            return 'payment';
          }
          // Socket.io
          if (id.includes('socket.io')) {
            return 'socket';
          }
          // Large admin components
          if (id.includes('admin/')) {
            return 'admin';
          }
          // Large user components
          if (id.includes('pages/') && (id.includes('Orders') || id.includes('Profile') || id.includes('Checkout'))) {
            return 'user-pages';
          }
          // Default chunk for everything else
          return 'main';
        }
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Optimize asset handling
    assetsInlineLimit: 4096
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios']
  }
})
