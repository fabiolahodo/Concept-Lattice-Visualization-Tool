// rollup.config.mjs
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';

/*
const isProd = process.env.NODE_ENV === 'production';

const plugins = [
  resolve({ browser: true, preferBuiltins: false }),
  commonjs(),
];
*/
export default [
  // ----  Renderer (ESM → dist/renderer) ----
  {
    input: 'src/views/explorer.js',
    output: {
      dir: 'dist/renderer',
      format: 'esm',
      sourcemap: true,
      entryFileNames: 'bundle.js',
      chunkFileNames: 'chunks/[name]-[hash].js',
      assetFileNames: 'assets/[name]-[hash][extname]'
    },
    plugins: [
      resolve({ browser: true, preferBuiltins: false }),
      commonjs(),
      copy({
        targets: [
          { src: 'src/views/explorer.html', dest: 'dist/renderer', rename: 'index.html' },
          { src: 'src/views/explorer.css',   dest: 'dist/renderer' },
          { src: 'src/views/assets/**/*',   dest: 'dist/renderer/assets' }
        ],
        hook: 'writeBundle'
      })
    ],
  onwarn(warning, warn) {
      if (warning.code === 'CIRCULAR_DEPENDENCY' && /d3-selection/.test(warning.message)) return;
      warn(warning);
    }
  },


  // ---- UMD build for browser demos (optional) ----
  {
    input: 'src/lattice/lattice.js',
    output: { 
      file: 'dist/lattice.umd.js', 
      format: 'umd', name: 'lattice', 
      sourcemap: true 
    },
    plugins: [
      resolve({ browser: true }), 
      commonjs()
    ],
    
    onwarn(warning, warn) {
      if (warning.code === 'CIRCULAR_DEPENDENCY' && /d3-selection/.test(warning.message)) return;
      warn(warning);
    }
  }
];
