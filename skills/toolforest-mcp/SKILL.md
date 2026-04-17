---
name: toolforest-mcp
description: Use the Toolforest MCP server directly to call connected toolkit tools when the plugin tools are unavailable or not working.
metadata:
  { "openclaw": { "emoji": "🌲", "homepage": "https://www.toolforest.io", "requires": { "bins": ["curl"] } } }
---

# Toolforest MCP Fallback

Use this when Toolforest native tools (prefixed `toolforest_`) are not registered or not working.

## API Key

Check the openclaw config:
```bash
grep -A5 '"toolforest"' ~/.openclaw/openclaw.json
```
Key is at `plugins.entries.toolforest.config.apiKey`. If missing, direct user to **www.toolforest.io**.

## MCP Server

```
https://mcp.toolforest.io/mcp
Authorization: Bearer <apiKey>
```

## Important: How Toolforest discovery works

Toolforest exposes **5 meta-tools** via the standard MCP `tools/call` method. Do NOT use `tools/list` to discover toolkit tools — that only returns the 5 meta-tools: `list_toolkits`, `list_toolkit_tools`, `get_tool_schemas`, `list_additional_toolkits`, `execute_tool`.

The server runs in **compact mode**: `list_toolkit_tools` returns tool names + descriptions only (no schemas). You MUST call `get_tool_schemas` for the tools you want to use before `execute_tool` — do not guess parameter names.

Use the meta-tools in this order:

## Step 1: List connected toolkits

```bash
curl -s -X POST https://mcp.toolforest.io/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer YOUR_KEY" \
  -d '{"jsonrpc":"2.0","id":"1","method":"tools/call","params":{"name":"list_toolkits","arguments":{}}}'
```

Returns an array of toolkit objects with `name` and `description` (e.g. `github`, `google_sheets`, `gmail`).

## Step 2: List tools for a specific toolkit

```bash
curl -s -X POST https://mcp.toolforest.io/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer YOUR_KEY" \
  -d '{"jsonrpc":"2.0","id":"1","method":"tools/call","params":{"name":"list_toolkit_tools","arguments":{"toolkit":"github"}}}'
```

Returns `{name, description, kind}` for each tool — **no `inputSchema`** (it's compact mode). Scan the list and pick the tool names you actually plan to call.

## Step 3: Fetch schemas for the tools you want to use (required)

```bash
curl -s -X POST https://mcp.toolforest.io/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer YOUR_KEY" \
  -d '{"jsonrpc":"2.0","id":"1","method":"tools/call","params":{"name":"get_tool_schemas","arguments":{"tools":["github-list_repos","github-get_repo"]}}}'
```

Returns `{name, description, inputSchema}` for each requested tool. Use `inputSchema` to construct `args` for Step 4.

## Step 4: Execute a tool

```bash
curl -s -X POST https://mcp.toolforest.io/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer YOUR_KEY" \
  -d '{
    "jsonrpc": "2.0", "id": "1", "method": "tools/call",
    "params": { "name": "execute_tool", "arguments": { "tool_name": "github-list_repos", "args": {"owner": "example"} } }
  }'
```

Tool names follow the pattern `{toolkit}-{action}` (e.g. `github-list_repos`, `google_sheets-get_values`).

Responses may be SSE (`data: {...}`) or plain JSON — handle both.
