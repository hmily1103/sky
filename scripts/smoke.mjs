import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = './scripts/shots/'
fs.mkdirSync(OUT, { recursive: true })

const errors = []
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--window-size=1280,800',
  ],
})

const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 })

page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push('[console.error] ' + msg.text())
})
page.on('pageerror', (e) => errors.push('[pageerror] ' + (e?.message || String(e))))
page.on('response', (r) => {
  if (r.status() >= 400) errors.push(`[http ${r.status()}] ${r.url()}`)
})

const shot = async (name) => {
  await page.screenshot({ path: OUT + name })
  console.log('shot:', name)
}

const fill = (sel, val) => {
  page.evaluate(
    (s, v) => {
      const el = document.querySelector(s)
      const proto = Object.getPrototypeOf(el)
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set
      setter.call(el, v)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    },
    sel,
    val,
  )
}

try {
  // Vite dev 的 HMR WebSocket 会一直保持连接，networkidle0 永远不触发；
  // 改用 domcontentloaded + 等待具体选择器。
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForSelector('.input-overlay', { timeout: 10000 })
  await sleep(700)
  await shot('01-input.png')

  // ---- 校验：不存在的城市应给出明确错误，而非白屏/静默 ----
  await fill('input[type=date]', '1990-06-15')
  await fill('input[type=text]', '火星基地')
  await page.click('.primary-btn')
  await sleep(400)
  const errText = await page.evaluate(() => document.querySelector('.form-error')?.textContent || '')
  if (!/未找到/.test(errText)) errors.push('[test] 不存在城市未提示错误: ' + errText)

  // ---- 正常流程：北京（选月相可见的日期，验证“月亮”行） ----
  await fill('input[type=date]', '2024-03-18')
  await fill('input[type=text]', '北京')
  await page.click('.primary-btn')
  console.log('clicked 重返那一夜')
  await page.waitForSelector('.confirm-card', { timeout: 8000 })
  await sleep(300)
  const confirmName = await page.evaluate(
    () => document.querySelector('.confirm-name')?.textContent || '',
  )
  if (!/北京/.test(confirmName)) errors.push('[test] 地点确认未显示: ' + confirmName)
  await shot('01b-confirm.png')
  await page.click('.confirm-btn')
  console.log('clicked 确认重返')

  // Scene 2 倒流
  await sleep(3500)
  await shot('02-rewind.png')

  // 等待 Scene 4 信息出现
  await page.waitForSelector('.info-overlay', { timeout: 40000 })
  await sleep(2500)
  await shot('04-info.png')

  // 等待 Scene 5 控制台
  await page.waitForSelector('.controls', { timeout: 20000 })
  await sleep(1000)
  await shot('05-gaze.png')

  // 真实星座连线（IAU）：默认开启，断言投影后线段数 > 0
  await sleep(300)
  const segs = await page.evaluate(
    () => window.__SKY_DEBUG__?.constellationSegments ?? -1,
  )
  if (!(segs > 0)) errors.push('[test] 真实星座连线未渲染或数量为0: ' + segs)
  console.log('constellation segments:', segs)
  await shot('06-constellations.png')

  // 切换“星座”按钮：关闭后线段应不可见（visible=false）
  await page.click('.controls [data-ctrl="constellations"]')
  await sleep(400)
  // 关闭后再截一张，肉眼可比对
  await shot('06b-constellations-off.png')
  // 重新打开，恢复默认态
  await page.click('.controls [data-ctrl="constellations"]')
  await sleep(300)

  // 数据说明面板
  await page.click('.data-btn')
  await page.waitForSelector('.data-panel', { timeout: 6000 })
  await sleep(500)
  const panelText = await page.evaluate(
    () => document.querySelector('.data-panel')?.textContent || '',
  )
  if (!/真实数据说明/.test(panelText)) errors.push('[test] 数据面板未出现')
  if (!/北京/.test(panelText)) errors.push('[test] 数据面板缺少地点')
  // 第二轮补齐项：月相展示 + 首星锚点事实
  if (!/那夜最亮的星/.test(panelText)) errors.push('[test] 数据面板缺少“那夜最亮的星”')
  if (!/月亮/.test(panelText)) errors.push('[test] 数据面板缺少月相（月亮）')
  await shot('05b-datapanel.png')

  // Scene 6 收尾
  await page.waitForSelector('.end-btn', { timeout: 12000 })
  await page.click('.end-btn')
  await page.waitForSelector('.ending-overlay', { timeout: 8000 })
  await sleep(5500)
  await shot('07-ending.png')

  const modify = await page.$('.ending-buttons .ghost-btn')
  console.log('ending buttons present:', !!modify)
} catch (e) {
  errors.push('[script] ' + (e?.message || String(e)))
} finally {
  console.log('\n=== ISSUES (' + errors.length + ') ===')
  errors.forEach((e) => console.log(e))
  await browser.close()
  process.exit(errors.length ? 1 : 0)
}
