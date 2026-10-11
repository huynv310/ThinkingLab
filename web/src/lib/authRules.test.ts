import { describe, expect, it } from 'vitest'
import { PASSWORD_RULES, emailError, passwordOk, suggestEmail } from './authRules'

describe('emailError', () => {
  it.each(['an@gmail.com', ' An.Nguyen+lab@FPT.edu.vn ', 'a_b-c@sub.domain.io'])('accepts %s', (e) => {
    expect(emailError(e)).toBeNull()
  })

  it.each(['', 'an', 'an@', '@gmail.com', 'an@gmail', 'an@gmail.c', 'a n@gmail.com', 'an..b@gmail.com', '.an@gmail.com',
    'an.@gmail.com', 'an@-gmail.com', 'an@gmail-.com', 'an@@gmail.com', 'an@gmail.com.'])('rejects %s', (e) => {
    expect(emailError(e)).not.toBeNull()
  })
})

describe('suggestEmail', () => {
  it('fixes common domain typos', () => {
    expect(suggestEmail('an@gmial.com')).toBe('an@gmail.com')
    expect(suggestEmail('an@gmail.con')).toBe('an@gmail.com')
    expect(suggestEmail('an@yahooo.com')).toBe('an@yahoo.com')
    expect(suggestEmail('an@fpt.edu.com')).toBeNull()
  })

  it('leaves correct or unrelated domains alone', () => {
    expect(suggestEmail('an@gmail.com')).toBeNull()
    expect(suggestEmail('an@company.vn')).toBeNull()
    expect(suggestEmail('an')).toBeNull()
  })
})

describe('password rules', () => {
  const failed = (p: string, email = 'an@gmail.com') => PASSWORD_RULES.filter((r) => !r.test(p, email)).map((r) => r.id)

  it('accepts a strong password', () => {
    expect(passwordOk('Tlab#2026x', 'an@gmail.com')).toBe(true)
  })

  it('reports each missing criterion', () => {
    expect(failed('Ab1!')).toEqual(['length'])
    expect(failed('ABCDEFG1!')).toEqual(['lower'])
    expect(failed('abcdefg1!')).toEqual(['upper'])
    expect(failed('Abcdefgh!')).toEqual(['digit'])
    expect(failed('Abcdefgh1')).toEqual(['symbol'])
    expect(failed('Huyne0310!', 'huyne0310@gmail.com')).toEqual(['email'])
  })
})
