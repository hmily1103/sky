import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'file:///D:/workbuddy/sky/the-night-you-arrived/dist-single/index.html'

const errors = []
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800 })
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('requestfailed', (r) => {
  const u = r.url()
  if (u.startsWith('http')) errors.push('netfail: ' + u) // file:// 内部不应有外网请求
})

await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 })
await new Promise((r) => setTimeout(r, 1500))

const hasTitle = await page.$eval('body', (b) => b.innerText.includes('你来的那一夜'))
const hasCanvas = (await page.$('canvas')) !== null
await page.screenshot({ path: 'scripts/shots/single-input.png' })

console.log('title text present:', hasTitle)
console.log('canvas present:', hasCanvas)
console.log('ISSUES (' + errors.length + '):')
errors.forEach((e) => console.log('  - ' + e))

await browser.close()
