// rollup.config.mjs
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const plugins = [
  resolve({ browser: true, preferBuiltins: false }),
  commonjs(),
];

export default [
  // 1) Keep your Electron/local build (what you already had)
  {
    input: 'src/views/explorer.js',
    output: {
      file: 'dist/bundle.js',     // used by your Electron app
      format: 'esm',
      sourcemap: true,
    },
    plugins,
    onwarn(warning, warn) {
      if (warning.code === 'CIRCULAR_DEPENDENCY' && /d3-selection/.test(warning.message)) return;
      warn(warning);
    },
  },

  // 2) Add a browser demo build for GitHub Pages (global: window.lattice)
  {
    input: 'src/lattice/lattice.js',
    output: {
      file: 'dist/lattice.umd.js',
      format: 'umd',
      name: 'lattice',            // exposes window.lattice.*
      sourcemap: true,
    },
    plugins,
    onwarn(warning, warn) {
      if (warning.code === 'CIRCULAR_DEPENDENCY' && /d3-selection/.test(warning.message)) return;
      warn(warning);
    },
  },
];
