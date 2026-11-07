import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { tenantClient } from "@/lib/tenant";
import { Prisma } from "@prisma/client";
import ModuleTile from "@/components/ui/ModuleTile";
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  CreditCard,
  ArrowRight,
  PlusCircle,
  Receipt,
  FileSpreadsheet,
  Calendar,
  Zap,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDecimal, formatDate } from "@/lib/utils";

type AccountantRecentPayment = Prisma.PaymentGetPayload<{
  include: {
    invoice: {
      include: {
        student: true;
        feeStructure: true;
      };
    };
  };
}>;

export default async function AccountantDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.schoolId) {
    redirect("/login");
  }

  const db = tenantClient(session.user.schoolId);

  const [unpaid, partial, paid, totalPayments, recentPayments] = await Promise.all([
    db.feeInvoice.count({ where: { status: "UNPAID" } }),
    db.feeInvoice.count({ where: { status: "PARTIALLY_PAID" } }),
    db.feeInvoice.count({ where: { status: "PAID" } }),
    db.payment.count(),
    db.payment.findMany({
      take: 6,
      orderBy: { paidAt: "desc" },
      include: {
        invoice: {
          include: {
            student: true,
            feeStructure: true,
          },
        },
      },
    }),
  ]);

  const currentHour = new Date().getHours();
  let greeting = "Good Morning";
  if (currentHour >= 12 && currentHour < 17) {
    greeting = "Good Afternoon";
  } else if (currentHour >= 17) {
    greeting = "Good Evening";
  }

  const displayName = session.user.name || session.user.email?.split("@")[0] || "Accountant";

  return (
    <div>
      {/* Breadcrumbs Navigation */}
      <div className="breadcrumbs">
        <span>Workspace</span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Accounts & Finance</span>
      </div>

      {/* Welcome Hero Banner (Template 3) */}
      <div className="welcome-banner">
        <div>
          <h1 className="welcome-title">
            {greeting}, {displayName}!
          </h1>
          <p className="welcome-subtitle">
            Financial Ledger & Fee Collection • Track student fee demands, receipts, and reconciliations.
          </p>
        </div>
        <div className="welcome-badge-group">
          <div className="topbar-ay-badge">
            <Calendar size={13} />
            <span>Academic Session 2026-27</span>
          </div>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="dashboard-stats-grid">
        <Link href="/accountant/invoices" className="stat-card-simple">
          <div className="stat-card-simple-header">
            <span className="stat-card-simple-label">Unpaid Demands</span>
            <div className="module-tile-icon-wrap module-tile-icon-rose" style={{ width: "34px", height: "34px" }}>
              <AlertCircle size={18} />
            </div>
          </div>
          <div className="stat-card-simple-value" style={{ color: "var(--danger-text)" }}>
            {unpaid}
          </div>
          <div className="stat-card-simple-sub">Pending student fee invoices</div>
        </Link>

        <Link href="/accountant/invoices" className="stat-card-simple">
          <div className="stat-card-simple-header">
            <span className="stat-card-simple-label">Partially Paid</span>
            <div className="module-tile-icon-wrap module-tile-icon-amber" style={{ width: "34px", height: "34px" }}>
              <Clock size={18} />
            </div>
          </div>
          <div className="stat-card-simple-value" style={{ color: "var(--warning-text)" }}>
            {partial}
          </div>
          <div className="stat-card-simple-sub">Invoices with partial payments</div>
        </Link>

        <Link href="/accountant/invoices" className="stat-card-simple">
          <div className="stat-card-simple-header">
            <span className="stat-card-simple-label">Settled In Full</span>
            <div className="module-tile-icon-wrap module-tile-icon-emerald" style={{ width: "34px", height: "34px" }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="stat-card-simple-value" style={{ color: "var(--success-text)" }}>
            {paid}
          </div>
          <div className="stat-card-simple-sub">Fully cleared fee invoices</div>
        </Link>

        <Link href="/accountant/payments" className="stat-card-simple">
          <div className="stat-card-simple-header">
            <span className="stat-card-simple-label">Receipts Issued</span>
            <div className="module-tile-icon-wrap module-tile-icon-indigo" style={{ width: "34px", height: "34px" }}>
              <CreditCard size={18} />
            </div>
          </div>
          <div className="stat-card-simple-value">
            {totalPayments}
          </div>
          <div className="stat-card-simple-sub">Total fee collection transactions</div>
        </Link>
      </div>

      {/* Quick Actions Bar */}
      <div className="quick-actions-bar">
        <div className="quick-actions-title">
          <Zap size={14} color="var(--primary)" />
          <span>Quick Actions</span>
        </div>
        <div className="quick-actions-grid">
          <Link href="/accountant/payments" className="quick-action-btn quick-action-btn-primary">
            <PlusCircle size={15} />
            <span>Record Payment</span>
          </Link>
          <Link href="/accountant/invoices" className="quick-action-btn">
            <FileSpreadsheet size={15} />
            <span>Manage Fee Invoices</span>
          </Link>
          <Link href="/admin/alerts" className="quick-action-btn">
            <AlertCircle size={15} />
            <span>Fee Alerts & Overdues</span>
          </Link>
        </div>
      </div>

      {/* Section Header: Finance Modules */}
      <div className="dashboard-section-header">
        <div className="dashboard-section-title">
          <Building2 size={18} color="var(--primary)" />
          <span>Finance Modules</span>
          <span className="dashboard-section-subtitle">Click any module to open</span>
        </div>
      </div>

      {/* Primary Module Tiles (Template 3) */}
      <div className="module-tile-grid">
        <ModuleTile
          title="Fee Invoices"
          description="Create fee demands, manage student fee structures, and check payment status"
          icon="Receipt"
          href="/accountant/invoices"
          colorScheme="amber"
          badge={`${unpaid} Unpaid`}
        />

        <ModuleTile
          title="Payment Receipts"
          description="Log cash, UPI, or card payments, and print official fee receipts"
          icon="CreditCard"
          href="/accountant/payments"
          colorScheme="emerald"
          badge={`${totalPayments} Receipts`}
        />

        <ModuleTile
          title="Fee Alerts & Reminders"
          description="Send automated fee reminder notifications to parents with overdue balances"
          icon="AlertCircle"
          href="/admin/alerts"
          colorScheme="rose"
        />
      </div>

      {/* Section Header: Recent Receipts */}
      <div className="dashboard-section-header">
        <div className="dashboard-section-title">
          <Receipt size={18} color="var(--primary)" />
          <span>Recent Fee Receipts</span>
          <span className="dashboard-section-subtitle">Real-time payment audit log</span>
        </div>
        <Link
          href="/accountant/payments"
          style={{
            fontSize: "12.5px",
            fontWeight: 600,
            color: "var(--primary)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span>All Payments</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Recent Receipts Table */}
      <div className="card">
        {recentPayments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No payment records found</div>
            <p className="empty-state-text">Record fees through cash, UPI, card, or bank transfer.</p>
          </div>
        ) : (
          <div className="table-container" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Receipt No</th>
                  <th>Student Name</th>
                  <th>Fee Particulars</th>
                  <th>Method</th>
                  <th>Date</th>
                  <th className="text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody>
                {(recentPayments as AccountantRecentPayment[]).map((p: AccountantRecentPayment) => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--primary)" }}>
                      {p.receiptNumber}
                    </td>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {p.invoice.student.fullName}
                    </td>
                    <td>{p.invoice.feeStructure.name}</td>
                    <td>
                      <span className="badge badge-info">{p.method}</span>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "12.5px" }}>
                      {formatDate(p.paidAt)}
                    </td>
                    <td className="num-cell" style={{ color: "var(--success-text)" }}>
                      ₹{formatDecimal(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
