# usage-band

A Claude Code mod that shows your usage above the prompt: the 5-hour and 7-day limits, the context window, the session cost, RAM, and the session's subagents grouped by state. `/consumo` opens a full panel with the same figures.

## Install

```
/plugin marketplace add jesusgpo/usage-band
/plugin install usage-band@usage-band
```

## What it shows

- **Ventana 5 h / 7 d:** percentage used and time until the window resets.
- **Contexto:** percentage of the context window in use.
- **Coste sesión:** what the session has cost so far.
- **RAM:** memory in use (Linux, Windows and macOS).
- **Subagentes:** how many the session has, and how many are working, waiting, done or failed. Shown only when there are any.

## Development

The tests run with `claude plugin test .`, and the manifest is checked with `claude plugin validate .`.

## License

MIT
