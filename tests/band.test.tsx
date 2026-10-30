import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'usage-band',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 120,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

const AGENTS = [
  { id: 'a', status: 'running' },
  { id: 'b', status: 'waiting' },
  { id: 'c', status: 'completed' },
]

test('the band adds the subagents after the usage figures', async ($, on) => {
  on('clock.now', () => ({ value: 0 }))
  on('state.get', (_, e) => ({
    value:
      e.key === 'agents'
        ? { value: AGENTS, version: 1 }
        : { value: null, version: 1 },
  }))

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const text = (await ui.find({ type: 'Text' }))?.text

  expect(text).toContain('3 subagentes: 1 trabajando · 1 esperando · 1 terminado')
  await ui.unmount()
})

test('the band is one drawing on the desktop', async ($, on) => {
  on('clock.now', () => ({ value: 0 }))
  on('state.get', (_, e) => ({
    value:
      e.key === 'agents'
        ? { value: AGENTS, version: 1 }
        : { value: null, version: 1 },
  }))

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const svg = await ui.find({ type: 'Svg' })

  expect(svg).toBeDefined()
  await ui.unmount()
})
