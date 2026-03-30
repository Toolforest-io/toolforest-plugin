/**
 * Bridge Toolforest tool descriptors into OpenClaw AnyAgentTool format.
 *
 * Follows the pattern from openclaw/src/agents/pi-bundle-mcp-tools.ts:
 * - parameters: raw JSON Schema (TypeBox compiles to JSON Schema at runtime)
 * - execute: forward to remote server, return { content, details }
 */

import type { ToolforestClient } from "./client.js";
import type { ToolforestToolDescriptor } from "./types.js";

/** The AnyAgentTool shape OpenClaw expects (from pi-agent-core). */
export interface BridgedTool {
  name: string;
  label: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (
    toolCallId: string,
    params: Record<string, unknown>,
  ) => Promise<{
    content: Array<{ type: string; text?: string; [key: string]: unknown }>;
    details?: Record<string, unknown>;
  }>;
}

/**
 * Normalize a Toolforest tool name for OpenClaw.
 * "github-list_repos" → "toolforest_github_list_repos"
 */
function normalizeName(toolforestName: string): string {
  return `toolforest_${toolforestName.replace(/-/g, "_")}`;
}

/**
 * Generate a human-readable label from toolkit and tool names.
 * "github-list_repos" → "GitHub: List Repos"
 */
function generateLabel(toolforestName: string): string {
  const parts = toolforestName.split("-");
  const toolkit = parts[0]
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const action = (parts.slice(1).join("-") || parts[0])
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return `${toolkit}: ${action}`;
}

/**
 * Convert a Toolforest tool descriptor into an OpenClaw-compatible tool object.
 */
export function bridgeTool(
  descriptor: ToolforestToolDescriptor,
  client: ToolforestClient,
): BridgedTool {
  const originalName = descriptor.name;

  return {
    name: normalizeName(originalName),
    label: generateLabel(originalName),
    description: descriptor.summary || `Toolforest tool: ${originalName}`,
    parameters: descriptor.schema,
    execute: async (_toolCallId: string, params: Record<string, unknown>) => {
      const result = await client.executeTool(originalName, params);
      return {
        content: result.content,
        details: {
          toolforestTool: originalName,
          ...(result.isError ? { status: "error" } : {}),
        },
      };
    },
  };
}

/**
 * Bridge all Toolforest tool descriptors into OpenClaw tools.
 */
export function bridgeAllTools(
  descriptors: ToolforestToolDescriptor[],
  client: ToolforestClient,
): BridgedTool[] {
  return descriptors.map((d) => bridgeTool(d, client));
}
