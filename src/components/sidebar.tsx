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
  FileSpreadsheet,
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
  SUPER_ADMIN: [
    {
      title: "PLATFORM GOVERNANCE",
      items: [
        { label: "Platform Dashboard", href: "/super-admin/dashboard", icon: LayoutDashboard },
        { label: "Schools Directory", href: "/super-admin/dashboard#schools", icon: School },
        { label: "Registration Requests", href: "/super-admin/dashboard#requests", icon: UserPlus },
        { label: "Subscriptions & Plans", href: "/super-admin/dashboard#subscriptions", icon: CreditCard },
        { label: "Platform Audit Logs", href: "/super-admin/dashboard#audit", icon: ShieldCheck },
      ],
    },
    {
      title: "SECURITY & ACCESS",
      items: [
        { label: "MFA & Credentials", href: "/super-admin/mfa-setup", icon: ShieldCheck },
      ],
    },
  ],
  ADMIN: [
    {
      title: "HOME",
      items: [
        { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      title: "STUDENTS",
      items: [
        { label: "Student Directory", href: "/admin/students", icon: Users },
        { label: "New Admission", href: "/admin/students/new", icon: UserPlus },
        { label: "Parent Link Requests", href: "/admin/parent-links", icon: UserCheck },
        { label: "Print ID Cards", href: "/admin/id-cards", icon: CreditCard },
        { label: "Student Promotion", href: "/admin/promotion", icon: UserCheck },
      ],
    },
    {
      title: "STAFF",
      items: [
        { label: "Teachers Directory", href: "/admin/teachers", icon: GraduationCap },
        { label: "Add Teacher", href: "/admin/teachers/new", icon: UserPlus },
        { label: "Leave Requests", href: "/admin/leave", icon: Calendar },
        { label: "Departments", href: "/admin/departments", icon: Building2 },
      ],
    },
    {
      title: "CLASSES & TIMETABLE",
      items: [
        { label: "Take Attendance", href: "/admin/attendance", icon: CheckCircle2 },
        { label: "Classes & Sections", href: "/admin/classes", icon: School },
        { label: "Weekly Timetable", href: "/admin/timetable", icon: CalendarClock },
        { label: "Syllabus Progress", href: "/admin/syllabus", icon: BookOpen },
      ],
    },
    {
      title: "FEES",
      items: [
        { label: "Fee Invoices", href: "/accountant/invoices", icon: Receipt },
        { label: "Payment Receipts", href: "/accountant/payments", icon: CreditCard },
        { label: "Fee Alerts", href: "/admin/alerts", icon: Bell },
      ],
    },
    {
      title: "NOTICES",
      items: [
        { label: "Notice Board", href: "/admin/notices", icon: Megaphone },
        { label: "Broadcast Announcement", href: "/admin/communications", icon: Send },
      ],
    },
    {
      title: "REPORTS",
      items: [
        { label: "School Reports Hub", href: "/admin/reports", icon: FileSpreadsheet },
        { label: "Transfer Certificates (TC)", href: "/admin/certificates", icon: FileCheck },
      ],
    },
    {
      title: "SETTINGS",
      items: [
        { label: "School Profile & Setup", href: "/admin/settings", icon: Settings },
        { label: "Subscription & Billing", href: "/admin/subscription", icon: CreditCard },
        { label: "Data Export & Retention", href: "/admin/export", icon: FileSpreadsheet },
      ],
    },
  ],
  PRINCIPAL: [
    {
      title: "HOME",
      items: [
        { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      title: "STUDENTS",
      items: [
        { label: "Student Directory", href: "/admin/students", icon: Users },
        { label: "New Admission", href: "/admin/students/new", icon: UserPlus },
        { label: "Parent Link Requests", href: "/admin/parent-links", icon: UserCheck },
        { label: "Print ID Cards", href: "/admin/id-cards", icon: CreditCard },
        { label: "Student Promotion", href: "/admin/promotion", icon: UserCheck },
      ],
    },
    {
      title: "STAFF",
      items: [
        { label: "Teachers Directory", href: "/admin/teachers", icon: GraduationCap },
        { label: "Add Teacher", href: "/admin/teachers/new", icon: UserPlus },
        { label: "Leave Requests", href: "/admin/leave", icon: Calendar },
        { label: "Departments", href: "/admin/departments", icon: Building2 },
      ],
    },
    {
      title: "CLASSES & TIMETABLE",
      items: [
        { label: "Take Attendance", href: "/admin/attendance", icon: CheckCircle2 },
        { label: "Classes & Sections", href: "/admin/classes", icon: School },
        { label: "Weekly Timetable", href: "/admin/timetable", icon: CalendarClock },
        { label: "Syllabus Progress", href: "/admin/syllabus", icon: BookOpen },
      ],
    },
    {
      title: "FEES",
      items: [
        { label: "Fee Invoices", href: "/accountant/invoices", icon: Receipt },
        { label: "Payment Receipts", href: "/accountant/payments", icon: CreditCard },
        { label: "Fee Alerts", href: "/admin/alerts", icon: Bell },
      ],
    },
    {
      title: "NOTICES",
      items: [
        { label: "Notice Board", href: "/admin/notices", icon: Megaphone },
        { label: "Broadcast Announcement", href: "/admin/communications", icon: Send },
      ],
    },
    {
      title: "REPORTS",
      items: [
        { label: "School Reports Hub", href: "/admin/reports", icon: FileSpreadsheet },
        { label: "Transfer Certificates (TC)", href: "/admin/certificates", icon: FileCheck },
      ],
    },
    {
      title: "SETTINGS",
      items: [
        { label: "School Profile & Setup", href: "/admin/settings", icon: Settings },
        { label: "Subscription & Billing", href: "/admin/subscription", icon: CreditCard },
        { label: "Data Export & Retention", href: "/admin/export", icon: FileSpreadsheet },
      ],
    },
  ],
  TEACHER: [
    {
      title: "DAILY WORK",
      items: [
        { label: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard },
        { label: "Daily Attendance", href: "/teacher/attendance", icon: CheckCircle2 },
        { label: "Marks Entry", href: "/teacher/marks", icon: Award },
        { label: "Assignments", href: "/teacher/assignments", icon: ClipboardList },
      ],
    },
    {
      title: "ACADEMICS",
      items: [
        { label: "My Timetable", href: "/teacher/timetable", icon: CalendarClock },
        { label: "Syllabus Progress", href: "/teacher/syllabus", icon: BookOpen },
      ],
    },
    {
      title: "ADMINISTRATION",
      items: [
        { label: "Leave Application", href: "/teacher/leave", icon: Calendar },
      ],
    },
  ],
  ACCOUNTANT: [
    {
      title: "DAILY WORK",
      items: [
        { label: "Accounts Overview", href: "/accountant/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      title: "FINANCE",
      items: [
        { label: "Fee Invoices", href: "/accountant/invoices", icon: Receipt },
        { label: "Payment Receipts", href: "/accountant/payments", icon: CreditCard },
        { label: "Fee Alerts", href: "/admin/alerts", icon: Bell },
      ],
    },
  ],
  PARENT: [
    {
      title: "DAILY WORK",
      items: [
        { label: "Parent Dashboard", href: "/parent/dashboard", icon: LayoutDashboard },
        { label: "School Notices", href: "/parent/notices", icon: Megaphone },
      ],
    },
    {
      title: "PEOPLE",
      items: [
        { label: "My Children", href: "/parent/students", icon: GraduationCap },
      ],
    },
    {
      title: "ACADEMICS",
      items: [
        { label: "Daily Attendance", href: "/parent/attendance", icon: CheckCircle2 },
        { label: "Report Cards", href: "/parent/report-cards", icon: Award },
        { label: "Class Timetable", href: "/parent/timetable", icon: CalendarClock },
        { label: "Homework & Notes", href: "/parent/assignments", icon: ClipboardList },
        { label: "Syllabus Status", href: "/parent/syllabus", icon: BookOpen },
      ],
    },
    {
      title: "FINANCE",
      items: [
        { label: "Fees & Invoices", href: "/parent/fees", icon: Receipt },
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
