/**
 * Toolforest MCP client — connects to the remote Toolforest MCP server
 * and forwards the 5 meta-tools exposed in compact mode:
 *   list_toolkits, list_toolkit_tools, get_tool_schemas,
 *   list_additional_toolkits, execute_tool.
 *
 * The server runs in compact mode: list_toolkit_tools returns tool names +
 * short descriptions only (no input schemas). Callers must use
 * get_tool_schemas to fetch the full input schemas before invoking
 * execute_tool.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { ToolExecutionResult } from "./types.js";

export class ToolforestClient {
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;

  async connect(url: string, apiKey: string): Promise<void> {
    this.transport = new StreamableHTTPClientTransport(new URL(url), {
      requestInit: {
        headers: { Authorization: `Bearer ${apiKey}` },
      },
    });

    this.client = new Client(
      { name: "@toolforest/openclaw-plugin", version: "0.2.0" },
      { capabilities: {} },
    );

    await this.client.connect(this.transport);
  }

  /** Call the list_toolkits meta-tool to get connected toolkits. */
  async listToolkits(): Promise<ToolExecutionResult> {
    if (!this.client) throw new Error("Not connected");
    const result = await this.client.callTool({
      name: "list_toolkits",
      arguments: {},
    });
    return {
      content: (result.content ?? []) as ToolExecutionResult["content"],
      isError: result.isError as boolean | undefined,
    };
  }

  /**
   * Call the list_toolkit_tools meta-tool to get tools for a specific toolkit.
   * Returns compact descriptors `{name, description, kind}` — no input schemas.
   * Call getToolSchemas() afterwards to fetch the schemas needed for execute().
   */
  async listToolkitTools(toolkit: string): Promise<ToolExecutionResult> {
    if (!this.client) throw new Error("Not connected");
    const result = await this.client.callTool({
      name: "list_toolkit_tools",
      arguments: { toolkit },
    });
    return {
      content: (result.content ?? []) as ToolExecutionResult["content"],
      isError: result.isError as boolean | undefined,
    };
  }

  /**
   * Call the get_tool_schemas meta-tool to fetch full input schemas for a
   * specific set of tools. Required step between list_toolkit_tools and
   * execute_tool in compact mode.
   */
  async getToolSchemas(tools: string[]): Promise<ToolExecutionResult> {
    if (!this.client) throw new Error("Not connected");
    const result = await this.client.callTool({
      name: "get_tool_schemas",
      arguments: { tools },
    });
    return {
      content: (result.content ?? []) as ToolExecutionResult["content"],
      isError: result.isError as boolean | undefined,
    };
  }

  /** Call the remote list_additional_toolkits to check available (not yet connected) toolkits. */
  async listAdditionalToolkits(): Promise<ToolExecutionResult> {
    if (!this.client) throw new Error("Not connected");
    const result = await this.client.callTool({
      name: "list_additional_toolkits",
      arguments: {},
    });
    return {
      content: (result.content ?? []) as ToolExecutionResult["content"],
      isError: result.isError as boolean | undefined,
    };
  }

  /**
   * Execute a tool on the remote server via the execute_tool meta-tool.
   */
  async executeTool(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<ToolExecutionResult> {
    if (!this.client) throw new Error("Not connected");

    const result = await this.client.callTool({
      name: "execute_tool",
      arguments: { tool_name: toolName, args },
    });

    return {
      content: (result.content ?? []) as ToolExecutionResult["content"],
      isError: result.isError as boolean | undefined,
    };
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
      } catch {
        // Ignore close errors
      }
      this.client = null;
    }
    this.transport = null;
  }
}
