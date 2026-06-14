import type { SortiriConfig } from "@sortiri/local";
import { loadConfig as loadLocalConfig } from "@sortiri/local";

export type SortiriMcpConfig = SortiriConfig;

export function loadConfig(): SortiriMcpConfig {
  return loadLocalConfig();
}
