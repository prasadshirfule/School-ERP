import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  FileCheck,
  CheckCircle2,
  Receipt,
  CreditCard,
  UserCheck,
  Calendar,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

export default async function AdminReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.schoolId) {
    redirect("/login");
  }

  const reports = [
    {
      title: "Class Attendance Reports",
      description: "Review daily student attendance percentages, absent records, and section totals.",
      icon: CheckCircle2,
      href: "/admin/attendance",
      tag: "Daily Records",
      tagColor: "teal",
    },
    {
      title: "Fee Collection & Outstanding Dues",
      description: "Audit unpaid invoices, overdue balances, and student fee ledger by grade.",
      icon: Receipt,
      href: "/accountant/invoices",
      tag: "Financial",
      tagColor: "amber",
    },
    {
      title: "Payment Receipts Register",
      description: "Search official transaction receipts, payment dates, and payment methods.",
      icon: CreditCard,
      href: "/accountant/payments",
      tag: "Financial",
      tagColor: "emerald",
    },
    {
      title: "Transfer Certificates (TC) Register",
      description: "Permanent record of all issued Transfer Certificates and school leaving reasons.",
      icon: FileCheck,
      href: "/admin/certificates",
      tag: "Official Certificates",
      tagColor: "blue",
    },
    {
      title: "Student Promotion History",
      description: "Review annual grade progression and promoted student rosters for the academic year.",
      icon: UserCheck,
      href: "/admin/promotion",
      tag: "Academic",
      tagColor: "purple",
    },
    {
      title: "Staff Leave Register",
      description: "Audit teacher and employee leave balances, submitted requests, and approval status.",
      icon: Calendar,
      href: "/admin/leave",
      tag: "Staff Records",
      tagColor: "rose",
    },
  ];

  return (
    <div>
      {/* Breadcrumb Navigation */}
      <div className="breadcrumbs">
        <span>Workspace</span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">School Reports</span>
      </div>

      {/* Header */}
      <div className="page-header" style={{ marginBottom: "20px" }}>
        <div>
          <h1 className="page-title">School Reports &amp; Records</h1>
          <p className="page-subtitle">
            One-click access to attendance registers, financial summaries, leaving certificates, and staff records.
          </p>
        </div>
      </div>

      {/* Reports Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "16px",
        }}
      >
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <Link
              key={r.title}
              href={r.href}
              className="card"
              style={{
                textDecoration: "none",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "20px",
                transition: "all 0.16s ease",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "14px",
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: "var(--bg-muted)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--primary)",
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <span
                    className={`badge badge-${
                      r.tagColor === "amber"
                        ? "warning"
                        : r.tagColor === "teal" || r.tagColor === "emerald"
                        ? "success"
                        : "info"
                    }`}
                  >
                    {r.tag}
                  </span>
                </div>
                <h3
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    margin: "0 0 6px 0",
                  }}
                >
                  {r.title}
                </h3>
                <p
                  style={{
                    fontSize: "12.5px",
                    color: "var(--text-muted)",
                    lineHeight: 1.4,
                    margin: 0,
                  }}
                >
                  {r.description}
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: "16px",
                  paddingTop: "12px",
                  borderTop: "1px solid var(--border-subtle)",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "var(--primary)",
                }}
              >
                <span>Open Report</span>
                <ArrowRight size={14} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
