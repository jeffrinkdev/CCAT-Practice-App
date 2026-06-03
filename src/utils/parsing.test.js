import { describe, it, expect } from 'vitest'
import {
  parseJsonCorpus,
  parseTextCorpus,
} from './parsing.js'

describe('parseJsonCorpus', () => {
  it('parses valid JSON with 4 choices and correct answer', () => {
    const json = JSON.stringify([
      {
        id: 'Q1',
        category: 'Numeric / Logic',
        prompt: 'What is 2+2?',
        choices: ['3', '4', '5', '6'],
        answer: 'B',
        difficulty: 2,
      },
    ])
    const result = parseJsonCorpus(json)
    expect(result).toHaveLength(1)
    expect(result[0].prompt).toBe('What is 2+2?')
    expect(result[0].correctIndex).toBe(1) // B
    expect(result[0].category).toBe('Numeric / Logic')
    expect(result[0].difficulty).toBe(2)
  })

  it('parses JSON with wrapped data structure', () => {
    const json = JSON.stringify({
      questions: [
        {
          prompt: 'Test?',
          choices: ['A', 'B', 'C', 'D'],
          answer: 'A',
        },
      ],
    })
    const result = parseJsonCorpus(json)
    expect(result).toHaveLength(1)
  })

  it('filters out questions with < 4 choices', () => {
    const json = JSON.stringify([
      {
        prompt: 'Valid',
        choices: ['A', 'B', 'C', 'D'],
        answer: 'A',
      },
      {
        prompt: 'Invalid - 3 choices',
        choices: ['A', 'B', 'C'],
        answer: 'A',
      },
    ])
    const result = parseJsonCorpus(json)
    expect(result).toHaveLength(1)
  })

  it('filters out questions with invalid answer index', () => {
    const json = JSON.stringify([
      {
        prompt: 'Valid',
        choices: ['A', 'B', 'C', 'D'],
        answer: 'B',
      },
      {
        prompt: 'Invalid - no match',
        choices: ['A', 'B', 'C', 'D'],
        answer: 'X',
      },
    ])
    const result = parseJsonCorpus(json)
    expect(result).toHaveLength(1)
  })

  it('filters out questions with empty prompt', () => {
    const json = JSON.stringify([
      {
        prompt: 'Valid',
        choices: ['A', 'B', 'C', 'D'],
        answer: 'A',
      },
      {
        prompt: '',
        choices: ['A', 'B', 'C', 'D'],
        answer: 'A',
      },
    ])
    const result = parseJsonCorpus(json)
    expect(result).toHaveLength(1)
  })

  it('generates question ID if missing', () => {
    const json = JSON.stringify([
      {
        prompt: 'Test',
        choices: ['A', 'B', 'C', 'D'],
        answer: 'A',
      },
    ])
    const result = parseJsonCorpus(json)
    expect(result[0].id).toBe('Q1')
  })

  it('normalizes category names', () => {
    const json = JSON.stringify([
      {
        prompt: 'Test 1',
        category: 'Math & Logic',
        choices: ['A', 'B', 'C', 'D'],
        answer: 'A',
      },
      {
        prompt: 'Test 2',
        category: 'Spatial Reasoning',
        choices: ['A', 'B', 'C', 'D'],
        answer: 'A',
      },
    ])
    const result = parseJsonCorpus(json)
    expect(result[0].category).toBe('Numeric / Logic')
    expect(result[1].category).toBe('Spatial')
  })

  it('handles choice objects with text property', () => {
    const json = JSON.stringify([
      {
        prompt: 'Test',
        choices: [{ text: 'Option A' }, { text: 'Option B' }, { text: 'Option C' }, { text: 'Option D' }],
        answer: 'C',
      },
    ])
    const result = parseJsonCorpus(json)
    expect(result[0].choices[2].text).toBe('Option C')
  })

  it('returns empty array for empty input', () => {
    const json = JSON.stringify([])
    const result = parseJsonCorpus(json)
    expect(result).toEqual([])
  })
})

describe('parseTextCorpus', () => {
  it('parses valid text format with single question', () => {
    const text = `1. Numeric / Logic
What is 2+2?
A) 3
B) 4
C) 5
D) 6

ANSWER KEY: B`

    const result = parseTextCorpus(text)
    expect(result).toHaveLength(1)
    expect(result[0].prompt).toBe('What is 2+2?')
    expect(result[0].correctIndex).toBe(1)
    expect(result[0].category).toBe('Numeric / Logic')
  })

  it('parses multiple questions separated by blank lines', () => {
    const text = `1. Category A
Question 1?
A) Wrong
B) Right
C) Wrong
D) Wrong

2. Category B
Question 2?
A) Right
B) Wrong
C) Wrong
D) Wrong

ANSWER KEY: B, A`

    const result = parseTextCorpus(text)
    expect(result).toHaveLength(2)
    expect(result[0].correctIndex).toBe(1)
    expect(result[1].correctIndex).toBe(0)
  })

  it('throws error if ANSWER KEY section is missing', () => {
    const text = `1. Category
Question?
A) A
B) B
C) C
D) D`

    expect(() => parseTextCorpus(text)).toThrow('Missing ANSWER KEY section.')
  })

  it('parses difficulty annotation', () => {
    const text = `1. Category
Question?
A) A
B) B
C) C
D) D
DIFFICULTY: 7/10

ANSWER KEY: A`

    const result = parseTextCorpus(text)
    expect(result[0].difficulty).toBe(7)
    expect(result[0].difficultyRationale).toBe('Text corpus difficulty annotation')
  })

  it('includes questions with extra answers in ANSWER KEY', () => {
    const text = `1. Category
Question?
A) A
B) B
C) C
D) D

ANSWER KEY: B, A`

    const result = parseTextCorpus(text)
    // Only the first question is parsed, second answer in key is ignored
    expect(result).toHaveLength(1)
    expect(result[0].correctIndex).toBe(1) // B
  })

  it('handles multi-line prompts', () => {
    const text = `1. Category
This is a multi-line
prompt that spans
multiple lines?
A) Option A
B) Option B
C) Option C
D) Option D

ANSWER KEY: B`

    const result = parseTextCorpus(text)
    expect(result[0].prompt).toContain('multi-line')
    expect(result[0].prompt).toContain('spans')
  })

  it('normalizes whitespace in choices', () => {
    const text = `1. Category
Question?
A)   Extra   spaces   
B) Normal
C) Normal
D) Normal

ANSWER KEY: A`

    const result = parseTextCorpus(text)
    expect(result[0].choices[0].text).toBe('Extra   spaces')
  })
})