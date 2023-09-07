import type { Options } from 'tsup'

export default <Options>{
  entryPoints: [
    'src/*.ts',
  ],
  clean: true,
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true,
  shims: false,
  onSuccess: 'npm run build:fix',
  external: [
    'html-webpack-plugin',
    'fast-glob',
    'open',
  ],
}
