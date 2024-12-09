// rollup.config.js
import typescript from 'rollup-plugin-typescript2';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';
import alias from '@rollup/plugin-alias';
import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const banner = `/**
 * ${pkg.name} v${pkg.version}
 * ${pkg.description}
 * @license MIT
 */`;

const external = [
  ...Object.keys(pkg.peerDependencies || {}),
  ...Object.keys(pkg.dependencies || {})
];

// Alias entries configuration
const aliasEntries = [
  { find: '@', replacement: path.resolve(__dirname, 'src') },
  { find: '@core', replacement: path.resolve(__dirname, 'src/core') },
  { find: '@algorithms', replacement: path.resolve(__dirname, 'src/algorithms') },
  { find: '@storage', replacement: path.resolve(__dirname, 'src/storage') },
  { find: '@utils', replacement: path.resolve(__dirname, 'src/utils') },
  { find: '@types', replacement: path.resolve(__dirname, 'src/types') }
];

const basePlugins = [
  alias({
    entries: aliasEntries
  }),
  resolve({
    browser: true,
    preferBuiltins: false,
    extensions: ['.ts', '.js']
  }),
  commonjs(),
  typescript({
    tsconfig: './tsconfig.json',
    verbosity: 0,
    declaration: true,
    declarationDir: './dist/types',
    exclude: ['**/__tests__/**', '**/*.test.ts', 'src/**/*.spec.ts'],
    sourceMap: true
  })
];

export default [
  // UMD build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'NexusSearch',
      banner,
      sourcemap: true,
      exports: 'named',
      globals: { idb: 'idb' }
    },
    plugins: [
      ...basePlugins,
      terser({
        output: {
          comments: (node, comment) =>
            comment.type === 'comment2' && /@license/i.test(comment.value)
        }
      })
    ]
  },

  // ESM build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'esm',
      banner,
      sourcemap: true,
      exports: 'named'
    },
    external,
    plugins: basePlugins
  },

  // CJS build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.cjs',
      format: 'cjs',
      banner,
      sourcemap: true,
      exports: 'named'
    },
    external,
    plugins: basePlugins
  },

  // Types build
  {
    input: 'dist/types/index.d.ts',  // Changed from src/index.ts to use generated declarations
    output: {
      file: 'dist/index.d.ts',
      format: 'es'
    },
    external: [
      ...external,
      /\.css$/,
      /@types\/.*/,  // Exclude @types imports
      /@core\/.*/,   // Exclude @core imports
      /@algorithms\/.*/,  // Exclude @algorithms imports
      /@storage\/.*/,    // Exclude @storage imports
      /@utils\/.*/,      // Exclude @utils imports
      /@\/.*/           // Exclude all other @ imports
    ],
    plugins: [
      alias({
        entries: aliasEntries.map(entry => ({
          ...entry,
          replacement: entry.replacement.replace('/src/', '/dist/types/')
        }))
      }),
      dts()
    ]
  }
];