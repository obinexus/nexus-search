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
 * @license ISC
 */`;

// Only mark actual external dependencies
const external = [
  'idb',
  'punycode',
  'tslib'
];

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
    clean: true,
    useTsconfigDeclarationDir: true,
    tsconfigOverride: {
      compilerOptions: {
        declaration: true,
        declarationDir: './dist/types',
        sourceMap: true
      },
      exclude: ['**/__tests__/**', '**/*.test.ts', 'src/**/*.spec.ts']
    }
  })
];

const baseOutput = {
  banner,
  sourcemap: true,
  exports: 'named'
};

export default [
  // UMD build
  {
    input: 'src/index.ts',
    output: {
      ...baseOutput,
      file: 'dist/nexus-search.umd.js',
      format: 'umd',
      name: 'NexusSearch',
      globals: {
        idb: 'idb',
        punycode: 'punycode',
        tslib: 'tslib'
      }
    },
    external,
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
      ...baseOutput,
      file: 'dist/index.mjs',
      format: 'esm'
    },
    external,
    plugins: basePlugins
  },

  // CommonJS build
  {
    input: 'src/index.ts',
    output: {
      ...baseOutput,
      file: 'dist/index.cjs',
      format: 'cjs'
    },
    external,
    plugins: basePlugins
  },

  // Types build
  {
    input: 'dist/types/index.d.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'es'
    },
    external: [
      ...external,
      /\.css$/,
      /@types\/.*/,
      /@core\/.*/,
      /@algorithms\/.*/,
      /@storage\/.*/,
      /@utils\/.*/,
      /@\/.*/
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