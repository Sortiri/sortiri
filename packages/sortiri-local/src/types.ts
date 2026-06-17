import { z } from "zod";

export const sortiriModeSchema = z.enum(["local", "cloud"]);

export const sortiriConfigSchema = z.object({
  mode: sortiriModeSchema.optional(),
  apiUrl: z.string().min(1).optional(),
  apiKey: z.string().min(1).optional(),
  workspaceId: z.string().min(1).optional(),
  projectId: z.string().nullable().optional(),
  projectName: z.string().optional(),
  editor: z.string().optional(),
});

export const sortiriSessionSchema = z.object({
  currentWorkstreamId: z.string().nullable(),
  currentWorkstreamTitle: z.string().nullable(),
  startedAt: z.number().nullable(),
  lastDoctorAt: z.number().nullable().optional(),
});

export type SortiriConfig = z.infer<typeof sortiriConfigSchema>;
export type SortiriMode = z.infer<typeof sortiriModeSchema>;

export function isCloudMode(config: SortiriConfig): boolean {
  if (config.mode === "cloud") return true;
  if (config.mode === "local") return false;
  return Boolean(config.apiKey && config.workspaceId);
}

export function isLocalMode(config: SortiriConfig): boolean {
  return !isCloudMode(config);
}

export type CloudSortiriConfig = SortiriConfig & {
  apiUrl: string;
  apiKey: string;
  workspaceId: string;
};

export function asCloudConfig(config: SortiriConfig): CloudSortiriConfig {
  if (!isCloudMode(config) || !config.apiUrl || !config.apiKey || !config.workspaceId) {
    throw new Error("Sortiri Cloud configuration is required for this operation.");
  }
  return {
    ...config,
    mode: "cloud",
    apiUrl: config.apiUrl,
    apiKey: config.apiKey,
    workspaceId: config.workspaceId,
  };
}
export type SortiriSession = z.infer<typeof sortiriSessionSchema>;

export const EMPTY_SESSION: SortiriSession = {
  currentWorkstreamId: null,
  currentWorkstreamTitle: null,
  startedAt: null,
  lastDoctorAt: null,
};
