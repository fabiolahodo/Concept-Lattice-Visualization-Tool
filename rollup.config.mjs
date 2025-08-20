// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/views/explorer.js',
  output: {
    file: 'dist/bundle.js',
    format: 'esm',
    sourcemap: true
  },
  plugins: [resolve({
      browser: true,
      preferBuiltins: false,  // important for browser/Electron renderer
    })],

  // Optional: silence D3 circular warnings
  onwarn(warning, warn) {
    if (warning.code === 'CIRCULAR_DEPENDENCY' && /d3-selection/.test(warning.message)) return;
    warn(warning);
  },
  
};
