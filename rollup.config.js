import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';
import { readFileSync } from 'fs';
import alias from '@rollup/plugin-alias';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const banner = `/**
 * ${pkg.name} v${pkg.version}
 * ${pkg.description}
 * @license MIT
 */`;

const external = [
  ...Object.keys(pkg.peerDependencies || {})
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
  commonjs({
    include: 'node_modules/**'
  }),
  typescript({
    tsconfig: './tsconfig.json',
    declaration: true,
    declarationDir: './dist/types',
    exclude: ['**/__tests__/**', '**/*.test.ts', 'src/**/*.spec.ts']
  })
];

export default [
  // ESM build
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

  // UMD build (with bundled dependencies)
  {
    input: 'src/index.ts',
    output: [
      {
        file: pkg.main || 'dist/index.js',
        format: 'umd',
        name: 'NexusSearch',
        banner,
        sourcemap: true,
        globals: {
          'idb': 'idb'
        }
      }
    ],
    plugins: [
      ...basePlugins,
      resolve({
        browser: true,
        preferBuiltins: false,
        extensions: ['.ts', '.js'],
        mainFields: ['browser', 'module', 'main']
      }),
      terser({
        output: {
          comments: function(node, comment) {
            return comment.type === 'comment2' && /@license/i.test(comment.value);
          }
        }
      })
    ]
  },

  // CommonJS build
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

  // Type definitions
  {
    input: 'dist/types/index.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
    plugins: [
      dts({
        compilerOptions: {
          baseUrl: 'src',
          paths: {
            "@/*": ["*"],
            "@core/*": ["core/*"],
            "@algorithms/*": ["algorithms/*"],
            "@storage/*": ["storage/*"],
            "@utils/*": ["utils/*"],
            "@types": ["types"]
          }
        }
      })
    ]
  }
];