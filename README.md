# usage-band

A Claude Code mod that shows your usage above the prompt: the 5-hour and 7-day limits, the context window, the session cost and RAM. `/consumo` opens a full panel with the same figures.

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

## Development

The manifest is checked with `claude plugin validate .`.

## License

MIT
