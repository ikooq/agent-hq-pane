// What the pane keeps: a short summary of the local Agent HQ server's /state, refreshed every few seconds.
export type Agent = { label: string; detail: string }
export type Office = {
  isUp: boolean
  checkedAt: number
  counts: { working: number; waiting: number; stuck: number; resting: number }
  waiting: Agent[]
  stuck: Agent[]
  working: Agent[]
  tokens: string
}

declare module 'claude-code' {
  interface PluginState {
    'agent-hq': { office: Shaped<Office | null> }
  }
}
