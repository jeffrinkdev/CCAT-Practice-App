import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  countByCategory,
  shuffledCopy,
  formatSeconds,
  escapeHtml,
} from '../state.js'

describe('countByCategory', () => {
  it('counts questions by category', () => {
    const questions = [
      { category: 'Numeric / Logic' },
      { category: 'Numeric / Logic' },
      { category: 'Verbal' },
      { category: 'Spatial' },
      { category: 'Verbal' },
    ]
    const result = countByCategory(questions)
    expect(result).toEqual({
      'Numeric / Logic': 2,
      Verbal: 2,
      Spatial: 1,
    })
  })

  it('handles empty array', () => {
    expect(countByCategory([])).toEqual({})
  })

  it('counts single category', () => {
    const questions = [{ category: 'General' }, { category: 'General' }]
    const result = countByCategory(questions)
    expect(result).toEqual({ General: 2 })
  })

  it('counts many categories', () => {
    const questions = Array.from({ length: 50 }, (_, i) => ({
      category: `Category ${i % 5}`,
    }))
    const result = countByCategory(questions)
    expect(Object.values(result).every((count) => count === 10)).toBe(true)
  })
})

describe('shuffledCopy', () => {
  it('returns a copy, not the original array', () => {
    const original = [1, 2, 3, 4, 5]
    const shuffled = shuffledCopy(original)
    expect(shuffled).not.toBe(original)
    expect(original).toEqual([1, 2, 3, 4, 5]) // original unchanged
  })

  it('preserves all elements', () => {
    const original = [1, 2, 3, 4, 5]
    const shuffled = shuffledCopy(original)
    expect(shuffled.sort((a, b) => a - b)).toEqual(original)
  })

  it('shuffles elements', () => {
    const original = Array.from({ length: 10 }, (_, i) => i)
    const shuffled = shuffledCopy(original)
    // Very unlikely to get exact same order (1 in 10! chance)
    // This is a probabilistic test, but safe enough for our purposes
    expect(shuffled).not.toEqual(original)
  })

  it('handles single element', () => {
    const result = shuffledCopy([1])
    expect(result).toEqual([1])
  })

  it('handles empty array', () => {
    const result = shuffledCopy([])
    expect(result).toEqual([])
  })

  it('handles two elements', () => {
    const result = shuffledCopy([1, 2])
    // Result should be either [1, 2] or [2, 1]
    expect([1, 2].every((v) => result.includes(v))).toBe(true)
    expect(result.length).toBe(2)
  })

  it('maintains distribution after multiple shuffles', () => {
    // Run shuffle many times and check elements are well-distributed
    const counts = { '0': 0, '1': 0, '2': 0, '3': 0 }
    for (let i = 0; i < 1000; i++) {
      const shuffled = shuffledCopy([0, 1, 2, 3])
      counts[shuffled[0]]++
    }
    // Each element should be first ~250 times (1000/4)
    Object.values(counts).forEach((count) => {
      expect(count).toBeGreaterThan(150) // Rough distribution check
      expect(count).toBeLessThan(350)
    })
  })
})

describe('formatSeconds', () => {
  it('formats 0 seconds as 0:00', () => {
    expect(formatSeconds(0)).toBe('0:00')
  })

  it('formats 59 seconds as 0:59', () => {
    expect(formatSeconds(59)).toBe('0:59')
  })

  it('formats 60 seconds as 1:00', () => {
    expect(formatSeconds(60)).toBe('1:00')
  })

  it('formats 121 seconds as 2:01', () => {
    expect(formatSeconds(121)).toBe('2:01')
  })

  it('formats 900 seconds (15 min) as 15:00', () => {
    expect(formatSeconds(900)).toBe('15:00')
  })

  it('pads seconds with leading zero', () => {
    expect(formatSeconds(65)).toBe('1:05')
    expect(formatSeconds(605)).toBe('10:05')
  })

  it('ceils fractional seconds', () => {
    // 59.1 ceils to 60, which is 1:00
    expect(formatSeconds(59.1)).toBe('1:00')
    expect(formatSeconds(59.9)).toBe('1:00')
  })

  it('treats negative numbers as 0', () => {
    expect(formatSeconds(-10)).toBe('0:00')
  })
})

describe('escapeHtml', () => {
  it('escapes ampersand', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B')
  })

  it('escapes less than', () => {
    expect(escapeHtml('x < y')).toBe('x &lt; y')
  })

  it('escapes greater than', () => {
    expect(escapeHtml('x > y')).toBe('x &gt; y')
  })

  it('escapes double quotes', () => {
    expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;')
  })

  it('escapes single quotes', () => {
    expect(escapeHtml("it's nice")).toBe('it&#039;s nice')
  })

  it('escapes multiple special characters', () => {
    expect(escapeHtml('<script>alert("xss" & \'bad\')</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot; &amp; &#039;bad&#039;)&lt;/script&gt;'
    )
  })

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('handles null/undefined as empty string', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })

  it('handles plain text without special characters', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World')
  })

  it('handles multiple ampersands', () => {
    expect(escapeHtml('A & B & C')).toBe('A &amp; B &amp; C')
  })
})
