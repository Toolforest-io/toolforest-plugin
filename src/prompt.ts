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
    .map((t) => `  - ${t.name}: ${t.description}`)
    .join("\n");

  const toolkitSection = state.toolkits.length > 0
    ? `\nConnected toolkits:\n${toolkitLines}\n`
    : "\nCall toolforest_list_toolkits to see what services are connected.\n";

  return `<toolforest>
You have Toolforest tools available. The server runs in compact mode —
list_toolkit_tools returns only names and short descriptions, so you must
fetch full schemas before executing. Use this flow:
1. Call toolforest_list_toolkits to see what services are connected.
2. Call toolforest_list_toolkit_tools(toolkit) to get the tool list for the relevant service. Returns name + description only, no schemas.
3. Call toolforest_get_tool_schemas(tools) with the specific tool names you want. Returns the full inputSchema for each.
4. Call toolforest_execute_tool with tool_name and args constructed from the fetched schema.

If a toolkit is missing, call toolforest_list_additional_toolkits to check availability,
then tell the user to connect it at www.toolforest.io.
${toolkitSection}
Do NOT fabricate tool names. Do NOT guess argument names — always fetch the schema first.
If native tools are not working, use the /toolforest-mcp skill for curl-based fallback access.
</toolforest>`;
}
