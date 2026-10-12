import { expect, test } from '@playwright/test'
import { CONV_ID, mockSupabase, now, supabaseUrl } from './mock'

test.use({ reducedMotion: 'reduce' })

test('ArenaGamification: khi chưa có tin nhắn, không hiển thị điểm ảo và không hiển thị huy hiệu giả', async ({ page }) => {
  await mockSupabase(page)
  await page.goto('/dashboard/khoa-hoc')

  // Widget hiển thị tiêu đề và thông báo chưa kích hoạt
  const arena = page.getByLabel('Chỉ số phản biện Arena')
  await expect(arena).toBeVisible()
  await expect(arena).toContainText('Chỉ số phản biện ARE')
  await expect(arena).toContainText('Chưa có dữ liệu phản biện thực tế')
  await expect(arena.getByRole('link', { name: /Bắt đầu luyện phản biện/ })).toBeVisible()

  // Tuyệt đối không hiển thị điểm số ảo 92%, 85%, 80% hay huy hiệu giả
  await expect(arena.getByText('92%')).toHaveCount(0)
  await expect(arena.getByText('85%')).toHaveCount(0)
  await expect(arena.getByText('Khắc tinh Ad Hominem')).toHaveCount(0)
  await expect(arena.getByText('Thợ săn Chi phí chìm')).toHaveCount(0)
})

test('ArenaGamification: khi có tin nhắn thực tế, hiển thị điểm thật và CHỈ hiện huy hiệu đã đạt', async ({ page }) => {
  await mockSupabase(page)

  // Ghi đè mock messages trả về 2 tin nhắn của USER tranh luận tốt về chủ đề boc-phot
  await page.route(`${supabaseUrl}/**`, async (route) => {
    const url = route.request().url()
    const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    if (url.includes('/rest/v1/conversations')) {
      return json([{ id: CONV_ID, topic: 'boc-phot', custom_topic: null, status: 'ACTIVE', last_interacted_at: now, token_count: 500, created_at: now }])
    }
    if (url.includes('/rest/v1/messages')) {
      return json([
        { id: 1, conversation_id: CONV_ID, sender_type: 'BOT', content: 'Bạn đứng về phía nào, vì sao?', fallacy_code: null, created_at: now },
        {
          id: 2,
          conversation_id: CONV_ID,
          sender_type: 'USER',
          content: 'Tôi cho rằng bóc phốt là hành vi tiêu cực vì nó xâm phạm quyền riêng tư và gây tổn hại tâm lý người khác.',
          fallacy_code: null,
          created_at: now,
        },
        {
          id: 3,
          conversation_id: CONV_ID,
          sender_type: 'USER',
          content: 'Theo thống kê có 75% vụ bóc phốt biến thành bạo lực mạng kéo dài, vì vậy pháp luật cần can thiệp xử phạt nghiêm.',
          fallacy_code: null,
          created_at: now,
        },
      ])
    }
    return route.continue()
  })

  await page.goto('/dashboard/khoa-hoc')
  const arena = page.getByLabel('Chỉ số phản biện Arena')
  await expect(arena).toBeVisible()

  // Hiển thị điểm thật và tổng hợp từ 2 lượt
  await expect(arena).toContainText('Tổng hợp từ 2 lượt lập luận qua 1 cuộc trò chuyện')
  await expect(arena).toContainText('Luận điểm trực diện')
  await expect(arena).toContainText('Lý lẽ đa chiều')
  await expect(arena).toContainText('Dẫn chứng có căn cứ')

  // Huy hiệu: hiển thị dưới dạng icon, bấm vào thì hiển thị thông tin chi tiết
  const badgeBtn = arena.getByRole('button', { name: /Khắc tinh Ad Hominem/ })
  await expect(badgeBtn).toBeVisible()

  // Chưa bấm: các huy hiệu khác không đạt tuyệt đối không được hiện
  await expect(arena.getByRole('button', { name: /Thợ săn Chi phí chìm/ })).toHaveCount(0)
  await expect(arena.getByRole('button', { name: /Vượt bẫy Thiên kiến/ })).toHaveCount(0)

  // Bấm vào icon huy hiệu để mở chi tiết
  await badgeBtn.click()
  const detail = arena.getByRole('region', { name: /Chi tiết huy hiệu/ })
  await expect(detail).toBeVisible()
  await expect(detail).toContainText('Khắc tinh Ad Hominem')
  await expect(detail).toContainText('Bẻ gãy công kích cá nhân, bảo vệ luận điểm thép')
  await expect(detail).toContainText('Đã mở')

  // Bấm nút đóng chi tiết
  await detail.getByRole('button', { name: 'Đóng chi tiết huy hiệu' }).click()
  await expect(detail).toHaveCount(0)
})

test('Sidebar desktop: auto-collapse mặc định (w-20), rê chuột vào bung ra (w-72), rời chuột thu nhỏ lại', async ({ page }) => {
  await mockSupabase(page)
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/dashboard/khoa-hoc')

  const sidebar = page.locator('aside')
  await expect(sidebar).toBeVisible()

  // Mặc định: thu gọn w-20 (80px)
  let box = await sidebar.boundingBox()
  expect(box?.width).toBe(80)

  // Di chuột vào: bung mở w-72 (288px)
  await sidebar.hover()
  await page.waitForTimeout(350)
  box = await sidebar.boundingBox()
  expect(box?.width).toBe(288)

  // Di chuột ra ngoài (ví dụ vào khu vực main): tự động thu nhỏ lại w-20 (80px)
  await page.locator('main').hover()
  await page.waitForTimeout(350)
  box = await sidebar.boundingBox()
  expect(box?.width).toBe(80)
})
