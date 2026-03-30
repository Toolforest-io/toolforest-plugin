/**
 * Toolforest MCP client — connects to the remote Toolforest MCP server
 * and forwards meta-tool calls (list_toolkits, list_toolkit_tools,
 * list_additional_toolkits, execute_tool).
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

  /** Call the remote list_tools() with no arguments to get connected toolkits. */
  async listToolkits(): Promise<ToolExecutionResult> {
    if (!this.client) throw new Error("Not connected");
    const result = await this.client.callTool({
      name: "list_tools",
      arguments: {},
    });
    return {
      content: (result.content ?? []) as ToolExecutionResult["content"],
      isError: result.isError as boolean | undefined,
    };
  }

  /** Call the remote list_tools(toolkit=X) to get tools for a specific toolkit. */
  async listToolkitTools(toolkit: string): Promise<ToolExecutionResult> {
    if (!this.client) throw new Error("Not connected");
    const result = await this.client.callTool({
      name: "list_tools",
      arguments: { toolkit },
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
