import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

function buildTextCorpus(questionCount = 60) {
  const categories = ['Numeric / Logic', 'Verbal', 'Spatial']
  const blocks = []
  const answers = []

  for (let i = 1; i <= questionCount; i += 1) {
    blocks.push(`${i}. ${categories[(i - 1) % 3]}\nPrompt ${i}?\nA) Choice A\nB) Choice B\nC) Choice C\nD) Choice D`)
    answers.push('B')
  }

  return `${blocks.join('\n\n')}\n\nANSWER KEY: ${answers.join(', ')}`
}

async function flush() {
  await Promise.resolve()
  await Promise.resolve()
}

describe('App React smoke integration', () => {
  let container
  let root

  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    globalThis.IS_REACT_ACT_ENVIRONMENT = true

    container = document.createElement('div')
    document.body.appendChild(container)

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        text: async () => buildTextCorpus(),
      }))
    )

    vi.stubGlobal('open', vi.fn())
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(async () => { }),
      },
    })
  })

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root.unmount()
      })
      root = null
    }

    vi.useRealTimers()
    vi.unstubAllGlobals()
    container?.remove()
    container = null
  })

  it('mounts real app and completes start -> answer -> summary', async () => {
    const { default: App } = await import('../App.jsx')

    await act(async () => {
      root = createRoot(container)
      root.render(<App />)
      await flush()
    })

    const startBtn = container.querySelector('#startBtn')
    const corpusStatus = container.querySelector('#corpusStatus')

    expect(startBtn?.disabled).toBe(false)
    expect(corpusStatus?.textContent).toContain('Loaded')

    await act(async () => {
      startBtn?.click()
      await flush()
    })
    expect(container.querySelector('#questionScreen')?.classList.contains('hidden')).toBe(false)

    const firstAnswer = container.querySelector('#answers .answer-btn')
    expect(firstAnswer).toBeTruthy()
    await act(async () => {
      firstAnswer?.click()
      await flush()
    })

    await act(async () => {
      vi.advanceTimersByTime(230)
      await flush()
    })

    const stopBtn = container.querySelector('#stopBtn')
    await act(async () => {
      stopBtn?.click()
      await flush()
    })

    expect(container.querySelector('#summaryScreen')?.classList.contains('hidden')).toBe(false)
    expect(container.querySelector('#questionScreen')?.classList.contains('hidden')).toBe(true)
    expect(container.querySelector('#summaryStats')?.textContent).toContain('Answered')
  })
})