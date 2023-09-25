import type { Options, ResolvedOptions } from '../types'

export const defaultOptions: Options = {
  source: '**/*/main.(js|ts)',
  cwd: 'src/modules',
  urlScheme: 'vscode',
  titleRule: [],
  open: false,
  resolvePath: (sourcePath, _visitPath, _absoluteVisitPath) => {
    return sourcePath
  },
  resolveTitle: (sourceTitle, pageRelativeDir) => {
    return sourceTitle ? `${sourceTitle} - ${pageRelativeDir}` : pageRelativeDir
  },
  fgOptions: {
    absolute: true,
    ignore: ['**/node_modules/**'],
  },
}

export function resolveOptions(options: Options): ResolvedOptions {
  return {
    ...defaultOptions,
    ...options,
  } as ResolvedOptions
}
