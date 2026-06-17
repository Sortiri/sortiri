import { AppShell } from "@/components/platform/AppShell";
import type { Metadata } from "next";
import "@/styles/dashboard-dark-theme.css";
import "@/styles/dashboard-layout.css";
import "@/styles/dashboard-sidebar-collapse.css";
import "@/styles/platform.css";
import "@/styles/dashboard-radius.css";

export const metadata: Metadata = {
  title: "Home — Sortiri Timeline",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
