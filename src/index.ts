import process from 'node:process'
import fs from 'node:fs'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { UnpluginFactory } from 'unplugin'
import { createUnplugin } from 'unplugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import { cyan, yellow } from 'kolorist'
import type { Options } from './types'
import { Context } from './core/context'
import { PLUGIN_NAME, UNPLUGIN_NAME } from './core/constants'

const _dirname = typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url))

export const unpluginFactory: UnpluginFactory<Options> = (options, meta) => {
  // 如果是生产环境，跳过
  if (process.env.NODE_ENV === 'production') {
    console.warn(yellow(`[${PLUGIN_NAME}] skippped in production mode`))
    return {
      name: UNPLUGIN_NAME,
    }
  }

  const ctx = new Context(options, meta)
  const template = path.resolve(_dirname, './index.html')
  const ENTRY_NAME = '__entry'
  const ENTRY_NAME_HTML = `${ENTRY_NAME}.html`

  let ejs: any
  let indexHtml = ''

  return {
    name: UNPLUGIN_NAME,
    enforce: 'pre',
    vite: {
      async configResolved(config) {
        ctx.setup(config.base, config.build?.rollupOptions?.input)

        !indexHtml && (indexHtml = fs.readFileSync(template, 'utf8'))
        // @ts-expect-error ejs is not a module
        !ejs && (ejs = await import('ejs'))
      },
      configureServer(server) {
        server.middlewares.use(ctx.publicPath + ENTRY_NAME, (req, res) => {
          res.setHeader('Content-Type', 'text/html')
          res.end(ejs.render(indexHtml, ctx.getTemplateParams()))
        })

        ctx.printUrls(server)
      },
    },

    webpack(compiler) {
      ctx.setup(compiler.options.output?.publicPath, compiler.options.entry)

      new HtmlWebpackPlugin({
        template,
        filename: ENTRY_NAME_HTML,
        inject: false,
        templateParameters: ctx.getTemplateParams(),
      }).apply(compiler)

      compiler.hooks.done.tap(PLUGIN_NAME, () => {
        // eslint-disable-next-line no-console
        console.log(`  导航: ${cyan(`${ctx.publicPath}__entry.html`)}`)
      })
    },
  }
}

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory)

export default unplugin
