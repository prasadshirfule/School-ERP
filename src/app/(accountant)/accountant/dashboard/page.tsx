import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { tenantClient } from "@/lib/tenant";
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  CreditCard,
  ArrowRight,
  PlusCircle,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDecimal, formatDate } from "@/lib/utils";

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

  return (
    <div>
      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        <span>Workspace</span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Accounts & Finance</span>
      </div>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Accounts & Fee Collection</h1>
          <p className="page-subtitle">
            Track student fee structures, outstanding balances, collection receipts, and reconciliations.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link href="/accountant/payments" className="btn btn-primary">
            <PlusCircle size={15} />
            <span>Record Payment</span>
          </Link>
          <Link href="/accountant/invoices" className="btn btn-secondary">
            <FileSpreadsheet size={15} />
            <span>Fee Invoices</span>
          </Link>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="stats-grid">
        <Link href="/accountant/invoices" style={{ textDecoration: "none" }}>
          <div className="stat-card">
            <div className="stat-icon-wrap stat-icon-rose">
              <AlertCircle size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Unpaid Demands</span>
              <span className="stat-value" style={{ color: "var(--danger-text)" }}>
                {unpaid}
              </span>
            </div>
          </div>
        </Link>

        <Link href="/accountant/invoices" style={{ textDecoration: "none" }}>
          <div className="stat-card">
            <div className="stat-icon-wrap stat-icon-amber">
              <Clock size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Partially Paid</span>
              <span className="stat-value" style={{ color: "var(--warning-text)" }}>
                {partial}
              </span>
            </div>
          </div>
        </Link>

        <Link href="/accountant/invoices" style={{ textDecoration: "none" }}>
          <div className="stat-card">
            <div className="stat-icon-wrap stat-icon-emerald">
              <CheckCircle2 size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Settled In Full</span>
              <span className="stat-value" style={{ color: "var(--success-text)" }}>
                {paid}
              </span>
            </div>
          </div>
        </Link>

        <Link href="/accountant/payments" style={{ textDecoration: "none" }}>
          <div className="stat-card">
            <div className="stat-icon-wrap stat-icon-indigo">
              <CreditCard size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Receipts Issued</span>
              <span className="stat-value">{totalPayments}</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Receipts Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Recent Fee Receipts</h2>
            <p className="card-subtitle">Real-time payment audit log</p>
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
                {recentPayments.map((p) => (
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
