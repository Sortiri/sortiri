import { describe, expect, it } from "vitest";
import { PlatformCard } from "@/components/platform/PlatformCard";
import { PlatformEmptyState } from "@/components/platform/PlatformEmptyState";
import { PlatformGrid } from "@/components/platform/PlatformGrid";
import { PlatformList } from "@/components/platform/PlatformList";
import { PlatformObjectCard } from "@/components/platform/PlatformObjectCard";
import { PlatformPage } from "@/components/platform/PlatformPage";
import { PlatformPageActions } from "@/components/platform/PlatformPageActions";
import { PlatformPageHeader } from "@/components/platform/PlatformPageHeader";
import { PlatformSection } from "@/components/platform/PlatformSection";
import { PlatformSectionHeader } from "@/components/platform/PlatformSectionHeader";

describe("platform page layout primitives", () => {
  it("exports page shell components", () => {
    expect(PlatformPage).toBeTypeOf("function");
    expect(PlatformPageHeader).toBeTypeOf("function");
    expect(PlatformPageActions).toBeTypeOf("function");
    expect(PlatformSection).toBeTypeOf("function");
    expect(PlatformSectionHeader).toBeTypeOf("function");
  });

  it("exports layout components", () => {
    expect(PlatformCard).toBeTypeOf("function");
    expect(PlatformGrid).toBeTypeOf("function");
    expect(PlatformList).toBeTypeOf("function");
    expect(PlatformObjectCard).toBeTypeOf("function");
    expect(PlatformEmptyState).toBeTypeOf("function");
  });
});
