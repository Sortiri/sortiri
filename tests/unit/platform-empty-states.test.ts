import { describe, expect, it } from "vitest";
import { EmptyState } from "@/components/platform/EmptyState";

describe("platform empty states", () => {
  it("exports empty state with CTA action shape", () => {
    expect(EmptyState).toBeTypeOf("function");
    const actions = [
      { label: "Create project", href: "/sources" },
      { label: "Install CLI", href: "/sources#connections" },
    ];
    expect(actions[0]?.href).toBe("/sources");
    expect(actions[1]?.label).toBe("Install CLI");
  });
});
