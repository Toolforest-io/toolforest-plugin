/**
 * @toolforest/openclaw-plugin
 *
 * OpenClaw plugin that connects to the Toolforest MCP server and registers
 * all connected tools as native agent tools. Follows the same pattern as
 * openclaw/src/agents/pi-bundle-mcp-tools.ts for MCP-to-AgentTool bridging.
 */

import { ToolforestClient } from "./src/client.js";
import { resolveConfig } from "./src/config.js";
import { buildBlock } from "./src/prompt.js";
import { bridgeAllTools } from "./src/tool-bridge.js";
import { ToolkitCache } from "./src/toolkit-cache.js";
import type { PromptState } from "./src/types.js";

const pluginDefinition = {
  id: "toolforest",
  name: "Toolforest",
  description:
    "Connect all your Toolforest toolkits as native OpenClaw agent tools.",

  async register(api: PluginApi): Promise<void> {
    const cfg = resolveConfig(api.pluginConfig as Record<string, unknown> | undefined);

    // Mutable state read by the hook on every agent turn
    let promptState: PromptState = {
      status: "error",
      message: "Not configured",
    };
    let cache: ToolkitCache | null = null;
    let toolCount = 0;

    // Register hook FIRST — before any async work.
    // This ensures the agent always gets prompt guidance, even on error.
    if (typeof api.on === "function") {
      api.on("before_prompt_build", () => {
        if (cache) {
          return {
            prependContext: buildBlock({
              status: "ready",
              toolkits: cache.getToolkits(),
              toolCount,
            }),
          };
        }
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

    try {
      const { toolkits, tools } = await client.discoverTools();

      const bridged = bridgeAllTools(tools, client);
      toolCount = bridged.length;

      for (const tool of bridged) {
        api.registerTool(tool as never, { name: tool.name });
      }

      cache = new ToolkitCache(client, api.logger);
      cache.seed(toolkits);

      api.logger.info(
        `toolforest: Registered ${toolCount} tools from ${toolkits.length} toolkits`,
      );
    } catch (err) {
      promptState = {
        status: "error",
        message: `Failed to discover tools: ${err instanceof Error ? err.message : String(err)}`,
      };
      api.logger.warn("toolforest: " + promptState.message);
    }
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
