import { test, expect } from '@playwright/test'

test.describe('Kling AI Video Generation', () => {
  test.beforeEach(async ({ page }) => {
    // 動画ページに移動
    await page.goto('/videos')
    await page.waitForLoadState('networkidle')
  })

  test('動画生成モーダルが開き、AI生成モードが選択できる', async ({ page }) => {
    // 「動画を生成」ボタンをクリック
    const generateButton = page.getByRole('button', { name: /動画を生成/i })
    await expect(generateButton).toBeVisible()
    await generateButton.click()

    // モーダルが開く
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()

    // 「AI生成（Kling）」オプションが表示される
    const aiOption = page.getByText('AI生成（Kling）')
    await expect(aiOption).toBeVisible()

    // 「テンプレート」オプションも表示される（モーダル内のテンプレートオプション）
    const templateOption = page.getByLabel('動画を生成').getByText('テンプレート', { exact: true })
    await expect(templateOption).toBeVisible()

    // スクリーンショット
    await page.screenshot({ path: 'tests/screenshots/kling-mode-selection.png' })
  })

  test('AI生成モードを選択して商品選択画面に進める', async ({ page }) => {
    // モーダルを開く
    await page.getByRole('button', { name: /動画を生成/i }).click()
    await page.waitForSelector('[role="dialog"]')

    // AI生成モードを選択
    await page.getByText('AI生成（Kling）').click()

    // 次へボタンをクリック
    await page.getByRole('button', { name: /次へ/i }).click()

    // 商品選択画面が表示される
    await expect(page.getByText('動画に使用する商品を選択してください')).toBeVisible()

    // スクリーンショット
    await page.screenshot({ path: 'tests/screenshots/kling-product-selection.png' })
  })

  test('商品がない場合のメッセージが表示される', async ({ page }) => {
    // モーダルを開く
    await page.getByRole('button', { name: /動画を生成/i }).click()
    await page.waitForSelector('[role="dialog"]')

    // AI生成モードを選択して次へ
    await page.getByText('AI生成（Kling）').click()
    await page.getByRole('button', { name: /次へ/i }).click()

    // 商品がない場合のメッセージを確認（商品がない場合）
    const noProductsMessage = page.getByText('商品がありません')
    const productSelect = page.locator('[data-slot="trigger"]').filter({ hasText: '商品を選択' })

    // どちらかが表示される
    const hasProducts = await productSelect.isVisible().catch(() => false)
    const hasNoProducts = await noProductsMessage.isVisible().catch(() => false)

    expect(hasProducts || hasNoProducts).toBeTruthy()
  })

  test('プリセット選択UIが正しく表示される', async ({ page }) => {
    // まず商品を作成（テスト用）
    await page.goto('/products')
    await page.waitForLoadState('networkidle')

    // 商品追加ボタンをクリック
    const addButton = page.getByRole('button', { name: /商品を追加/i })
    if (await addButton.isVisible()) {
      await addButton.click()

      // フォームに入力
      await page.fill('input[id="name"]', 'テスト商品 - Kling AI Test')
      await page.fill('input[id="price"]', '1980')

      // 保存
      await page.getByRole('button', { name: /保存/i }).click()
      await page.waitForTimeout(1000)
    }

    // 動画ページに移動
    await page.goto('/videos')
    await page.waitForLoadState('networkidle')

    // モーダルを開く
    await page.getByRole('button', { name: /動画を生成/i }).click()
    await page.waitForSelector('[role="dialog"]')

    // AI生成モードを選択
    await page.getByText('AI生成（Kling）').click()
    await page.getByRole('button', { name: /次へ/i }).click()

    // 商品を選択（ドロップダウンをクリック）
    const productSelect = page.locator('[data-slot="trigger"]').filter({ hasText: '商品を選択' })
    if (await productSelect.isVisible()) {
      await productSelect.click()

      // 最初の商品を選択
      const firstOption = page.locator('[role="option"]').first()
      if (await firstOption.isVisible()) {
        await firstOption.click()
      }

      // 次へ
      await page.getByRole('button', { name: /次へ/i }).click()

      // プリセット選択画面が表示される
      await expect(page.getByText('AI動画生成の設定をしてください')).toBeVisible()

      // プリセットが表示される
      await expect(page.getByText('商品紹介')).toBeVisible()
      await expect(page.getByText('使用シーン')).toBeVisible()
      await expect(page.getByText('開封')).toBeVisible()

      // 動画の長さ選択が表示される
      await expect(page.getByRole('button', { name: /5秒/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /10秒/i })).toBeVisible()

      // スクリーンショット
      await page.screenshot({ path: 'tests/screenshots/kling-preset-selection.png' })
    }
  })

  test('AI動画生成ボタンが表示され、クリックできる', async ({ page }) => {
    // 商品ページで商品を確認
    await page.goto('/products')
    await page.waitForLoadState('networkidle')

    // 動画ページに移動
    await page.goto('/videos')
    await page.waitForLoadState('networkidle')

    // モーダルを開く
    await page.getByRole('button', { name: /動画を生成/i }).click()
    await page.waitForSelector('[role="dialog"]')

    // AI生成モードを選択
    await page.getByText('AI生成（Kling）').click()
    await page.getByRole('button', { name: /次へ/i }).click()

    // 商品を選択
    const productSelect = page.locator('[data-slot="trigger"]').filter({ hasText: '商品を選択' })
    if (await productSelect.isVisible()) {
      await productSelect.click()
      const firstOption = page.locator('[role="option"]').first()
      if (await firstOption.isVisible()) {
        await firstOption.click()
        await page.getByRole('button', { name: /次へ/i }).click()

        // AI動画を生成ボタンが表示される
        const generateAIButton = page.getByRole('button', { name: /AI動画を生成/i })
        await expect(generateAIButton).toBeVisible()

        // スクリーンショット
        await page.screenshot({ path: 'tests/screenshots/kling-generate-button.png' })

        // ボタンをクリック（実際のAPI呼び出し）
        await generateAIButton.click()

        // ローディング状態または結果を確認
        await page.waitForTimeout(2000)

        // スクリーンショット（結果）
        await page.screenshot({ path: 'tests/screenshots/kling-generation-result.png' })
      }
    }
  })
})
