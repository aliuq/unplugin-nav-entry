import { defineConfig } from 'tsup'

export default defineConfig((option) => {
  const isProd = option.env?.NODE_ENV === 'production'
  const nodeEnv = option.env?.NODE_ENV || 'development'

  return {
    entryPoints: [
      'src/*.ts',
    ],
    clean: true,
    format: ['cjs', 'esm'],
    dts: isProd,
    splitting: true,
    shims: false,
    onSuccess: `set NODE_ENV=${nodeEnv} && npm run build:fix`,
    target: 'es2020',
  }
})
