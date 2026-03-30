/**
 * Shared type definitions for the Toolforest OpenClaw plugin.
 */

/** Tool descriptor returned by Toolforest list_tools(toolkit=X). */
export interface ToolforestToolDescriptor {
  name: string;
  summary: string;
  kind: string;
  schema: Record<string, unknown>;
}

/** Toolkit descriptor returned by Toolforest list_tools() (no args). */
export interface ToolforestToolkit {
  name: string;
  description: string;
}

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
  | { status: "ready"; toolkits: ToolforestToolkit[]; toolCount: number };
