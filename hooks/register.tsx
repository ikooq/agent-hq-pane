import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Agent, Office } from '../types'

// The local Agent HQ server (~/.agent-hq). It binds 127.0.0.1 only, so this never leaves the machine.
const HQ = 'http://127.0.0.1:7777'
const PANE = 'agent-hq'
const EVERY_MS = 3000
const office = atom({ plugin: 'agent-hq', key: 'office' } as const, null, { shape: 'office-1' })

type Robot = { label: string; status: string; step?: string; task?: string | null; waitingMsg?: string | null }
type State = { bots: { robots: Robot[] }[]; totals?: { total?: number } }

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)
const tokens = (n: number) => (n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(n))

function summarize(s: State): Office {
  const robots = s.bots.flatMap(b => b.robots)
  const pick = (st: string[], detail: (r: Robot) => string): Agent[] =>
    robots.filter(r => st.includes(r.status)).map(r => ({ label: r.label, detail: clip(detail(r) || '', 60) }))
  const waiting = pick(['waiting'], r => r.waitingMsg || r.step || '')
  const stuck = pick(['stuck'], r => r.step || '')
  const working = pick(['working', 'running'], r => r.task || r.step || '')
  return {
    isUp: true, checkedAt: Date.now(),
    counts: { working: working.length, waiting: waiting.length, stuck: stuck.length, resting: robots.filter(r => r.status === 'resting').length },
    waiting, stuck, working, tokens: tokens((s.totals && s.totals.total) || 0),
  }
}

// One poll at a time; the module's own variables start over on a reload, so the timer is started once per load.
let ticking = false
let busy = false

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'hq', description: 'Show your Agent HQ office (who is waiting, stuck or working) in a pane' })
    void $.ui.open({ id: PANE, title: 'Agent HQ' })
    if (!ticking) {
      ticking = true
      const poll = async () => {
        if (busy) return
        busy = true
        try {
          const r = await $.http.fetch(`${HQ}/state`)
          const got = r.ok ? summarize(JSON.parse(r.text) as State) : null
          await update($, office, prev => {
            const fresh: Office = got ||{ isUp: false, checkedAt: Date.now(), counts: { working: 0, waiting: 0, stuck: 0, resting: 0 }, waiting: [], stuck: [], working: [], tokens: '0' }
            // keep the old value when nothing a reader sees changed, so the pane does not redraw every 3 s
            const same = prev && JSON.stringify({ ...prev, checkedAt: 0 }) === JSON.stringify({ ...fresh, checkedAt: 0 })
            return same ? prev : fresh
          })
        } catch {
          await update($, office, prev => (prev && !prev.isUp ? prev : { isUp: false, checkedAt: Date.now(), counts: { working: 0, waiting: 0, stuck: 0, resting: 0 }, waiting: [], stuck: [], working: [], tokens: '0' }))
        } finally {
          busy = false
        }
      }
      void poll()
      $.clock.every(EVERY_MS, () => void poll())
    }
    return next(e)
  })

  on('command.run', { command: 'hq' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Agent HQ' })
    return { text: 'Agent HQ pane opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Link } = $.ui.resolve(e)
    const o = await read($, office)
    if (!o) return <Text dimColor>Looking for Agent HQ on 127.0.0.1:7777…</Text>
    if (!o.isUp) {
      return (
        <Box flexDirection="column" gap={1}>
          <Text weight="semibold">Agent HQ is not running</Text>
          <Text dimColor>Start it with: agent-hq start</Text>
        </Box>
      )
    }
    const section = (title: string, color: string, list: Agent[], max: number) =>
      list.length === 0 ? null : (
        <Box flexDirection="column">
          <Text color={color} weight="semibold">{title} ({list.length})</Text>
          {list.slice(0, max).map(a => (
            <Text>
              <Text weight="medium">{a.label}</Text>
              <Text dimColor> {a.detail}</Text>
            </Text>
          ))}
          {list.length > max && <Text dimColor>+{list.length - max} more</Text>}
        </Box>
      )
    const c = o.counts
    return (
      <Box flexDirection="column" gap={1}>
        <Text>
          <Text color="#3fae7c">{c.working} working</Text>
          <Text dimColor> · </Text>
          <Text color="#e39a2d">{c.waiting} waiting on you</Text>
          <Text dimColor> · </Text>
          <Text color="#e0565f">{c.stuck} stuck</Text>
          <Text dimColor> · {c.resting} resting · {o.tokens} tokens today</Text>
        </Text>
        {section('Waiting on you', '#e39a2d', o.waiting, 6)}
        {section('Stuck', '#e0565f', o.stuck, 6)}
        {section('Working', '#3fae7c', o.working, 8)}
        {c.working + c.waiting + c.stuck === 0 && <Text dimColor>Nobody is working right now.</Text>}
        <Link href={`${HQ}/`} label="Open the 3D office" />
      </Box>
    )
  })
}
