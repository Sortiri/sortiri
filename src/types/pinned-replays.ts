import type { Workstream } from "@/types/events";

export type PinnedReplayRecord = {
  id: string;
  workstreamId: string;
  label?: string;
  note?: string;
  createdAt: number;
};

export type PinnedReplayWithWorkstream = {
  pin: PinnedReplayRecord;
  workstream: Workstream;
};

export type PinState = {
  pinned: boolean;
  pinId?: string;
};

export type PinReplayResult = {
  pinned: boolean;
  pinId?: string;
};
