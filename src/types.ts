import type { Options as FgOptions } from 'fast-glob'

type Scheme = 'vscode' | 'vscode-insiders' | 'webstorm'

export interface Options {
  /**
   * 匹配规则
   *
   * @default `**\/main.ts`
   */
  source?: string | string[]
  /**
   * 工作目录
   *
   * @default `src/modules`
   */
  cwd?: string
  /**
   * 入口名称，用于提高匹配优先级
   *
   * @example `main.vue`
   */
  mainVue?: string
  /**
   * 标题匹配正则
   *
   * 正则匹配的文件来自 source 和 mainVue
   */
  titleRule?: RegExp | RegExp[]
  /**
   * 编辑器打开文件的 url scheme
   *
   * + `vscode`: `vscode://file/`
   * + `vscode-insiders`: `vscode-insiders://file/`
   * + `webstorm`: `jetbrains://webstorm/navigate/reference?project=<project name>&path=`
   *
   * @default '''
   * @example `vscode://file/`
   * @values `vscode` | `vscode-insiders` | `webstorm` | string
   */
  urlScheme?: Scheme | string
  /**
   * 是否自动打开页面导航入口，仅支持 vite
   *
   * @default `false`
   */
  open?: boolean
  /**
   * fast-glob 配置
   */
  fgOptions?: FgOptions
  /**
   * 解析模块的最终标题信息
   * @param sourceTitle - 已处理的标题，可能为空
   * @param pageRelativeDir - 模块相对路径
   */
  resolveTitle?: (sourceTitle: string, pageRelativeDir: string) => string
  /**
   * 解析模块的最终访问地址
   * @param sourcePath 处理后的访问地址
   * @param visitPath 文件相对路径
   * @param absoluteVisitPath 文件绝对路径
   * @returns 返回处理后的文件路径
   * @example `src/modules/foo/bar/main.js` => `foo/bar`
   */
  resolvePath?: (sourcePath: string, visitPath: string, absoluteVisitPath: string) => string
  /**
   * 当前正在被编译的模块列表，列表内的路径应当是相对于项目根目录的路径
   *
   * 返回结构应该如下：
   *
   * ```json
   * [
   *   '/src/modules/foo',
   *   '/src/modules/bar',
   *   '/src/modules/baz',
   * ]
   * ```
   */
  resolveEntries?: () => string[]
}

export type ResolvedOptions = Required<Options>

export interface Params {
  /** 项目名称以及项目情况 */
  name: string
  /** 页面信息 */
  pages: Map<string, Page>
  /** 项目 url scheme 路径 */
  projectPath: string
  /** 生成随机颜色 */
  getRandomDarkColor: () => string
}

export interface Page {
  /**
   * 模块访问地址
   *
   * @example `/<BASE>/foo/bar`
   */
  entry: string
  /**
   * 模块所在路径，绝对路径
   *
   * @example `D://xxx/xxx/src/modules/foo/bar`
   */
  directory: string
  /**
   * 模块标题
   *
   * @example `标题内容 | src/modules/foo/bar`
   * @example `src/modules/foo/bar`
   */
  title: string
  /**
   * 模块中文件列表，包含一级、二级目录下的文件
   * + `key`: 文件名
   * + `value`: 文件 UrlScheme 路径
   *
   * @example `{'main.vue': 'vscode://file/D://xxx/xxx/src/modules/foo/bar/main.vue'}`
   */
  fileList: Record<string, string>
  /**
   * 模块是否在本次构建中被使用
   */
  active: boolean
}
