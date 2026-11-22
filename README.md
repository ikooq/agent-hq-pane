# Agent HQ pane

A pane beside the chat that shows your local [Agent HQ](https://github.com/ikooq/agent-hq) office at a glance: which Claude Code and Codex agents are waiting on you, which are stuck, and which are working, with a link to open the full 3D office.

It reads `http://127.0.0.1:7777/state` from the Agent HQ server every 3 seconds. Nothing leaves your computer. If the server is not running, the pane says so; start it with `agent-hq start`.

Open the pane again any time with `/hq`.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install agent-hq --marketplace ikooq/agent-hq-pane
```

Answer `y` to add the marketplace, then press Enter to pick the user scope.

From a shell:

```
claude plugin install agent-hq --marketplace ikooq/agent-hq-pane
```

In the Claude desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `ikooq/agent-hq-pane`, then Add plugin.

The pane needs the Agent HQ server running on the same computer.

## License

MIT, see [LICENSE](LICENSE).
