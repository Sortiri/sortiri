import type { Doc } from "../_generated/dataModel";
import type { Artifact } from "../../src/types/events";

export function docToArtifact(doc: Doc<"artifacts">): Artifact {
  return {
    id: doc._id,
    workspaceId: doc.workspaceId,
    projectId: doc.projectId,
    workstreamId: doc.workstreamId,
    type: doc.type,
    title: doc.title,
    summary: doc.summary,
    url: doc.url,
    storageId: doc.storageId,
    content: doc.content,
    metadata: doc.metadata,
    sizeBytes: doc.sizeBytes,
    language: doc.language,
    filePath: doc.filePath,
    truncated: doc.truncated,
    createdAt: doc.createdAt,
  };
}
