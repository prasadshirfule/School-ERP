import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { tenantClient } from "@/lib/tenant";
import { AlertCircle, Clock, CheckCircle2, CreditCard, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default async function AccountantDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.schoolId) return null;
  const db = tenantClient(session.user.schoolId);

  const [unpaid, partial, paid, totalPayments] = await Promise.all([
    db.feeInvoice.count({ where: { status: "UNPAID" } }),
    db.feeInvoice.count({ where: { status: "PARTIALLY_PAID" } }),
    db.feeInvoice.count({ where: { status: "PAID" } }),
    db.payment.count(),
  ]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Accounts & Fee Collection</h1>
          <p className="page-subtitle">Track outstanding student fees, collection transactions, and fee schedules</p>
        </div>
      </div>
      <div className="stats-grid">
        <Link href="/accountant/invoices" style={{ textDecoration: "none" }}>
          <div className="stat-card">
            <div className="stat-icon-wrap stat-icon-rose">
              <AlertCircle size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Unpaid Invoices</span>
              <span className="stat-value" style={{ color: "#fb7185" }}>{unpaid}</span>
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
              <span className="stat-value" style={{ color: "#fbbf24" }}>{partial}</span>
            </div>
          </div>
        </Link>

        <Link href="/accountant/invoices" style={{ textDecoration: "none" }}>
          <div className="stat-card">
            <div className="stat-icon-wrap stat-icon-emerald">
              <CheckCircle2 size={22} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Fully Settled</span>
              <span className="stat-value" style={{ color: "#34d399" }}>{paid}</span>
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

      <div className="card" style={{ marginTop: "12px" }}>
        <div className="card-header">
          <h3 className="card-title">Quick Financial Operations</h3>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Link href="/accountant/invoices" className="btn btn-secondary">
            <span>Manage Fee Invoices</span>
            <ArrowUpRight size={14} />
          </Link>
          <Link href="/accountant/payments" className="btn btn-primary">
            <span>Record Fee Payment</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
