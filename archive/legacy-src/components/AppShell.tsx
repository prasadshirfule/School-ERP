"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./sidebar";
import Topbar from "./topbar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

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
