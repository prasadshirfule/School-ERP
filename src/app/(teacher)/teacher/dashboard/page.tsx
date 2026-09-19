import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";

export default function TeacherDashboard() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Teacher Workspace</h1>
          <p className="page-subtitle">Manage daily classroom operations, student presence, and class sessions</p>
        </div>
      </div>
      <div className="stats-grid">
        <Link href="/teacher/attendance" style={{ textDecoration: "none" }}>
          <div className="stat-card" style={{ cursor: "pointer" }}>
            <div className="stat-icon-wrap stat-icon-teal">
              <CheckCircle2 size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Daily Register</span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                <span className="stat-value" style={{ fontSize: "17px" }}>Mark Section Attendance</span>
                <ArrowRight size={16} color="#2dd4bf" />
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
