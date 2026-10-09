"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import GlobalSearch from "@/components/GlobalSearch";

export default function Topbar() {
  const { data: session } = useSession();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="topbar-title">School Management System</h1>
      </div>
      <div className="topbar-right" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {session?.user && (
          <>
            <GlobalSearch />
            <span className="topbar-user">
              <User size={15} style={{ opacity: 0.7 }} />
              {session.user.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="topbar-logout"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
