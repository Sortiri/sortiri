"use client";

import { UserButton } from "@clerk/nextjs";
import { Menu } from "pixelarticons/react/Menu";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { DashboardMobileNavDrawer } from "@/components/dashboard-mobile-nav-drawer";
import { getDashboardPageTitle } from "@/config/dashboard-nav";
import "./dashboard-mobile.css";

export function DashboardMobileHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const title = getDashboardPageTitle(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const [trackedPathname, setTrackedPathname] = useState(pathname);

  if (pathname !== trackedPathname) {
    setTrackedPathname(pathname);
    if (menuOpen) {
      setMenuOpen(false);
    }
  }

  return (
    <>
      <header className="dashboard-mobile-header">
        <div className="dashboard-mobile-header-bar">
          <div className="dashboard-mobile-header-leading">
            <button
              type="button"
              className="dashboard-mobile-header-menu"
              aria-label="Open navigation menu"
              aria-expanded={menuOpen}
              aria-controls="dashboard-mobile-nav-drawer"
              onClick={() => setMenuOpen(true)}
            >
              <Menu width={18} height={18} className="app-icon" aria-hidden />
            </button>

            <button
              type="button"
              className="dashboard-mobile-header-brand"
              aria-label="Home"
              onClick={() => router.push("/home")}
            >
              <BrandLogo width={24} />
            </button>
          </div>

          <p className="dashboard-mobile-header-title">{title}</p>

          <div className="dashboard-mobile-header-account">
            <UserButton />
          </div>
        </div>
      </header>

      <DashboardMobileNavDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
    </>
  );
}
