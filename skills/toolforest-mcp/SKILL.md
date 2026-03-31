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

Toolforest uses **meta-tools** exposed via the standard MCP `tools/call` method. Do NOT use `tools/list` to discover toolkit tools — that only returns the meta-tools (`list_toolkits`, `list_toolkit_tools`, `list_additional_toolkits`, `get_tool_schema`, `execute_tool`).

Instead, use the meta-tools in this order:

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

Returns tool descriptors with `name`, `summary`, `kind`, and `schema` for each tool in that toolkit.

## Step 3: Get a tool's parameter schema (optional)

```bash
curl -s -X POST https://mcp.toolforest.io/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer YOUR_KEY" \
  -d '{"jsonrpc":"2.0","id":"1","method":"tools/call","params":{"name":"get_tool_schema","arguments":{"tool_names":["github-list_repos"]}}}'
```

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
