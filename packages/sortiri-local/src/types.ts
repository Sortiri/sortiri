import { z } from "zod";

export const sortiriConfigSchema = z.object({
  apiUrl: z.string().min(1),
  apiKey: z.string().min(1),
  workspaceId: z.string().min(1),
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
export type SortiriSession = z.infer<typeof sortiriSessionSchema>;

export const EMPTY_SESSION: SortiriSession = {
  currentWorkstreamId: null,
  currentWorkstreamTitle: null,
  startedAt: null,
  lastDoctorAt: null,
};
