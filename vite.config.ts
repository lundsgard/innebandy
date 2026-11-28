import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  optimizeDeps: {
    include: ['three', 'three/addons/geometries/RoundedBoxGeometry.js', 'three/addons/environments/RoomEnvironment.js'],
  },
});
