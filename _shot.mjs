import { chromium } from 'playwright'
const OUT = '/tmp/claude-0/-home-user-F1-Manager/8f7d72e7-3915-5bfa-955a-d13342b77416/scratchpad'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
await page.getByText('Nueva partida').click()
await page.locator('.input').fill('Vortex Racing')
await page.getByText('Empezar en GT4').click()
await page.waitForTimeout(300)
await page.getByText('Patrocinadores', { exact: false }).first().click()
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}/09-sponsors-fix.png` })
console.log('shot')
await browser.close()
