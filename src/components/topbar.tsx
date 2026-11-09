"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut, User, Menu, Building, Calendar } from "lucide-react";
import GlobalSearch from "@/components/GlobalSearch";
import NotificationCenter from "@/components/notification-center";

interface TopbarProps {
  onToggleMobile?: () => void;
  collapsed?: boolean;
}

export default function Topbar({ onToggleMobile, collapsed = false }: TopbarProps) {
  const { data: session } = useSession();
  const schoolName = session?.user?.schoolName || "Institutional ERP";
  const userRole = session?.user?.role || "USER";
  const displayName = session?.user?.name || session?.user?.email || "User";

  return (
    <header className={`topbar ${collapsed ? "topbar-expanded" : ""}`}>
      <div className="topbar-left">
        <button
          onClick={onToggleMobile}
          className="topbar-toggle-btn lg:hidden"
          title="Open Menu"
        >
          <Menu size={18} />
        </button>

        <div className="topbar-school-badge">
          <Building size={16} color="var(--primary)" />
          <span>{schoolName}</span>
        </div>

        <div className="topbar-ay-badge hidden sm:inline-flex" title="Current Academic Session">
          <Calendar size={13} />
          <span>AY 2026-27</span>
        </div>
      </div>

      <div className="topbar-right">
        {session?.user && (
          <>
            <GlobalSearch />
            <NotificationCenter />
            <div className="topbar-user hidden md:inline-flex">
              <User size={14} style={{ color: "var(--primary)" }} />
              <span style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {displayName}
              </span>
              <span className={`topbar-role-tag sidebar-role-${userRole}`}>
                {userRole}
              </span>
            </div>
            <button
              onClick={() => {
                signOut({ callbackUrl: "/login", redirect: true });
              }}
              className="topbar-logout"
              title="Sign Out of Session"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
