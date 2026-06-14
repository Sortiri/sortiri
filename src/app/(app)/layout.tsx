import { DashboardShell } from "@/components/dashboard-shell";
import type { Metadata } from "next";
import "@/styles/dashboard-dark-theme.css";
import "@/styles/dashboard-layout.css";
import "@/styles/dashboard-sidebar-collapse.css";

export const metadata: Metadata = {
  title: "Home — Sortiri Timeline",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
