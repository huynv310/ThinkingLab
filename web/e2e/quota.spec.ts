import { expect, test, type Page } from '@playwright/test'
import { CONV_ID, mockSupabase, now } from './mock'

async function setup(page: Page, { used, daily }: { used: number; daily: number }) {
  await mockSupabase(page, { used, daily })
  await page.route('**/api/chat', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        messages: [
          { id: 2, conversation_id: CONV_ID, sender_type: 'USER', content: 'Nên đi làm', fallacy_code: null, meme_url: null, created_at: now },
          { id: 3, conversation_id: CONV_ID, sender_type: 'BOT', content: 'Bằng chứng nào?', fallacy_code: null, meme_url: null, created_at: now },
        ],
        usage: { used: used + 800, limit: 30_000, daily_used: daily + 800, daily_limit: 150_000 },
      }),
    }),
  )
  await page.goto(`/dashboard/tro-chuyen/${CONV_ID}`)
}

test('2 donut hiển thị % còn lại, bấm mở chi tiết dạng thanh ngang', async ({ page }) => {
  await setup(page, { used: 7_500, daily: 120_000 })
  const button = page.getByTestId('quota-button')
  await expect(button).toHaveAttribute('aria-label', /cuộc này còn 75%, hôm nay còn 20%/)
  await expect(page.getByTestId('quota-panel')).toHaveCount(0) // chưa bấm thì chưa hiện chi tiết

  await button.click()
  const panel = page.getByTestId('quota-panel')
  await expect(panel).toBeVisible()
  await expect(button).toHaveAttribute('aria-expanded', 'true')
  const bars = panel.getByRole('progressbar')
  await expect(bars).toHaveCount(2)
  await expect(bars.nth(0)).toHaveAttribute('aria-valuenow', '75')
  await expect(bars.nth(1)).toHaveAttribute('aria-valuenow', '20')
  await expect(panel).toContainText('Còn ~30 lượt')
  await expect(panel).toContainText('7.500 / 30.000 token')
  await expect(panel).toContainText('120.000 / 150.000 token')

  // Panel nằm trọn trong màn hình (kể cả mobile)
  const box = await panel.boundingBox()
  const viewport = page.viewportSize()!
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width)
  await page.waitForTimeout(300) // chờ hiệu ứng mở xong rồi mới chụp
  await page.screenshot({ path: `e2e/.results/quota-open-${test.info().project.name}.png` })

  await page.keyboard.press('Escape')
  await expect(panel).toHaveCount(0)
  await expect(button).toBeFocused() // Esc trả focus về nút
})

test('bấm ra ngoài thì đóng; gửi tin xong số liệu cập nhật', async ({ page }) => {
  await setup(page, { used: 0, daily: 0 })
  const button = page.getByTestId('quota-button')
  await expect(button).toHaveAttribute('aria-label', /cuộc này còn 100%, hôm nay còn 100%/)

  await page.getByLabel('Tin nhắn').fill('Nên đi làm')
  await page.getByRole('button', { name: 'Gửi' }).click()
  await expect(button).toHaveAttribute('aria-label', /cuộc này còn 97%, hôm nay còn 99%/)

  await button.click()
  await expect(page.getByTestId('quota-panel')).toBeVisible()
  await page.mouse.click(5, 5)
  await expect(page.getByTestId('quota-panel')).toHaveCount(0)
})

test('hết hạn mức ngày: donut báo hết và khóa ô nhập', async ({ page }) => {
  await setup(page, { used: 3_000, daily: 150_000 })
  await expect(page.getByTestId('quota-button')).toHaveAttribute('aria-label', /hôm nay còn 0%/)
  await expect(page.getByText('Hôm nay bạn đã luyện hết lượt rồi')).toBeVisible()
  await expect(page.getByLabel('Tin nhắn')).toHaveCount(0)
})

test('tin nhắn cho phép tối đa 2000 ký tự', async ({ page }) => {
  await setup(page, { used: 0, daily: 0 })
  await expect(page.getByLabel('Tin nhắn')).toHaveAttribute('maxlength', '2000')
})
