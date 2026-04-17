/**
 * Bridge the 5 Toolforest meta-tools into OpenClaw AnyAgentTool format.
 *
 * The Toolforest MCP server runs in compact mode: list_toolkit_tools returns
 * tool names + short descriptions only (no input schemas). Agents must call
 * get_tool_schemas for the specific tools they want to use before invoking
 * execute_tool. We expose:
 *   1. list_toolkits           — see what services are connected
 *   2. list_toolkit_tools      — get compact tool list for a toolkit (no schemas)
 *   3. get_tool_schemas        — fetch full input schemas for specific tools
 *   4. list_additional_toolkits — check what else is available but not connected
 *   5. execute_tool            — run any tool by name with arguments
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
 * Build the 5 meta-tools that proxy to the remote Toolforest MCP server.
 */
export function bridgeMetaTools(client: ToolforestClient): BridgedTool[] {
  return [
    {
      name: "toolforest_list_toolkits",
      label: "Toolforest: List Toolkits",
      description:
        "List all connected Toolforest toolkits with their names and descriptions. " +
        "Call this first when the user asks about a connected service or when you are unsure " +
        "which toolkit handles a task. Do NOT guess toolkit names from pretrained knowledge. " +
        "Returns: array of { name, description } for each connected toolkit. " +
        "After calling: if the relevant toolkit is in the list, call toolforest_list_toolkit_tools " +
        "with that toolkit name to get its available tools before executing anything. " +
        "If the needed toolkit is missing, call toolforest_list_additional_toolkits to check " +
        "availability, then direct the user to www.toolforest.io to connect it.",
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
        "List available tools for a specific Toolforest toolkit. Returns " +
        "`{name, description, kind}` for each tool — descriptions only, no " +
        "input schemas. Call this after toolforest_list_toolkits confirms the " +
        "toolkit is connected. After calling: pick the tools you need and call " +
        "toolforest_get_tool_schemas with their names to fetch the full input " +
        "schemas, then call toolforest_execute_tool. Do NOT call execute_tool " +
        "with a tool name you have not confirmed exists.",
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
      name: "toolforest_get_tool_schemas",
      label: "Toolforest: Get Tool Schemas",
      description:
        "Fetch full input schemas for specific Toolforest tools. Use this " +
        "after toolforest_list_toolkit_tools to get the exact parameter " +
        "definitions before calling toolforest_execute_tool. Returns " +
        "`{name, description, inputSchema}` for each requested tool. " +
        "Do NOT guess parameters — always fetch the schema first.",
      parameters: {
        type: "object",
        properties: {
          tools: {
            type: "array",
            description:
              "Tool names to fetch schemas for (e.g. ['github-list_repos', 'github-get_repo']).",
            items: { type: "string" },
            minItems: 1,
          },
        },
        required: ["tools"],
        additionalProperties: false,
      },
      execute: async (_toolCallId: string, params: Record<string, unknown>) => {
        const tools = (params.tools as string[]) ?? [];
        const result = await client.getToolSchemas(tools);
        return {
          content: result.content,
          details: {
            metaTool: "get_tool_schemas",
            toolCount: tools.length,
            ...(result.isError ? { status: "error" } : {}),
          },
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
        "Execute a Toolforest tool by name. You MUST call " +
        "toolforest_list_toolkits, toolforest_list_toolkit_tools, and " +
        "toolforest_get_tool_schemas first so the tool name is confirmed and " +
        "the args match the schema. Do not guess parameter names.",
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
              "Arguments object matching the tool's inputSchema (obtained via get_tool_schemas).",
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
