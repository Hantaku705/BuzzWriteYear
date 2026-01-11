import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('BuzzWriteYear App Verification', () => {
  test('Homepage loads correctly', async ({ page }) => {
    await page.goto(BASE_URL)
    await expect(page).toHaveTitle(/BuzzWriteYear/)
  })

  test('Analytics page loads with charts', async ({ page }) => {
    await page.goto(`${BASE_URL}/analytics`)

    // Check page title
    await expect(page.locator('h1')).toContainText('分析')

    // Check stats cards are present
    await expect(page.getByText('総GMV').first()).toBeVisible()
    await expect(page.getByText('総再生数').first()).toBeVisible()
    await expect(page.getByText('コンバージョン率').first()).toBeVisible()

    // Check charts section
    await expect(page.locator('text=GMV推移')).toBeVisible()
    await expect(page.locator('text=マルチ指標比較')).toBeVisible()

    // Check winning templates section
    await expect(page.locator('text=勝ちテンプレート分析')).toBeVisible()
  })

  test('Products page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/products`)

    // Check page loads
    await expect(page.locator('h1')).toContainText('商品')
  })

  test('Videos page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/videos`)

    // Check page loads
    await expect(page.locator('h1')).toContainText('動画')
  })

  test('Templates page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/templates`)

    // Check page loads
    await expect(page.locator('h1')).toContainText('テンプレート')
  })

  test('Settings page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`)

    // Check page loads
    await expect(page.locator('h1')).toContainText('設定')
  })

  test('Analytics chart interactions work', async ({ page }) => {
    await page.goto(`${BASE_URL}/analytics`)

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Click on different metric buttons
    const ordersButton = page.locator('button:has-text("注文")')
    if (await ordersButton.isVisible()) {
      await ordersButton.click()
      await page.waitForTimeout(500)
    }

    const clicksButton = page.locator('button:has-text("クリック")')
    if (await clicksButton.isVisible()) {
      await clicksButton.click()
      await page.waitForTimeout(500)
    }

    // Check tabs work
    const viewsTab = page.locator('button[role="tab"]:has-text("再生数順")')
    if (await viewsTab.isVisible()) {
      await viewsTab.click()
      await page.waitForTimeout(500)
    }
  })

  test('Dark mode is enabled by default', async ({ page }) => {
    await page.goto(`${BASE_URL}/analytics`)

    // Check dark class is present on html element
    const htmlElement = page.locator('html')
    await expect(htmlElement).toHaveClass(/dark/)
  })

  test('Take screenshot of analytics dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/analytics`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000) // Wait for charts to render

    await page.screenshot({
      path: 'tests/screenshots/analytics-dashboard.png',
      fullPage: true
    })
  })
})
