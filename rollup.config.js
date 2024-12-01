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

const aliasEntries = {
  entries: [
    { find: '@', replacement: path.resolve(__dirname, 'src') },
    { find: '@core', replacement: path.resolve(__dirname, 'src/core') },
    { find: '@algorithms', replacement: path.resolve(__dirname, 'src/algorithms') },
    { find: '@storage', replacement: path.resolve(__dirname, 'src/storage') },
    { find: '@utils', replacement: path.resolve(__dirname, 'src/utils') },
    { find: '@types', replacement: path.resolve(__dirname, 'src/types') }
  ]
};

const basePlugins = [
  alias(aliasEntries),
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
    exclude: ['**/__tests__/**', '**/*.test.ts', 'src/**/*.spec.ts']
  })
];

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: pkg.module || 'dist/index.esm.js',
        format: 'esm',
        banner,
        sourcemap: true
      }
    ],
    external,
    plugins: basePlugins
  },
  {
    input: 'src/index.ts',
    output: [
      {
        file: pkg.main || 'dist/index.js',
        format: 'umd',
        name: 'NexusSearch',
        banner,
        sourcemap: true,
        globals: { idb: 'idb' }
      }
    ],
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
  {
    input: 'src/index.ts',
    output: [
      {
        file: pkg.commonjs || 'dist/index.cjs.js',
        format: 'cjs',
        banner,
        sourcemap: true
      }
    ],
    external,
    plugins: basePlugins
  },
  {
    input: 'dist/types/index.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
    plugins: [dts()]
  }
];
