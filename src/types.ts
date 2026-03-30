/**
 * Shared type definitions for the Toolforest OpenClaw plugin.
 */

/** Resolved plugin configuration. */
export interface ToolforestPluginConfig {
  apiKey: string;
  remoteUrl: string;
}

/** Result from executing a tool via the MCP server. */
export interface ToolExecutionResult {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>;
  isError?: boolean;
}

/** Logger interface (subset of PluginApi.logger). */
export interface Logger {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
  debug(msg: string): void;
}

/** Prompt state for the before_prompt_build hook. */
export type PromptState =
  | { status: "error"; message: string }
  | { status: "ready" };
