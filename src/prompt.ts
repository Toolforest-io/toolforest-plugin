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

  return `<toolforest>
You have Toolforest tools available. Use this flow:
1. Call list_toolkit_tools(toolkit) to get tools for the relevant service.
2. Call execute_tool to run the selected tool.

Connected toolkits:
${toolkitLines}

Do NOT fabricate tool names. Do NOT skip the discovery steps.
If a toolkit is missing, call list_additional_toolkits to check availability,
then tell the user to connect it at www.toolforest.io.
</toolforest>`;
}
