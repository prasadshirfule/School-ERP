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
  UserPlus,
  Send,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const NAV_GROUPS: Record<string, NavGroup[]> = {
  ADMIN: [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      title: "Students & Admissions",
      items: [
        { label: "Student Roster", href: "/admin/students", icon: GraduationCap },
        { label: "New Admission", href: "/admin/students/new", icon: UserPlus },
        { label: "Student Promotion", href: "/admin/promotion", icon: UserCheck },
        { label: "ID Card Studio", href: "/admin/id-cards", icon: CreditCard },
      ],
    },
    {
      title: "Academics",
      items: [
        { label: "Classes & Sections", href: "/admin/classes", icon: School },
        { label: "Timetable Schedule", href: "/admin/timetable", icon: CalendarClock },
        { label: "Syllabus Tracker", href: "/admin/syllabus", icon: BookOpen },
      ],
    },
    {
      title: "Staff & Organization",
      items: [
        { label: "Teachers & Staff", href: "/admin/teachers", icon: Users },
        { label: "Departments", href: "/admin/departments", icon: Building2 },
        { label: "Leave Requests", href: "/admin/leave", icon: Calendar },
      ],
    },
    {
      title: "Records & Communications",
      items: [
        { label: "Transfer Certificates", href: "/admin/certificates", icon: FileCheck },
        { label: "Communications Hub", href: "/admin/communications", icon: Send },
        { label: "Notice Board", href: "/admin/notices", icon: Megaphone },
        { label: "Fee Alerts", href: "/admin/alerts", icon: Bell },
      ],
    },
    {
      title: "System",
      items: [
        { label: "School Settings", href: "/admin/settings", icon: Settings },
      ],
    },
  ],
  PRINCIPAL: [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      title: "Students & Admissions",
      items: [
        { label: "Student Roster", href: "/admin/students", icon: GraduationCap },
        { label: "Student Promotion", href: "/admin/promotion", icon: UserCheck },
        { label: "ID Card Studio", href: "/admin/id-cards", icon: CreditCard },
      ],
    },
    {
      title: "Academics",
      items: [
        { label: "Classes & Sections", href: "/admin/classes", icon: School },
        { label: "Timetable Schedule", href: "/admin/timetable", icon: CalendarClock },
        { label: "Syllabus Tracker", href: "/admin/syllabus", icon: BookOpen },
      ],
    },
    {
      title: "Staff & Organization",
      items: [
        { label: "Teachers & Staff", href: "/admin/teachers", icon: Users },
        { label: "Departments", href: "/admin/departments", icon: Building2 },
        { label: "Leave Requests", href: "/admin/leave", icon: Calendar },
      ],
    },
    {
      title: "Records & Notices",
      items: [
        { label: "Transfer Certificates", href: "/admin/certificates", icon: FileCheck },
        { label: "Notice Board", href: "/admin/notices", icon: Megaphone },
      ],
    },
    {
      title: "System",
      items: [
        { label: "School Settings", href: "/admin/settings", icon: Settings },
      ],
    },
  ],
  TEACHER: [
    {
      title: "Workspace",
      items: [
        { label: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard },
        { label: "Daily Attendance", href: "/teacher/attendance", icon: CheckCircle2 },
        { label: "Marks Entry", href: "/teacher/marks", icon: Award },
        { label: "Assignments", href: "/teacher/assignments", icon: ClipboardList },
      ],
    },
    {
      title: "Academic Schedule",
      items: [
        { label: "My Timetable", href: "/teacher/timetable", icon: CalendarClock },
        { label: "Syllabus Progress", href: "/teacher/syllabus", icon: BookOpen },
      ],
    },
    {
      title: "Self Service",
      items: [
        { label: "Leave Application", href: "/teacher/leave", icon: Calendar },
      ],
    },
  ],
  ACCOUNTANT: [
    {
      title: "Financial Workspace",
      items: [
        { label: "Accounts Overview", href: "/accountant/dashboard", icon: LayoutDashboard },
        { label: "Fee Invoices", href: "/accountant/invoices", icon: Receipt },
        { label: "Payment Receipts", href: "/accountant/payments", icon: CreditCard },
      ],
    },
  ],
  PARENT: [
    {
      title: "Family Portal",
      items: [
        { label: "Parent Dashboard", href: "/parent/dashboard", icon: LayoutDashboard },
        { label: "My Children", href: "/parent/students", icon: GraduationCap },
      ],
    },
    {
      title: "Academics & Attendance",
      items: [
        { label: "Daily Attendance", href: "/parent/attendance", icon: CheckCircle2 },
        { label: "Report Cards", href: "/parent/report-cards", icon: Award },
        { label: "Class Timetable", href: "/parent/timetable", icon: CalendarClock },
        { label: "Homework & Notes", href: "/parent/assignments", icon: ClipboardList },
        { label: "Syllabus Status", href: "/parent/syllabus", icon: BookOpen },
      ],
    },
    {
      title: "Fees & Announcements",
      items: [
        { label: "Fees & Invoices", href: "/parent/fees", icon: Receipt },
        { label: "School Notices", href: "/parent/notices", icon: Megaphone },
      ],
    },
  ],
};

interface SidebarProps {
  collapsed?: boolean;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  onToggleCollapse?: () => void;
}

export default function Sidebar({
  collapsed = false,
  mobileOpen = false,
  onCloseMobile,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role || "ADMIN";
  const groups = NAV_GROUPS[role] || NAV_GROUPS.ADMIN;

  return (
    <aside
      className={`sidebar ${collapsed ? "sidebar-collapsed" : ""} ${
        mobileOpen ? "mobile-open" : ""
      }`}
    >
      <div className="sidebar-header">
        <Link href="/" className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <School size={19} />
          </div>
          {!collapsed && (
            <div style={{ display: "flex", alignItems: "center" }}>
              <span className="sidebar-logo-text">SchoolERP</span>
              <span className="sidebar-logo-tag">Pro</span>
            </div>
          )}
        </Link>

        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          className="topbar-toggle-btn lg:hidden"
          title="Close Navigation"
          style={{ display: mobileOpen ? "inline-flex" : "none" }}
        >
          <X size={18} />
        </button>

        {/* Desktop collapse button */}
        <button
          onClick={onToggleCollapse}
          className="topbar-toggle-btn hidden lg:inline-flex"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          style={{ width: "26px", height: "26px" }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <nav className="sidebar-nav-container">
        {groups.map((group, gIdx) => (
          <div key={gIdx} className="sidebar-nav-group">
            {!collapsed && (
              <div className="sidebar-group-title">{group.title}</div>
            )}
            {group.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin/dashboard" &&
                  item.href !== "/teacher/dashboard" &&
                  item.href !== "/accountant/dashboard" &&
                  item.href !== "/parent/dashboard" &&
                  pathname.startsWith(item.href));

              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={`sidebar-link ${
                    isActive ? "sidebar-link-active" : ""
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="sidebar-link-icon">
                    <Icon size={17} />
                  </span>
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        {!collapsed ? (
          <div className={`sidebar-role-badge sidebar-role-${role}`}>
            <ShieldCheck size={13} />
            <span>{role} Workspace</span>
          </div>
        ) : (
          <div
            className={`sidebar-role-badge sidebar-role-${role}`}
            title={`${role} Portal`}
            style={{ padding: "4px" }}
          >
            <ShieldCheck size={14} />
          </div>
        )}
      </div>
    </aside>
  );
}
