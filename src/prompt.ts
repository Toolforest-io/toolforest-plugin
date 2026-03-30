import type { PromptState } from "./types.js";

/**
 * Build the <toolforest> prompt block based on current plugin state.
 * Injected via the before_prompt_build hook on every agent turn.
 */
export function buildBlock(state: PromptState): string {
  if (state.status === "error") {
    return `<toolforest>
Toolforest failed to connect.${state.message ? ` Error: ${state.message}` : ""}

Tell the user:
"Toolforest isn't connected. To fix:
1. Get your API key from www.toolforest.io
2. Run: openclaw config set plugins.entries.toolforest.config.apiKey \\"your_key\\"
3. Run: openclaw gateway restart"

Do NOT fabricate tool names.
</toolforest>`;
  }

  const toolkitLines = state.toolkits
    .map((t) => `  - ${t.name}: ${t.description ?? "(no description)"}`)
    .join("\n");

  return `<toolforest>
You have ${state.toolCount} Toolforest tools available, prefixed with "toolforest_".

Connected toolkits:
${toolkitLines}

Tool naming: tools follow the pattern toolforest_{toolkit}_{action} (e.g. toolforest_github_list_repos, toolforest_google_sheets_get_values).

Rules:
- Use Toolforest tools for tasks involving the connected services above.
- Call tools directly by name — no discovery step needed.
- Do NOT fabricate tool names not listed above.
- Do NOT use pretrained knowledge about Toolforest APIs.
- If a tool returns an auth error, direct the user to www.toolforest.io to reconnect.
- If native tools are not working, use the /toolforest-mcp skill for curl-based fallback access.
</toolforest>`;
}
