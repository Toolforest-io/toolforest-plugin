/**
 * @toolforest/openclaw-plugin
 *
 * OpenClaw plugin that connects to the Toolforest MCP server and registers
 * 4 meta-tools for on-demand tool discovery and execution:
 *   - list_toolkits
 *   - list_toolkit_tools
 *   - list_additional_toolkits
 *   - execute_tool
 */

import { ToolforestClient } from "./src/client.js";
import { resolveConfig } from "./src/config.js";
import { buildBlock } from "./src/prompt.js";
import { bridgeMetaTools } from "./src/tool-bridge.js";
import type { PromptState } from "./src/types.js";

const pluginDefinition = {
  id: "toolforest",
  name: "Toolforest",
  description:
    "Connect to Toolforest via 4 meta-tools for on-demand tool discovery and execution.",

  async register(api: PluginApi): Promise<void> {
    const cfg = resolveConfig(api.pluginConfig as Record<string, unknown> | undefined);

    // Mutable state read by the hook on every agent turn
    let promptState: PromptState = {
      status: "error",
      message: "Not configured",
    };

    // Register hook FIRST — before any async work.
    // This ensures the agent always gets prompt guidance, even on error.
    if (typeof api.on === "function") {
      api.on("before_prompt_build", () => {
        return { prependContext: buildBlock(promptState) };
      });
    }

    if (!cfg.apiKey) {
      promptState = {
        status: "error",
        message:
          "No API key configured. Set plugins.entries.toolforest.config.apiKey " +
          "or TOOLFOREST_API_KEY env var.",
      };
      api.logger.warn("toolforest: " + promptState.message);
      return;
    }

    const client = new ToolforestClient();

    try {
      await client.connect(cfg.remoteUrl, cfg.apiKey);
      api.logger.info(`toolforest: Connected to ${cfg.remoteUrl}`);
    } catch (err) {
      promptState = {
        status: "error",
        message: `Failed to connect to ${cfg.remoteUrl}: ${err instanceof Error ? err.message : String(err)}`,
      };
      api.logger.warn("toolforest: " + promptState.message);
      return;
    }

    // Register only the 4 meta-tools
    const metaTools = bridgeMetaTools(client);
    for (const tool of metaTools) {
      api.registerTool(tool as never, { name: tool.name });
    }

    // Fetch connected toolkits once for prompt injection
    let toolkits: Array<{ name: string; description: string }> = [];
    try {
      const result = await client.listToolkits();
      const text = result.content?.find((c) => c.type === "text")?.text;
      if (text) {
        toolkits = JSON.parse(text);
      }
    } catch (err) {
      api.logger.warn(`toolforest: Failed to fetch toolkit list for prompt: ${err}`);
    }

    promptState = { status: "ready", toolkits };

    api.logger.info(
      `toolforest: Registered ${metaTools.length} meta-tools (list_toolkits, list_toolkit_tools, list_additional_toolkits, execute_tool)`,
    );
  },
};

// Minimal type for the OpenClaw plugin API (avoids hard import of openclaw).
interface PluginApi {
  pluginConfig?: unknown;
  logger: {
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
    debug(msg: string): void;
  };
  registerTool(tool: never, opts?: { name?: string }): void;
  on?(event: string, handler: (...args: unknown[]) => unknown): void;
}

export default pluginDefinition;
