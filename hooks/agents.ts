import type { AgentStatus, SeenAgent } from '../types'

export type Group = 'working' | 'waiting' | 'done' | 'failed'

export type Summary = {
  total: number
  counts: Record<Group, number>
}

export const GROUPS: readonly Group[] = ['working', 'waiting', 'done', 'failed']

export const label = (group: Group, count: number) => {
  switch (group) {
    case 'working':
      return `${count} trabajando`
    case 'waiting':
      return `${count} esperando`
    case 'done':
      return count === 1 ? '1 terminado' : `${count} terminados`
    case 'failed':
      return count === 1 ? '1 fallido' : `${count} fallidos`
  }
}

/** The groups to show, in order: the ones with at least one agent. */
export const shown = (summary: Summary) =>
  GROUPS.filter(group => summary.counts[group] > 0)

const ENDED: readonly AgentStatus[] = ['completed', 'failed', 'killed']

export const groupOf = (status: AgentStatus): Group => {
  switch (status) {
    case 'running':
      return 'working'
    case 'pending':
    case 'waiting':
    case 'idle':
      return 'waiting'
    case 'completed':
      return 'done'
    case 'failed':
    case 'killed':
      return 'failed'
  }
}

/**
 * Folds what `$.agent.list()` returns now into what the band has seen.
 *
 * The engine drops a subagent from the list some seconds after it ends, so
 * an agent the list no longer has keeps its last status; one that was still
 * active when it left is counted as completed, since the engine only drops
 * an agent once it has ended.
 */
export const merge = (
  seen: readonly SeenAgent[],
  listed: readonly SeenAgent[],
): SeenAgent[] => {
  const now = new Map(listed.map(agent => [agent.id, agent.status]))
  const merged: SeenAgent[] = seen.map(agent => {
    const status = now.get(agent.id)
    if (status !== undefined) return { id: agent.id, status }
    if (ENDED.includes(agent.status)) return agent
    return { id: agent.id, status: 'completed' }
  })

  const known = new Set(seen.map(agent => agent.id))
  for (const agent of listed) {
    if (!known.has(agent.id)) merged.push({ id: agent.id, status: agent.status })
  }

  return merged
}

export const summarize = (agents: readonly SeenAgent[]): Summary => {
  const counts: Record<Group, number> = { working: 0, waiting: 0, done: 0, failed: 0 }
  for (const agent of agents) counts[groupOf(agent.status)] += 1

  return { total: agents.length, counts }
}

export const sameAgents = (a: readonly SeenAgent[], b: readonly SeenAgent[]) =>
  a.length === b.length &&
  a.every((agent, i) => agent.id === b[i]?.id && agent.status === b[i]?.status)

export const headline = (total: number) =>
  total === 1 ? '1 subagente' : `${total} subagentes`

export const altText = (summary: Summary) =>
  [headline(summary.total)]
    .concat(shown(summary).map(group => label(group, summary.counts[group])))
    .join(', ')
