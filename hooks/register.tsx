import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { ContextFigures, SeenAgent, Usage, UsageWindow } from '../types'

import { headline, label, merge, sameAgents, shown, summarize } from './agents'
import { clamp, money, number, resetIn } from './format'
import { readRam } from './ram'
import { altText, bandSvg, paneSvg } from './svg'

const usage = atom({ plugin: 'usage-band', key: 'usage' } as const, null)
const agents = atom({ plugin: 'usage-band', key: 'agents' } as const, [])

const PANE = 'usage-pane'
const REFRESH_MS = 30_000
// Subagents move faster than the usage figures: events move them as agents
// start, use tools and finish turns, and this poll catches the rest (one
// that fails or is stopped).
const AGENTS_MS = 3_000

const refreshAgents = async ($: EngineInterface) => {
  const listed: SeenAgent[] = (await $.agent.list()).map(agent => ({
    id: agent.id,
    status: agent.status,
  }))
  const seen = await read($, agents)
  const next = merge(seen, listed)

  if (!sameAgents(seen, next)) await update($, agents, () => next)
}

const windowText = (window: UsageWindow | null, now: number) =>
  window === null
    ? '—'
    : `${number(window.percentUsed)} % · reset ${resetIn(window.resetsAt, now)}`

const contextText = (context: ContextFigures | null) =>
  context === null || context.percent === null
    ? 'Contexto —'
    : `Contexto ${context.percent} %`

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const refresh = async () => {
      const session = await $.session.usage()
      const ram = await readRam(
        path => $.fs.read(path),
        argv => $.process.run(argv),
      )

      const window = (kind: string): UsageWindow | null => {
        const found = session.rateLimits.find(r => r.kind === kind)
        return found
          ? { percentUsed: found.percentUsed, resetsAt: found.resetsAt ?? null }
          : null
      }

      const snapshot: Usage = {
        fiveHour: window('five_hour'),
        sevenDay: window('seven_day'),
        ram,
        cost: session.cost?.usd ?? null,
        context: {
          percent: session.context.percent ?? null,
          tokens: session.context.tokens ?? null,
          window: session.context.window,
        },
      }

      await update($, usage, () => snapshot)
    }

    await $.command.register({
      name: 'consumo',
      description: 'Abre el panel de consumo: coste, contexto y ventanas de uso',
    })

    void refresh().catch(() => undefined)
    $.clock.every(REFRESH_MS, () => {
      void refresh().catch(() => undefined)
    })

    void refreshAgents($).catch(() => undefined)
    $.clock.every(AGENTS_MS, () => {
      void refreshAgents($).catch(() => undefined)
    })

    return next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    const result = await next(e)
    void refreshAgents($).catch(() => undefined)

    return result
  })

  on('turn.start', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId !== undefined) void refreshAgents($).catch(() => undefined)

    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId !== undefined) void refreshAgents($).catch(() => undefined)

    return result
  })

  on('tool.call', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId !== undefined || e.tool === 'Agent') {
      void refreshAgents($).catch(() => undefined)
    }

    return result
  })

  on('command.run', { command: 'consumo' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Consumo' })

    return { text: 'Panel de consumo abierto.' }
  }).catch(() => ({ text: 'No se pudo abrir el panel de consumo.' }))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const figures = await read($, usage)
    const seen = await read($, agents)
    if (figures === null && seen.length === 0) return next(e)

    const now = await $.clock.now()
    const summary = seen.length === 0 ? null : summarize(seen)

    if (e.surface !== 'terminal') {
      const { Svg } = $.ui.resolve(e)
      return (
        <Svg source={bandSvg(figures, now, summary)} alt={altText(figures, now, summary)} />
      )
    }

    const { Box, Text } = $.ui.resolve(e)
    const ram =
      figures === null || figures.ram === null
        ? 'RAM —'
        : `RAM ${number(figures.ram.usedGiB)} / ${number(figures.ram.totalGiB)} GiB`
    const subagents =
      summary === null
        ? ''
        : `   ${headline(summary.total)}: ${shown(summary)
            .map(group => label(group, summary.counts[group]))
            .join(' · ')}`

    return (
      <Box>
        <Text dimColor>
          {figures === null
            ? ''
            : `${windowText(figures.fiveHour, now)}   ${windowText(figures.sevenDay, now)}   ${contextText(figures.context)}   ${ram}`}
          {subagents}
        </Text>
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e, next) => {
    const figures = await read($, usage)
    if (figures === null) return next(e)

    const now = await $.clock.now()

    if (e.surface !== 'terminal') {
      const { Svg } = $.ui.resolve(e)
      return <Svg source={paneSvg(figures, now)} alt={altText(figures, now)} />
    }

    const { Box, Text } = $.ui.resolve(e)
    const width = e.props.bodyColumns

    const bar = (label: string, value: string, percent: number | null) => (
      <Box flexDirection="column" marginY={1}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text>{label}</Text>
          <Text dimColor>{value}</Text>
        </Box>
        <Box width={width} height={1} backgroundColor="inactive">
          <Box width={`${clamp(percent)}%`} height={1} backgroundColor="claude" />
        </Box>
      </Box>
    )

    const { fiveHour, sevenDay, context } = figures

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" justifyContent="space-between">
          <Text>Consumo</Text>
          <Text dimColor>sesión actual</Text>
        </Box>
        <Box flexDirection="row" gap={2} marginY={1}>
          <Box flexDirection="column" borderStyle="round" paddingX={1} flexGrow={1}>
            <Text dimColor>Coste sesión</Text>
            <Text>{figures.cost === null ? '—' : money(figures.cost)}</Text>
          </Box>
          <Box flexDirection="column" borderStyle="round" paddingX={1} flexGrow={1}>
            <Text dimColor>Contexto</Text>
            <Text>{context?.percent == null ? '—' : `${context.percent} %`}</Text>
          </Box>
        </Box>
        {bar('Ventana 5 h', windowText(fiveHour, now), fiveHour?.percentUsed ?? null)}
        {bar('Ventana 7 d', windowText(sevenDay, now), sevenDay?.percentUsed ?? null)}
        {bar(
          'Contexto',
          context === null || context.tokens === null
            ? '—'
            : `${number(context.tokens / 1000)}k / ${number(context.window / 1000)}k`,
          context?.percent ?? null,
        )}
        {figures.ram !== null &&
          bar(
            'RAM usada',
            `${number(figures.ram.usedGiB)} / ${number(figures.ram.totalGiB)} GiB`,
            (figures.ram.usedGiB / figures.ram.totalGiB) * 100,
          )}
      </Box>
    )
  })
}
