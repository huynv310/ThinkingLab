import { describe, expect, it } from 'vitest'
import { MAX_MATERIAL_BYTES, checkMaterialFile, hasValidSignature, linesToList, parseYoutubeId, slugify } from './courseRules'

const ID = 'dQw4w9WgXcQ'

describe('parseYoutubeId', () => {
  it.each([
    ID,
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=42s&list=abc`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}?si=xyz`,
    `youtu.be/${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube.com/live/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}`,
  ])('accepts %s', (input) => {
    expect(parseYoutubeId(input)).toBe(ID)
  })

  it.each([
    '',
    'hello',
    `https://vimeo.com/${ID}`,
    `https://drive.google.com/file/d/${ID}`,
    `https://evil.com/watch?v=${ID}`,
    `https://youtube.com.evil.com/watch?v=${ID}`,
    `https://www.youtube.com/watch?v=short`,
    `javascript:alert(1)//youtube.com/watch?v=${ID}`,
  ])('rejects %s', (input) => {
    expect(parseYoutubeId(input)).toBeNull()
  })
})

describe('checkMaterialFile', () => {
  const pptxMime = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'

  it('accepts pdf and pptx', () => {
    expect(checkMaterialFile({ name: 'Bai 1.PDF', type: 'application/pdf', size: 10 })).toEqual({ ok: true, type: 'pdf' })
    expect(checkMaterialFile({ name: 'slide.pptx', type: pptxMime, size: 10 })).toEqual({ ok: true, type: 'pptx' })
    expect(checkMaterialFile({ name: 'slide.pptx', type: '', size: 10 })).toEqual({ ok: true, type: 'pptx' })
  })

  it.each(['a.ppt', 'a.docx', 'a.pdf.exe', 'a.zip', 'pdf', 'a.mp4'])('rejects %s', (name) => {
    expect(checkMaterialFile({ name, type: '', size: 10 }).ok).toBe(false)
  })

  it('rejects mismatched mime, empty and oversized files', () => {
    expect(checkMaterialFile({ name: 'a.pdf', type: 'text/html', size: 10 }).ok).toBe(false)
    expect(checkMaterialFile({ name: 'a.pdf', type: 'application/pdf', size: 0 }).ok).toBe(false)
    expect(checkMaterialFile({ name: 'a.pdf', type: 'application/pdf', size: MAX_MATERIAL_BYTES + 1 }).ok).toBe(false)
  })
})

describe('hasValidSignature', () => {
  it('checks magic bytes', () => {
    expect(hasValidSignature('pdf', new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe(true)
    expect(hasValidSignature('pptx', new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toBe(true)
    expect(hasValidSignature('pdf', new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toBe(false)
    expect(hasValidSignature('pptx', new Uint8Array([0x3c, 0x68]))).toBe(false)
  })
})

describe('slugify / linesToList', () => {
  it('builds ascii slugs from Vietnamese', () => {
    expect(slugify('Buổi 8: Đọc ngang & CRAAP!')).toBe('buoi-8-doc-ngang-craap')
    expect(slugify('  ---  ')).toBe('')
  })

  it('splits non-empty trimmed lines', () => {
    expect(linesToList(' a \n\n b\r\n')).toEqual(['a', 'b'])
  })
})
