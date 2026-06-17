import { asCloudConfig, loadConfig as loadLocalConfig, type CloudSortiriConfig } from "@sortiri/local";

export type SortiriMcpConfig = CloudSortiriConfig;

export function loadConfig(): SortiriMcpConfig {
  return asCloudConfig(loadLocalConfig());
}
