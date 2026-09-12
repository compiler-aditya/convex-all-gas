import { describe, expect, it } from 'vitest'
import type { Dimension } from '../../convex/templates/types'
import { TEMPLATES } from '../../convex/templates'
import { questionFor } from './bounds-copy'

const withCopy: Dimension = {
  key: 'rate',
  label: 'Total fee',
  type: 'money',
  higherFavors: 'a',
  askMin: 'What is the least you would take?',
  askMax: 'What is the most you would pay?',
}

const withoutCopy: Dimension = {
  key: 'deposit',
  label: 'Security deposit',
  type: 'money',
  higherFavors: 'b',
}

describe('questionFor', () => {
  it('asks in the direction the person is protected in', () => {
    expect(questionFor(withCopy, true)).toBe('What is the least you would take?')
    expect(questionFor(withCopy, false)).toBe('What is the most you would pay?')
  })

  // The path every future template takes before anyone writes copy for it.
  it('falls back to a generic question built from the label', () => {
    expect(questionFor(withoutCopy, true)).toBe(
      'What is the lowest security deposit you would accept?',
    )
    expect(questionFor(withoutCopy, false)).toBe(
      'What is the highest security deposit you would accept?',
    )
  })

  it('gives every shipped dimension a question in both directions', () => {
    for (const template of Object.values(TEMPLATES)) {
      for (const dimension of template.dimensions) {
        for (const minimum of [true, false]) {
          const question = questionFor(dimension, minimum)
          expect(question.endsWith('?'), `${dimension.key} (${minimum})`).toBe(true)
        }
      }
    }
  })
})
