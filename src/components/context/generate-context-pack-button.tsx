"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CreateContextPackModal,
  type ContextPackScope,
} from "@/components/context/create-context-pack-modal";
import "./context.css";

type GenerateContextPackButtonProps = {
  workspaceId: string;
  scope?: ContextPackScope;
  label?: string;
  className?: string;
  navigateOnCreate?: boolean;
};

export function GenerateContextPackButton({
  workspaceId,
  scope,
  label = "Generate Agent Context",
  className = "context-btn",
  navigateOnCreate = true,
}: GenerateContextPackButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      {open ? (
        <CreateContextPackModal
          workspaceId={workspaceId}
          scope={scope}
          onClose={() => setOpen(false)}
          onCreated={(contextPackId) => {
            if (navigateOnCreate) {
              router.push(`/context/${contextPackId}`);
            }
          }}
        />
      ) : null}
    </>
  );
}
