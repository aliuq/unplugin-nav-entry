import process from 'node:process'
import path from 'node:path'
import fs from 'node:fs'
import fg from 'fast-glob'
import Debug from 'debug'
import type { UnpluginContextMeta } from 'unplugin'
import type { ViteDevServer } from 'vite'
import { bold, green, yellow } from 'kolorist'
import type { Options, Page, Params, ResolvedOptions } from '../types'
import { resolveOptions } from './options'
import { UNPLUGIN_NAME } from './constants'
import { getRandomDarkColor, normalizePath, openBrowser, setFirstSlash } from './utils'

const debug = {
  warn: Debug(`${UNPLUGIN_NAME}:warn`),
}

export class Context {
  options: ResolvedOptions
  root = process.cwd()
  pkg = {} as any
  projectName = ''
  isRoot = false
  publicPath = ''
  dirName = ''
  entries = [] as string[]
  pages = new Map<string, Page>()
  activePages = [] as Page[]

  constructor(private rawOptions: Options, private meta: UnpluginContextMeta) {
    this.options = resolveOptions(rawOptions)
    const pkgContent = fs.readFileSync(
      path.resolve(this.root, 'package.json'),
      { encoding: 'utf-8' },
    )
    this.pkg = JSON.parse(pkgContent)
    this.projectName = normalizePath(path.basename(this.root))
    this.isRoot = this.options.cwd === process.cwd()
  }

  setup(publicPath?: string, entry?: any) {
    this.publicPath = publicPath || '/'
    this.setupEntries(this.meta.framework, entry)
    this.generatePages()
  }

  /** 获取 UrlScheme 格式的地址 */
  getSchemeUrl(dir: string) {
    const { urlScheme } = this.options
    let relativeP = ''
    let absoluteP = ''

    if (!urlScheme)
      return dir

    if (path.isAbsolute(dir)) {
      relativeP = path.relative(process.cwd(), dir)
      absoluteP = dir
    }
    else {
      relativeP = dir
      absoluteP = path.resolve(process.cwd(), dir)
    }

    let url = ''

    if (urlScheme === 'vscode') {
      url = `vscode://file/${absoluteP}`
    }
    else if (urlScheme === 'vscode-insiders') {
      url = `vscode-insiders://file/${absoluteP}`
    }
    else if (urlScheme === 'webstorm') {
      const prefix = 'jetbrains://webstorm/navigate/reference?project='
      if (dir === normalizePath(this.root))
        url = `${prefix}${this.projectName}`
      else url = `${prefix}${this.projectName}&path=${relativeP}`
    }
    else {
      url = urlScheme
        .replace(/\$\{absolute\}/g, absoluteP)
        .replace(/\$\{relative\}/g, relativeP)
        .replace(/\$\{projectName\}/g, this.projectName)
    }

    return url
  }

  /**
   * 获取标题
   *
   * 遍历规则和文件列表，如果匹配到规则，则返回匹配到的第一个规则的第一个匹配项
   * @param file 文件路径
   */
  getTitle(file: string) {
    const { titleRule } = this.options
    if (!titleRule)
      return ''

    const titleRules = Array.isArray(titleRule) ? titleRule : [titleRule]
    if (!titleRules.length)
      return ''

    // 有一种场景，页面的入口路径为：`foo/foo.vue`
    const basename = path.basename(path.dirname(file))
    // 允许提供 mainVue 选项，来提高匹配优先级
    const fileNames = [
      this.options.mainVue,
      'main.vue',
      'index.vue',
      `${basename}.vue`,
    ]

    const names = fileNames
      .filter(Boolean)
      .map((name) => {
        if (fs.existsSync(path.resolve(file, `../${name}`)))
          return path.resolve(file, `../${name}`)
        return false
      })
      .filter(Boolean) as string[]

    const files = [file, ...names]

    for (const rule of titleRules) {
      for (const f of files) {
        const code = fs.readFileSync(f, { encoding: 'utf-8' })
        const match = code.match(rule)
        if (match)
          return match[1]
      }
    }

    return ''
  }

