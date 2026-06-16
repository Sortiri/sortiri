import { CodeCard } from "@/components/landing/code-card/code-card";
import { HERO_CODE_TABS } from "@/components/landing/code-card/snippets";

export function HeroCodeCard() {
  return (
    <CodeCard
      tabs={HERO_CODE_TABS}
      defaultTabId="typescript"
      size="hero"
      className="hero-code-card"
    />
  );
}
