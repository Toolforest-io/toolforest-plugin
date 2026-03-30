/**
 * Resolve Toolforest plugin configuration from plugin config, env vars, and defaults.
 */

import type { ToolforestPluginConfig } from "./types.js";

const DEFAULT_URL = "https://mcp.toolforest.io/mcp";

/**
 * Resolve the Toolforest connection config.
 * Priority: pluginConfig > env vars > defaults.
 */
export function resolveConfig(
  pluginConfig: Record<string, unknown> | undefined,
): ToolforestPluginConfig {
  const cfg = pluginConfig ?? {};

  const apiKey =
    (cfg.apiKey as string | undefined) ??
    process.env.TOOLFOREST_API_KEY ??
    "";

  const remoteUrl =
    (cfg.remoteUrl as string | undefined) ??
    process.env.TOOLFOREST_URL ??
    DEFAULT_URL;

  return { apiKey, remoteUrl };
}
