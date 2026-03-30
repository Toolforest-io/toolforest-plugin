import type { ToolforestClient } from "./client.js";
import type { Logger, ToolforestToolkit } from "./types.js";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class ToolkitCache {
  private cachedToolkits: ToolforestToolkit[] = [];
  private cachedAt = 0;
  private fetchPromise: Promise<void> | null = null;

  constructor(
    private client: ToolforestClient,
    private logger: Logger,
  ) {}

  /** Seed with initial data from startup discovery. */
  seed(toolkits: ToolforestToolkit[]): void {
    this.cachedToolkits = toolkits;
    this.cachedAt = Date.now();
  }

  /**
   * Return current cached toolkits. If stale, triggers a background refresh
   * (current turn uses stale data, next turn gets fresh data).
   */
  getToolkits(): ToolforestToolkit[] {
    if (Date.now() - this.cachedAt > CACHE_TTL_MS) {
      this.refreshInBackground();
    }
    return this.cachedToolkits;
  }

  private refreshInBackground(): void {
    // In-flight deduplication: only one fetch at a time
    if (this.fetchPromise) return;

    this.fetchPromise = this.client
      .listToolkits()
      .then((toolkits) => {
        this.cachedToolkits = toolkits;
        this.cachedAt = Date.now();
        this.logger.debug(
          `toolforest: Refreshed toolkit cache (${toolkits.length} toolkits)`,
        );
      })
      .catch((err) => {
        // Stale data persists — don't hammer on errors
        this.cachedAt = Date.now();
        this.logger.warn(
          `toolforest: Background toolkit refresh failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      })
      .finally(() => {
        this.fetchPromise = null;
      });
  }
}
