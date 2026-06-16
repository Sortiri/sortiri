import { HeroInstallCard } from "@/components/landing/code-card/hero-install-card";
import { INSTALL_CODE_TABS } from "@/components/landing/code-card/snippets";

export function CtaInstallCard() {
  return (
    <HeroInstallCard tabs={INSTALL_CODE_TABS} defaultTabId="npm" />
  );
}
