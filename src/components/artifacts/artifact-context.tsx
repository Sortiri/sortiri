"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type ArtifactContextValue = {
  artifactId: string | null;
  auditReportId: string | null;
  openArtifact: (id: string, auditReportId?: string) => void;
  closeArtifact: () => void;
};

const ArtifactContext = createContext<ArtifactContextValue | null>(null);

export function ArtifactProvider({ children }: { children: ReactNode }) {
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const [auditReportId, setAuditReportId] = useState<string | null>(null);

  const openArtifact = useCallback((id: string, reportId?: string) => {
    setArtifactId(id);
    setAuditReportId(reportId ?? null);
  }, []);

  const closeArtifact = useCallback(() => {
    setArtifactId(null);
    setAuditReportId(null);
  }, []);

  return (
    <ArtifactContext.Provider
      value={{ artifactId, auditReportId, openArtifact, closeArtifact }}
    >
      {children}
    </ArtifactContext.Provider>
  );
}

export function useArtifactDrawer(): ArtifactContextValue {
  const context = useContext(ArtifactContext);
  if (!context) {
    throw new Error("useArtifactDrawer must be used within ArtifactProvider");
  }
  return context;
}
