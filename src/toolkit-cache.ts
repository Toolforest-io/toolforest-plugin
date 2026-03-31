/**
 * Caches the connected toolkit list with a TTL.
 * Never blocks — always returns current cache, refreshes in the background if stale.
 */

import type { ToolforestClient } from "./client.js";
import type { CachedToolkit, Logger } from "./types.js";

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class ToolkitCache {
  private toolkits: CachedToolkit[] = [];
  private fetchedAt = 0;
  private refreshing = false;
  private ttlMs: number;
  private logger: Logger | null;

  constructor(ttlMs = DEFAULT_TTL_MS, logger: Logger | null = null) {
    this.ttlMs = ttlMs;
    this.logger = logger;
  }

  /**
   * Return cached toolkits immediately (never blocks).
   * If the cache is stale, kicks off a background refresh.
   */
  getToolkits(client: ToolforestClient): CachedToolkit[] {
    if (Date.now() - this.fetchedAt >= this.ttlMs && !this.refreshing) {
      this.refreshing = true;
      this._refresh(client).finally(() => {
        this.refreshing = false;
      });
    }
    return this.toolkits;
  }

  /** Fetch toolkit list from remote and update cache. */
  async _refresh(client: ToolforestClient): Promise<void> {
    try {
      const result = await client.listToolkits();
      const text = result.content?.find((c) => c.type === "text")?.text;
      if (text) {
        this.toolkits = JSON.parse(text);
        this.fetchedAt = Date.now();
      }
    } catch (err) {
      this.logger?.warn(`toolforest: Failed to refresh toolkit cache: ${err}`);
    }
  }
}
