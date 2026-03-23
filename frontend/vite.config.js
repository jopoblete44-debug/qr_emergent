import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      include: /\.[jt]sx?$/,
    }),
  ],
  oxc: {
    include: /\.[jt]sx?$/,
    exclude: [/node_modules/],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  envPrefix: ['VITE_', 'REACT_APP_'],
});
