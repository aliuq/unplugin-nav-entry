import { basename, dirname, resolve } from 'node:path'
import { promises as fs } from 'node:fs'
import { fileURLToPath } from 'node:url'
import readline from 'node:readline'
import process from 'node:process'
import fg from 'fast-glob'
import { cyan, inverse } from 'kolorist'

const r = (file: string) => resolve(dirname(fileURLToPath(import.meta.url)), file)
const dist = r('../dist')

async function run() {
  // fix cjs exports
  const files = await fg('*.cjs', { ignore: ['chunk-*'], absolute: true, cwd: dist })
  for (const file of files) {
    console.log(cyan(inverse(' POST ')), `Fix ${basename(file)}`)
    let code = await fs.readFile(file, 'utf8')
    code += 'if (module.exports.default) module.exports = module.exports.default;'
    await fs.writeFile(file, code)
  }

  // 替换 import.meta.url
  const repalceImportMetaUrlfiles = await fg('*.cjs', { absolute: true, cwd: dist })
  for (const file of repalceImportMetaUrlfiles) {
    console.log(cyan(inverse(' POST import.meta.url ')), `Fix ${basename(file)}`)
    let code = await fs.readFile(file, 'utf8')
    code = code.replace(/import\.meta\.url/g, '')
    await fs.writeFile(file, code)
  }

  // 复制文件夹下的目录到指定目录
  await fs.copyFile(r('../public/index.html'), r('../dist/index.html'))
}

run()

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
rl.question('Input:', answer => rl.close())
