import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { tenantClient } from "@/lib/tenant";
import { GraduationCap, School, Layers, Users, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.schoolId) return null;
  const db = tenantClient(session.user.schoolId);

  const [studentCount, classCount, sectionCount, teacherCount] =
    await Promise.all([
      db.student.count({ where: { isActive: true } }),
      db.class.count(),
      db.section.count(),
      db.user.count({ where: { role: "TEACHER", isActive: true } }),
    ]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">School Administration</h1>
          <p className="page-subtitle">Welcome back! Here is what is happening across your school today.</p>
        </div>
      </div>

      <div className="stats-grid">
        <Link href="/admin/students" style={{ textDecoration: "none" }}>
          <div className="stat-card">
            <div className="stat-icon-wrap stat-icon-indigo">
              <GraduationCap size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Enrolled Students</span>
              <span className="stat-value">{studentCount}</span>
            </div>
          </div>
        </Link>

        <Link href="/admin/classes" style={{ textDecoration: "none" }}>
          <div className="stat-card">
            <div className="stat-icon-wrap stat-icon-teal">
              <School size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Active Classes</span>
              <span className="stat-value">{classCount}</span>
            </div>
          </div>
        </Link>

        <Link href="/admin/classes" style={{ textDecoration: "none" }}>
          <div className="stat-card">
            <div className="stat-icon-wrap stat-icon-amber">
              <Layers size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Class Sections</span>
              <span className="stat-value">{sectionCount}</span>
            </div>
          </div>
        </Link>

        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-coral">
            <Users size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Teaching Staff</span>
            <span className="stat-value">{teacherCount}</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "12px" }}>
        <div className="card-header">
          <h3 className="card-title">Quick Administration Actions</h3>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Link href="/admin/students" className="btn btn-secondary">
            <span>Manage Student Roster</span>
            <ArrowUpRight size={14} />
          </Link>
          <Link href="/admin/classes" className="btn btn-secondary">
            <span>Configure Classes</span>
            <ArrowUpRight size={14} />
          </Link>
          <Link href="/admin/notices" className="btn btn-secondary">
            <span>Publish Announcements</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
