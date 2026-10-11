import { expect, test, type Page } from '@playwright/test'
import { CONV_ID, mockSupabase } from './mock'

// Tắt hiệu ứng để chụp trạng thái cuối, nội dung không bị ẩn giữa chừng
test.use({ reducedMotion: 'reduce' })

/** Gom lỗi console/trang và kiểm tra không có cuộn ngang. */
function watchErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  return errors
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
}

const shot = (page: Page, name: string) =>
  page.screenshot({ path: `e2e/.results/${name}-${test.info().project.name}.png`, fullPage: true })

test('landing: slogan đủ 3 vế, đã bỏ phần thừa, footer mới', async ({ page }) => {
  const errors = watchErrors(page)
  await mockSupabase(page, { signedIn: false })
  await page.goto('/')

  const h1 = page.getByRole('heading', { level: 1 })
  await expect(h1).toHaveText(/Nghĩ sâu sắc\s*Hỏi rõ ràng\s*Vững vàng lập luận/)
  // Vế giữa phải thực sự nhìn thấy được (trước đây bị trong suốt)
  const middle = h1.getByText('Hỏi rõ ràng')
  await expect(middle).toBeVisible()
  expect(await middle.evaluate((el) => getComputedStyle(el).color)).not.toBe('rgba(0, 0, 0, 0)')

  for (const removed of ['Mục tiêu đo lường được', 'Một không gian để cùng vượt qua thiên vị tư duy', 'Nhóm 3', 'Trương Văn Dũng', 'Hồi 2', 'Hồi 4'])
    await expect(page.getByText(removed)).toHaveCount(0)

  await expect(page.getByRole('heading', { name: /6 buổi, luyện bằng/ })).toBeVisible()
  await expect(page.locator('#lo-trinh li')).toHaveCount(6)
  await expect(page.locator('footer')).toContainText('Phát triển bởi YuhnavStudio')
  // Link neo trên menu phải trỏ tới section có thật
  const hrefs = await page.locator('nav a[href^="#"]').evaluateAll((els) => els.map((el) => el.getAttribute('href')!))
  expect(hrefs).toEqual(['#van-de', '#lo-trinh', '#dang-ky'])
  for (const href of hrefs) await expect(page.locator(href)).toHaveCount(1)

  await expectNoHorizontalScroll(page)
  await shot(page, 'landing')
  await page.locator('#van-de').screenshot({ path: `e2e/.results/story-${test.info().project.name}.png` })
  expect(errors).toEqual([])
})

test('auth page hiển thị gọn, không lỗi', async ({ page }) => {
  const errors = watchErrors(page)
  await mockSupabase(page, { signedIn: false })
  await page.goto('/auth?mode=signup')
  await expect(page.getByRole('heading').first()).toBeVisible()
  await expectNoHorizontalScroll(page)
  await shot(page, 'auth')
  expect(errors).toEqual([])
})

test('dashboard: tài liệu khóa học, chi tiết buổi, trò chuyện', async ({ page }) => {
  const errors = watchErrors(page)
  await mockSupabase(page)

  await page.goto('/dashboard/khoa-hoc')
  await expect(page.getByRole('heading', { name: 'Tài liệu khóa học' })).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'Buổi' })).not.toHaveCount(0)
  await expectNoHorizontalScroll(page)
  await shot(page, 'courses')

  await page.getByRole('link', { name: /Thiên kiến nhận thức/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Thiên kiến nhận thức')
  await expectNoHorizontalScroll(page)
  await shot(page, 'course-detail')

  await page.goto(`/dashboard/tro-chuyen/${CONV_ID}`)
  await expect(page.getByTestId('quota-button')).toBeVisible()
  await expectNoHorizontalScroll(page)
  await shot(page, 'chat')

  expect(errors).toEqual([])
})
