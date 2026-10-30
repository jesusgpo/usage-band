export type UsageWindow = {
  percentUsed: number
  resetsAt: string | null
}

export type RamFigures = {
  usedGiB: number
  totalGiB: number
}

export type ContextFigures = {
  percent: number | null
  tokens: number | null
  window: number
}

export type Usage = {
  fiveHour: UsageWindow | null
  sevenDay: UsageWindow | null
  ram: RamFigures | null
  cost: number | null
  context: ContextFigures | null
}

export type AgentStatus =
  | 'pending'
  | 'running'
  | 'waiting'
  | 'idle'
  | 'completed'
  | 'failed'
  | 'killed'

export type SeenAgent = {
  id: string
  status: AgentStatus
}

declare module 'claude-code' {
  interface PluginState {
    'usage-band': { usage: Usage | null; agents: SeenAgent[] }
  }
}
