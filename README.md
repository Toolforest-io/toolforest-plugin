# @toolforest/toolforest-plugin

OpenClaw plugin that connects your [Toolforest](https://www.toolforest.io) toolkits as native agent tools. Supports tools across Google Workspace, GitHub, prediction markets, health trackers, and more.

## Installation

### 1. Install the plugin

```bash
openclaw plugins install @toolforest/toolforest-plugin
```

### 2. Set your API key

```bash
openclaw config set plugins.entries.toolforest.config.apiKey "tfo_your_key_here"
```

Get your API key at [app.toolforest.io](https://app.toolforest.io).

### 3. Make tools available on all tool profiles

```bash
existing=$(openclaw config get tools.alsoAllow 2>/dev/null || echo '[]')
openclaw config set tools.alsoAllow "$(node -e "const v=JSON.parse('$existing');
if(!v.includes('toolforest'))v.push('toolforest'); console.log(JSON.stringify(v))")"
```

> **Note:** `tools.alsoAllow` ensures Toolforest tools remain available when using non-full
> tool profiles such as `coding`, `minimal`, and `messaging`. The command above safely appends
> `toolforest` to any existing entries — unlike `openclaw config set tools.alsoAllow '["toolforest"]'`
> which would overwrite the entire list and remove any other plugins you have configured.

### 4. Restart the gateway

```bash
openclaw gateway restart
```

### 5. Verify

```bash
openclaw config get tools.alsoAllow
openclaw plugins inspect toolforest
```

Or set the `TOOLFOREST_API_KEY` environment variable as an alternative to step 2.

### Options

| Key | Description | Default |
|-----|-------------|---------|
| `apiKey` | Toolforest API key (`tfo_...`) | `TOOLFOREST_API_KEY` env var |
| `remoteUrl` | Override the MCP endpoint URL | `https://mcp.toolforest.io/mcp` |

## How it works

1. Connects to the Toolforest MCP server using your API key
2. Discovers all connected toolkits and their tools
3. Registers each tool as a native OpenClaw agent tool (prefixed with `toolforest_`)
4. Injects prompt guidance so the agent knows which toolkits are available
5. Refreshes the toolkit list in the background every 5 minutes

If the plugin fails to connect, the agent will surface a helpful error message with setup instructions rather than silently failing.

## Features

- **Native tool registration** — Toolforest tools appear as first-class OpenClaw tools
- **Dynamic prompt guidance** — agent sees which toolkits are connected, updated every 5 minutes
- **Error state guidance** — if connection fails, the agent guides the user through setup
- **Fallback skill** — `/toolforest-mcp` skill provides curl-based MCP access when native tools are unavailable
- **Client-side validation** — validates tool arguments locally before sending to the server

## Fallback skill

If the native tools aren't working, use the built-in fallback skill:

```
/toolforest-mcp
```

This gives the agent curl-based instructions to call the Toolforest MCP server directly.

## Requirements

- OpenClaw >= 2026.3.0
- Node.js >= 20
- A Toolforest account with at least one connected toolkit

## License

MIT
