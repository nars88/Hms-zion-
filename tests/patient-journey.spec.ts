import { test, expect, type APIRequestContext, type Page } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

const ADMIN = {
  email: process.env.ZION_ADMIN_EMAIL || 'admin@zionmed.com',
  password: process.env.ZION_ADMIN_PASSWORD || 'admin123',
}

// ── Helper: login via UI and return cookies ──────────────
async function loginAndGetCookies(page: Page) {
  await page.goto(`${BASE}/login`)
  await page.waitForLoadState('networkidle')

  const emailInput = page.locator('input[type="email"], input[name="email"]').first()
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first()
  const submitBtn = page.locator('button[type="submit"]').first()

  await emailInput.fill(ADMIN.email)
  await passwordInput.fill(ADMIN.password)
  await submitBtn.click()
  await page.waitForTimeout(2000)

  return await page.context().cookies()
}

// ── Helper: login via API directly ───────────────────────
async function getAuthCookieHeader(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${BASE}/api/auth/login`, {
    data: { email: ADMIN.email, password: ADMIN.password },
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok()) {
    console.warn('API login failed — using empty auth')
    return ''
  }

  const headers = res.headers()
  return headers['set-cookie'] || ''
}

// ── PAGE TESTS ────────────────────────────────────────────

test('1 - Reception: page loads', async ({ page }) => {
  await loginAndGetCookies(page)
  await page.goto(`${BASE}/reception`)
  await expect(page.getByRole('button', { name: /Print Patient QR/i })).toBeVisible({ timeout: 10000 })
  console.log('✅ Reception page loaded')
})

test('2 - Intake: page loads', async ({ page }) => {
  await loginAndGetCookies(page)
  await page.goto(`${BASE}/intake`)
  await expect(page.getByText('Waiting Patients', { exact: true })).toBeVisible({ timeout: 10000 })
  console.log('✅ Intake page loaded')
})

test('3 - Doctor: queue loads', async ({ page }) => {
  await loginAndGetCookies(page)
  await page.goto(`${BASE}/doctor/queue`)
  await expect(page.locator('text=Patient queue')).toBeVisible({ timeout: 10000 })
  console.log('✅ Doctor queue loaded')
})

test('4 - Lab: page loads', async ({ page }) => {
  await loginAndGetCookies(page)
  await page.goto(`${BASE}/lab`)
  await expect(page.locator('text=Laboratory')).toBeVisible({ timeout: 10000 })
  console.log('✅ Lab page loaded')
})

test('5 - Radiology: page loads', async ({ page }) => {
  await loginAndGetCookies(page)
  await page.goto(`${BASE}/radiology`)
  await expect(page.locator('button:has-text("X-Ray")')).toBeVisible({ timeout: 10000 })
  console.log('✅ Radiology page loaded')
})

test('6 - Pharmacy: page loads', async ({ page }) => {
  await loginAndGetCookies(page)
  await page.goto(`${BASE}/pharmacy/dispense`)
  await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 })
  console.log('✅ Pharmacy page loaded')
})

test('7 - Accountant: page loads', async ({ page }) => {
  await loginAndGetCookies(page)
  await page.goto(`${BASE}/accountant`)
  await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 })
  console.log('✅ Accountant page loaded')
})

test('8 - Gatekeeper: page loads', async ({ page }) => {
  await loginAndGetCookies(page)
  await page.goto(`${BASE}/gatekeeper`)
  await expect(
    page.getByPlaceholder('Scan QR Code or Enter Visit ID')
  ).toBeVisible({ timeout: 10000 })
  console.log('✅ Gatekeeper page loaded')
})

test('9 - ER Nurse: page loads', async ({ page }) => {
  await loginAndGetCookies(page)
  await page.goto(`${BASE}/emergency/nurse`)
  await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 })
  console.log('✅ ER Nurse page loaded')
})

test('10 - ER Doctor: page loads', async ({ page }) => {
  await loginAndGetCookies(page)
  await page.goto(`${BASE}/emergency/doctor`)
  await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 })
  console.log('✅ ER Doctor page loaded')
})

test('11 - Admin: departments load fast', async ({ page }) => {
  await loginAndGetCookies(page)
  const start = Date.now()
  await page.goto(`${BASE}/admin/departments`)
  await expect(page.getByRole('heading', { name: 'Departments' }).first()).toBeVisible({ timeout: 5000 })
  const elapsed = Date.now() - start
  expect(elapsed).toBeLessThan(3000)
  console.log(`✅ Departments loaded in ${elapsed}ms`)
})

test('12 - APIs: all critical endpoints respond with auth', async ({ page, request }) => {
  // Login first via UI to get cookies
  await loginAndGetCookies(page)

  // Get cookies from page context
  const cookies = await page.context().cookies()
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')

  const endpoints = [
    '/api/departments',
    '/api/employees',
    '/api/doctor/queue',
    '/api/emergency/patients',
    '/api/lab/er-beds?department=Lab',
    '/api/lab/er-beds?department=Radiology',
    '/api/notifications/counts',
  ]

  for (const endpoint of endpoints) {
    const res = await request.get(`${BASE}${endpoint}`, {
      headers: {
        Cookie: cookieHeader,
      },
    })
    expect(res.status()).not.toBe(500)
    expect(res.status()).not.toBe(404)
    console.log(`✅ ${endpoint} → ${res.status()}`)
  }
})
