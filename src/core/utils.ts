import path from 'node:path'

/**
 * 使用默认浏览器打开网址
 */
export async function openBrowser(address: string) {
  const r = await import('open').catch(() => null)
  r && await r.default(address, { newInstance: true })
}

/**
 * 补全路径的第一个斜杠
 */
export function setFirstSlash(str: string) {
  return str.startsWith(path.sep) ? str : `${path.sep}${str}`
}

/**
 * 生成随机的颜色
 *
 * 通过控制色相、饱和度、亮度，生成有一定限制的随机的颜色
 */
export function getRandomDarkColor() {
  const minLightness = 40 // 最小亮度
  const maxLightness = 60 // 最大亮度
  // 随机生成亮度值在指定范围内的颜色
  const randomLightness
    = Math.floor(Math.random() * (maxLightness - minLightness + 1))
    + minLightness

  // 随机生成 HSL 格式的颜色
  // 色相值在 0 - 30，100 - 360 之间
  const randomHue1 = Math.floor(Math.random() * (30 - 0 + 1)) + 0
  const randomHue2 = Math.floor(Math.random() * (360 - 200 + 1)) + 200
  const randomHue = Math.random() > 0.5 ? randomHue1 : randomHue2

  const randomSaturation = Math.floor(Math.random() * (100 - 70 + 1)) + 70 // 饱和度值在 70% 到 100% 之间

  const hslColor = `hsl(${randomHue}, ${randomSaturation}%, ${randomLightness}%)`

  return hslColor
}