  /** 生成 pages 列表 */
  generatePages() {
    const { source, fgOptions, cwd, resolvePath, resolveTitle } = this.options
    if (!source || !source?.length) {
      debug.warn(yellow(`[${UNPLUGIN_NAME}] source is empty`))
      return {
        pages: new Map<string, Page>(),
        activePages: [] as Page[],
      }
    }

    const pages = new Map<string, Page>()
    const modules = fg.globSync(source, { cwd, ...fgOptions })

    for (const file of modules) {
      // 相对于 process.cwd() 的路径
      // 如果 cwd 是 src/modules，那么这里的相对路径应该要是 src/modules/foo/bar.ts
      // 如果 cwd 是 process.cwd()，那么这里的相对路径应该要是 src/modules/foo/bar.ts
      const relativePath = normalizePath(
        path.relative(this.root, this.isRoot ? file : path.resolve(cwd, file)),
      )
      // relativePath 的 dirname
      // src/modules/foo/main.ts => src/modules/foo
      const dirname = path.dirname(relativePath)
      // src/modules/foo => /foo.html
      const htmlPath = setFirstSlash(
        `${path.relative(cwd, dirname)}.html`,
      )
      // /foo.html => /<BASE>/foo.html
      const htmlFullPath = normalizePath(path.join(this.publicPath, htmlPath))
      // 最终的访问路径，默认为 /<BASE>/foo.html
      const page = resolvePath(htmlFullPath, relativePath, file)
      // 获取模块的标题
      const titleInternal = this.getTitle(file)
      const title = resolveTitle(titleInternal, dirname)
      // 模块列表
      const fileList = this.getFileList(file)
      // 模块列表转对象
      const fileListObj = fileList.reduce((acc, cur) => {
        acc[cur] = this.getSchemeUrl(
          normalizePath(path.resolve(file, '../', cur)),
        )
        return acc
      }, {} as Page['fileList'])
      //
      // Webpack: /xxxxx/foo.html => foo.html => foo
      // Vite: /xxxxx/src/template/foo.html => src/template/foo.html => src/template/foo
      //
      // 判断模块是否在本次构建中被使用
      const isUsed = this.entries.some(entry =>
        entry.endsWith(
          normalizePath(path.relative(this.publicPath, page)).replace(
            /\.html$/,
            '',
          ),
        ),
      )

      pages.set(file, {
        entry: page,
        directory: normalizePath(path.resolve(file, '../')),
        title,
        fileList: fileListObj,
        active: isUsed,
      })
    }

    // 将被使用的模块放在前面
    const newPages = new Map(
      [...pages.entries()].sort((a, b) => {
        if (a[1].active && !b[1].active)
          return -1
        if (!a[1].active && b[1].active)
          return 1
        return 0
      }),
    )

    const activePages = [...newPages.values()].filter(page => page.active)

    this.pages = newPages
    this.activePages = activePages
  }

  /**
   * 设置本次正在被编译的模块列表，列表内的路径应当是相对于项目根目录的路径
   *
   * 结构应该是类似这样的：
   * ```json
   * [
   *   '/src/modules/foo',
   *   '/src/modules/bar',
   *   '/src/modules/baz',
   * ]
   * ```
   * @param framework 框架
   * @param entry 入口
   *
   * + `vite`: `entry === config.build?.rollupOptions?.input`
   * + `webpack`: `entry === compiler.options.entry`
   */
  setupEntries(framework: UnpluginContextMeta['framework'], entry: any) {
    try {
      const { cwd, resolveEntries } = this.options
      // 提供一个函数，用于替换默认的 entries 处理逻辑
      if (resolveEntries) {
        this.entries = resolveEntries()
        return this.entries
      }

      let entries = []
      // entry === config.build?.rollupOptions?.input
      if (framework === 'vite') {
        entries = Object.values(entry)
      }
      // entry === compiler.options.entry
      else if (framework === 'webpack') {
        entries
          = typeof entry === 'string'
            ? [entry]
            : Array.isArray(entry)
              ? entry
              : Object.keys(entry)
      }

      if (!entries.length) {
        this.entries = []
      }
      else {
        this.entries = entries.map((en) => {
          const p = path
            .relative(this.root, this.isRoot ? en : path.resolve(cwd, en))
            .replace(/\.html$/, '')
          return normalizePath(setFirstSlash(p))
        })
      }

      return this.entries
    }
    catch (error) {
      console.error(error)
      this.entries = []
    }
  }

  /**
   * 返回模板需要的参数对象
   */
  getTemplateParams(): Params {
    return {
      name: `${this.projectName}(total ${this.pages.size} / active ${this.activePages.length}) 导航`,
      pages: this.pages,
      projectPath: this.getSchemeUrl(normalizePath(this.root)),
      getRandomDarkColor,
    }
  }

  /**
   * 获取模块中的文件列表
   * @param file 模块入口文件
   */
  getFileList(file: string) {
    return fg.globSync(['*', 'components/*', 'component/*'], {
      onlyFiles: true,
      absolute: false,
      deep: 2,
      ignore: ['**/node_modules/**'],
      cwd: path.resolve(file, '..'),
    })
  }

  /**
   * 打印 url 访问地址
   * @see https://github.com/antfu/vite-plugin-inspect/blob/main/src/node/index.ts
   */
  printUrls(server: ViteDevServer) {
    const _print = server.printUrls
    const publicPath = this.publicPath
    const colorUrl = (url: string) => green(url.replace(/:(\d+)\//, (_, port) => `:${bold(port)}/`))

    server.printUrls = () => {
      const { https, port } = server.config.server

      let host = `${https ? 'https' : 'http'}://localhost:${port || '80'}`
      let netHost = ''

      const url = server.resolvedUrls?.local[0]
      if (url) {
        try {
          const u = new URL(url)
          host = `${u.protocol}//${u.host}`
        }
        catch (error) {
          console.warn('Parse resolved url failed:', error)
        }
      }

      const networkUrls = server.resolvedUrls?.network || []
      const networkUrl = networkUrls.find(i => i.includes('192.168')) || ''
      if (networkUrl) {
        try {
          const u = new URL(networkUrl)
          netHost = `${u.protocol}//${u.host}`
        }
        catch (error) {
          console.warn('Parse resolved url failed:', error)
        }
      }

      _print()

      // eslint-disable-next-line no-console
      console.log(`  ${green('➜')}  ${bold('Entry')}:   ${colorUrl(`${host}${publicPath}__entry/`)}`)
      // eslint-disable-next-line no-console
      console.log(`  ${green('➜')}  ${bold('Entry')}:   ${colorUrl(`${netHost}${publicPath}__entry/`)}`)

      if (this.options.open) {
        setTimeout(() => {
          openBrowser(`${host}${publicPath}__entry/`)
        }, 500)
      }
    }
  }
}
