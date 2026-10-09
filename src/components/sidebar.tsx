"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  GraduationCap,
  School,
  Users,
  Megaphone,
  CheckCircle2,
  Receipt,
  CreditCard,
  Sparkles,
  Award,
  Bell,
  Settings,
  CalendarClock,
  BookOpen,
  FileCheck,
  Building2,
  Calendar,
  UserCheck,
  ClipboardList,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const NAV_ITEMS: Record<string, NavItem[]> = {
  ADMIN: [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Students", href: "/admin/students", icon: GraduationCap },
    { label: "Promotion", href: "/admin/promotion", icon: UserCheck },
    { label: "Classes", href: "/admin/classes", icon: School },
    { label: "Teachers", href: "/admin/teachers", icon: Users },
    { label: "Departments", href: "/admin/departments", icon: Building2 },
    { label: "Leave Requests", href: "/admin/leave", icon: Calendar },
    { label: "Timetable", href: "/admin/timetable", icon: CalendarClock },
    { label: "Syllabus", href: "/admin/syllabus", icon: BookOpen },
    { label: "Certificates", href: "/admin/certificates", icon: FileCheck },
    { label: "ID Cards", href: "/admin/id-cards", icon: CreditCard },
    { label: "Communications", href: "/admin/communications", icon: Megaphone },
    { label: "Notices", href: "/admin/notices", icon: Megaphone },
    { label: "Alerts", href: "/admin/alerts", icon: Bell },
    { label: "School Settings", href: "/admin/settings", icon: Settings },
  ],
  PRINCIPAL: [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Students", href: "/admin/students", icon: GraduationCap },
    { label: "Promotion", href: "/admin/promotion", icon: UserCheck },
    { label: "Classes", href: "/admin/classes", icon: School },
    { label: "Teachers", href: "/admin/teachers", icon: Users },
    { label: "Departments", href: "/admin/departments", icon: Building2 },
    { label: "Leave Requests", href: "/admin/leave", icon: Calendar },
    { label: "Timetable", href: "/admin/timetable", icon: CalendarClock },
    { label: "Syllabus", href: "/admin/syllabus", icon: BookOpen },
    { label: "Certificates", href: "/admin/certificates", icon: FileCheck },
    { label: "ID Cards", href: "/admin/id-cards", icon: CreditCard },
    { label: "Communications", href: "/admin/communications", icon: Megaphone },
    { label: "Notices", href: "/admin/notices", icon: Megaphone },
    { label: "Alerts", href: "/admin/alerts", icon: Bell },
    { label: "School Settings", href: "/admin/settings", icon: Settings },
  ],
  TEACHER: [
    { label: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard },
    { label: "Attendance", href: "/teacher/attendance", icon: CheckCircle2 },
    { label: "Marks Entry", href: "/teacher/marks", icon: Award },
    { label: "Assignments", href: "/teacher/assignments", icon: ClipboardList },
    { label: "Timetable", href: "/teacher/timetable", icon: CalendarClock },
    { label: "Syllabus", href: "/teacher/syllabus", icon: BookOpen },
    { label: "My Leave", href: "/teacher/leave", icon: Calendar },
  ],
  PARENT: [
    { label: "Dashboard", href: "/parent/dashboard", icon: LayoutDashboard },
    { label: "My Children", href: "/parent/students", icon: GraduationCap },
    { label: "Attendance", href: "/parent/attendance", icon: CheckCircle2 },
    { label: "Fees & Invoices", href: "/parent/fees", icon: Receipt },
    { label: "Report Cards", href: "/parent/report-cards", icon: Award },
    { label: "Timetable", href: "/parent/timetable", icon: CalendarClock },
    { label: "Assignments", href: "/parent/assignments", icon: ClipboardList },
    { label: "Syllabus", href: "/parent/syllabus", icon: BookOpen },
    { label: "Notices", href: "/parent/notices", icon: Megaphone },
  ],
  ACCOUNTANT: [
    { label: "Dashboard", href: "/accountant/dashboard", icon: LayoutDashboard },
    { label: "Invoices", href: "/accountant/invoices", icon: Receipt },
    { label: "Payments", href: "/accountant/payments", icon: CreditCard },
  ],
};

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role || "ADMIN";
  const items = NAV_ITEMS[role] || [];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <School size={18} />
        </div>
        <span className="sidebar-logo-text">SchoolERP</span>
      </div>
      <nav className="sidebar-nav">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive ? "sidebar-link-active" : ""}`}
            >
              <span className="sidebar-link-icon">
                <Icon size={18} />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <div className={`sidebar-role-badge sidebar-role-${role}`}>
          <Sparkles size={12} />
          <span>{role}</span>
        </div>
      </div>
    </aside>
  );
}
