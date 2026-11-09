"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./sidebar";
import Topbar from "./topbar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile drawer on route change
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsMobileOpen(false);
  }

  return (
    <div className="app-shell">
      {/* Mobile Drawer Backdrop */}
      <div
        className={`drawer-backdrop ${isMobileOpen ? "active" : ""}`}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* Navigation Sidebar */}
      <Sidebar
        collapsed={isSidebarCollapsed}
        mobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* Compact Top Navigation */}
      <Topbar
        collapsed={isSidebarCollapsed}
        onToggleMobile={() => setIsMobileOpen((prev) => !prev)}
      />

      {/* Primary Application Workspace */}
      <main
        className={`main-content ${
          isSidebarCollapsed ? "main-content-expanded" : ""
        }`}
      >
        {children}
      </main>
    </div>
  );
}
