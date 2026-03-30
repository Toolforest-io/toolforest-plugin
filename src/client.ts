/**
 * Toolforest MCP client — connects to the remote Toolforest MCP server,
 * discovers all connected tools, and forwards execution requests.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type {
  ToolforestToolDescriptor,
  ToolforestToolkit,
  ToolExecutionResult,
} from "./types.js";
import { validateArgs } from "./validate.js";

export class ToolforestClient {
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;

  /** Cached tool schemas for client-side validation. */
  private schemaCache = new Map<string, Record<string, unknown>>();

  async connect(url: string, apiKey: string): Promise<void> {
    this.transport = new StreamableHTTPClientTransport(new URL(url), {
      requestInit: {
        headers: { Authorization: `Bearer ${apiKey}` },
      },
    });

    this.client = new Client(
      { name: "@toolforest/openclaw-plugin", version: "0.1.0" },
      { capabilities: {} },
    );

    await this.client.connect(this.transport);
  }

  /**
   * Discover all connected tools by calling the router meta-tools.
   * 1. list_tools() → get connected toolkit names
   * 2. list_tools(toolkit=X) for each → get tool descriptors with schemas
   */
  async discoverTools(): Promise<{
    toolkits: ToolforestToolkit[];
    tools: ToolforestToolDescriptor[];
  }> {
    if (!this.client) throw new Error("Not connected");

    // Step 1: Get connected toolkits
    const toolkitResult = await this.client.callTool({
      name: "list_tools",
      arguments: {},
    });
    const toolkits = this.parseJsonResponse<ToolforestToolkit[]>(toolkitResult) ?? [];

    // Step 2: Get tools for each toolkit (parallel)
    const allTools: ToolforestToolDescriptor[] = [];
    const results = await Promise.allSettled(
      toolkits.map(async (toolkit) => {
        const result = await this.client!.callTool({
          name: "list_tools",
          arguments: { toolkit: toolkit.name },
        });
        return this.parseJsonResponse<ToolforestToolDescriptor[]>(result) ?? [];
      }),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        for (const tool of result.value) {
          allTools.push(tool);
          // Cache schema for validation
          if (tool.schema) {
            this.schemaCache.set(tool.name, tool.schema);
          }
        }
      }
    }

    return { toolkits, tools: allTools };
  }

  /**
   * Execute a tool on the remote server via the execute_tool meta-tool.
   * Validates args locally first if schema is cached.
   */
  async executeTool(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<ToolExecutionResult> {
    if (!this.client) throw new Error("Not connected");

    // Client-side validation
    const schema = this.schemaCache.get(toolName);
    if (schema) {
      const error = validateArgs(args, schema);
      if (error) {
        return {
          content: [{ type: "text", text: `Validation error: ${error}` }],
          isError: true,
        };
      }
    }

    const result = await this.client.callTool({
      name: "execute_tool",
      arguments: { tool_name: toolName, args },
    });

    return {
      content: (result.content ?? []) as ToolExecutionResult["content"],
      isError: result.isError as boolean | undefined,
    };
  }

  /**
   * Lightweight fetch of connected toolkit metadata only (no tool schemas).
   * Used by the cache for background refresh.
   */
  async listToolkits(): Promise<ToolforestToolkit[]> {
    if (!this.client) throw new Error("Not connected");
    const result = await this.client.callTool({ name: "list_tools", arguments: {} });
    return this.parseJsonResponse<ToolforestToolkit[]>(result) ?? [];
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

  private parseJsonResponse<T>(result: Awaited<ReturnType<Client["callTool"]>>): T | null {
    const content = result.content as Array<{ type: string; text?: string }> | undefined;
    const textBlock = content?.find((c) => c.type === "text" && c.text);
    if (!textBlock?.text) return null;
    try {
      return JSON.parse(textBlock.text) as T;
    } catch {
      return null;
    }
  }
}
