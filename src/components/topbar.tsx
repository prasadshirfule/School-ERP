"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut, User, Menu, Building } from "lucide-react";
import GlobalSearch from "@/components/GlobalSearch";

interface TopbarProps {
  onToggleMobile?: () => void;
  collapsed?: boolean;
}

export default function Topbar({ onToggleMobile, collapsed = false }: TopbarProps) {
  const { data: session } = useSession();
  const schoolName = session?.user?.schoolName || "Institutional ERP";

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
          <span className="topbar-school-tag">Live Session</span>
        </div>
      </div>

      <div className="topbar-right">
        {session?.user && (
          <>
            <GlobalSearch />
            <div className="topbar-user hidden md:inline-flex">
              <User size={14} style={{ color: "var(--primary)" }} />
              <span>{session.user.email}</span>
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
