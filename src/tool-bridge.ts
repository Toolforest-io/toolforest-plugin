/**
 * Bridge the 4 Toolforest meta-tools into OpenClaw AnyAgentTool format.
 *
 * Instead of bridging 100+ individual tools, we expose only:
 *   1. list_toolkits — see what services are connected
 *   2. list_toolkit_tools — get tools for a specific toolkit
 *   3. list_additional_toolkits — check what else is available
 *   4. execute_tool — run any tool by name with arguments
 */

import type { ToolforestClient } from "./client.js";

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
 * Build the 4 meta-tools that proxy to the remote Toolforest MCP server.
 */
export function bridgeMetaTools(client: ToolforestClient): BridgedTool[] {
  return [
    {
      name: "toolforest_list_toolkits",
      label: "Toolforest: List Toolkits",
      description:
        "List all currently connected Toolforest toolkits (services). " +
        "Call this first to discover what is available.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      execute: async () => {
        const result = await client.listToolkits();
        return {
          content: result.content,
          details: { metaTool: "list_toolkits", ...(result.isError ? { status: "error" } : {}) },
        };
      },
    },

    {
      name: "toolforest_list_toolkit_tools",
      label: "Toolforest: List Toolkit Tools",
      description:
        "List available tools for a specific connected toolkit. " +
        "Call list_toolkits first to get toolkit names, then call this with the toolkit name.",
      parameters: {
        type: "object",
        properties: {
          toolkit: {
            type: "string",
            description: "Name of the toolkit to list tools for (e.g. 'github', 'google_sheets').",
          },
        },
        required: ["toolkit"],
        additionalProperties: false,
      },
      execute: async (_toolCallId: string, params: Record<string, unknown>) => {
        const toolkit = params.toolkit as string;
        const result = await client.listToolkitTools(toolkit);
        return {
          content: result.content,
          details: { metaTool: "list_toolkit_tools", toolkit, ...(result.isError ? { status: "error" } : {}) },
        };
      },
    },

    {
      name: "toolforest_list_additional_toolkits",
      label: "Toolforest: List Additional Toolkits",
      description:
        "List toolkits that are available on Toolforest but not yet connected by the user. " +
        "Use this when the user asks for a service that is not in the connected toolkits list.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      execute: async () => {
        const result = await client.listAdditionalToolkits();
        return {
          content: result.content,
          details: { metaTool: "list_additional_toolkits", ...(result.isError ? { status: "error" } : {}) },
        };
      },
    },

    {
      name: "toolforest_execute_tool",
      label: "Toolforest: Execute Tool",
      description:
        "Execute a Toolforest tool by name. " +
        "You MUST call list_toolkits and list_toolkit_tools first to discover the correct tool name and its required arguments.",
      parameters: {
        type: "object",
        properties: {
          tool_name: {
            type: "string",
            description:
              "The full tool name as returned by list_toolkit_tools (e.g. 'github-list_repos').",
          },
          args: {
            type: "object",
            description:
              "Arguments object matching the tool's schema from list_toolkit_tools.",
            additionalProperties: true,
          },
        },
        required: ["tool_name", "args"],
        additionalProperties: false,
      },
      execute: async (_toolCallId: string, params: Record<string, unknown>) => {
        const toolName = params.tool_name as string;
        const args = (params.args as Record<string, unknown>) ?? {};
        const result = await client.executeTool(toolName, args);
        return {
          content: result.content,
          details: {
            metaTool: "execute_tool",
            toolforestTool: toolName,
            ...(result.isError ? { status: "error" } : {}),
          },
        };
      },
    },
  ];
}
