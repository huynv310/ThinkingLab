import { expect, test, type Page } from '@playwright/test'
import { CONV_ID, mockSupabase } from './mock'

// Chỉ chạy ở project "mobile"; thêm màn hình nhỏ nhất phổ biến (iPhone SE)
test.skip(({ isMobile }) => !isMobile, 'Chỉ kiểm tra trên điện thoại')
test.use({ reducedMotion: 'reduce' })

/** Đo các vấn đề mobile: vùng chạm < 44px, chữ < 12px, tràn ngang. */
async function audit(page: Page) {
  return page.evaluate(() => {
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect()
      const s = getComputedStyle(el)
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0
    }
    const label = (el: Element) => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 40)
    const smallTargets = [...document.querySelectorAll('a, button, input, textarea, select, [role="button"]')]
      .filter(visible)
      // Link nằm giữa đoạn văn được miễn (WCAG 2.5.8 inline exception)
      .filter((el) => !(el.tagName === 'A' && el.closest('p')))
      .filter((el) => el.closest('.sr-only') === null)
      .map((el) => ({ el: label(el), ...(({ width, height }) => ({ w: Math.round(width), h: Math.round(height) }))(el.getBoundingClientRect()) }))
      .filter((t) => t.w < 44 || t.h < 44)
    const tinyText = [...document.querySelectorAll('body *')]
      .filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()))
      .filter(visible)
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12)
      .map((el) => `${label(el)} (${getComputedStyle(el).fontSize})`)
    return { overflow: document.documentElement.scrollWidth - window.innerWidth, smallTargets, tinyText }
  })
}

async function check(page: Page, name: string) {
  const r = await audit(page)
  await page.screenshot({ path: `e2e/.results/m-${name}-${test.info().project.name}.png` })
  expect.soft(r.overflow, 'không được cuộn ngang').toBeLessThanOrEqual(0)
  expect.soft(r.smallTargets, 'vùng chạm phải ≥ 44px').toEqual([])
  expect.soft(r.tinyText, 'chữ phải ≥ 12px').toEqual([])
}

for (const viewport of [{ width: 375, height: 667 }, null]) {
  test.describe(viewport ? 'iPhone SE' : 'mặc định', () => {
    if (viewport) test.use({ viewport })

    test('landing', async ({ page }) => {
      await mockSupabase(page, { signedIn: false })
      await page.goto('/')
      await expect(page.locator('#hero-title')).toBeVisible()
      await check(page, `landing-top-${viewport?.width ?? 'def'}`)
      await page.locator('#lo-trinh').scrollIntoViewIfNeeded()
      await check(page, `landing-roadmap-${viewport?.width ?? 'def'}`)
      await page.locator('#dang-ky').scrollIntoViewIfNeeded()
      await check(page, `landing-cta-${viewport?.width ?? 'def'}`)
    })

    test('auth', async ({ page }) => {
      await mockSupabase(page, { signedIn: false })
      await page.goto('/auth?mode=signup')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await check(page, `auth-${viewport?.width ?? 'def'}`)
    })

    test('dashboard', async ({ page }) => {
      await mockSupabase(page, { used: 7_500, daily: 120_000 })
      await page.goto('/dashboard/khoa-hoc')
      await expect(page.getByRole('heading', { name: 'Tài liệu khóa học' })).toBeVisible()
      await check(page, `courses-${viewport?.width ?? 'def'}`)

      await page.goto('/dashboard/khoa-hoc/buoi-2')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await check(page, `detail-${viewport?.width ?? 'def'}`)

      await page.goto('/dashboard/tro-chuyen')
      await expect(page.getByRole('heading', { name: 'Trò chuyện', exact: true })).toBeVisible()
      await check(page, `chat-list-${viewport?.width ?? 'def'}`)

      await page.goto(`/dashboard/tro-chuyen/${CONV_ID}`)
      await expect(page.getByText('Bạn nghiêng về phe nào?')).toBeVisible()
      await check(page, `chat-${viewport?.width ?? 'def'}`)
      await page.getByTestId('quota-button').click()
      await check(page, `chat-quota-${viewport?.width ?? 'def'}`)
    })
  })
}
