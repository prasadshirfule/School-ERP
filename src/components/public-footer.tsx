"use client";

import Link from "next/link";

export default function PublicFooter() {
  return (
    <footer
      style={{
        backgroundColor: "#0f172a",
        color: "#e2e8f0",
        padding: "48px 24px 28px",
        marginTop: "60px",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "32px",
          marginBottom: "32px",
        }}
      >
        {/* Company */}
        <div>
          <h4 style={{ margin: "0 0 14px 0", fontSize: "14px", fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Company
          </h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
            <li><Link href="/" style={{ color: "#94a3b8", fontSize: "13.5px", textDecoration: "none" }}>Home</Link></li>
            <li><Link href="/request-access" style={{ color: "#94a3b8", fontSize: "13.5px", textDecoration: "none" }}>Register Your School</Link></li>
            <li><Link href="/parent-signup" style={{ color: "#94a3b8", fontSize: "13.5px", textDecoration: "none" }}>Parent Registration</Link></li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 style={{ margin: "0 0 14px 0", fontSize: "14px", fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Legal
          </h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
            <li><Link href="/terms" style={{ color: "#94a3b8", fontSize: "13.5px", textDecoration: "none" }}>Terms of Service</Link></li>
            <li><Link href="/privacy" style={{ color: "#94a3b8", fontSize: "13.5px", textDecoration: "none" }}>Privacy Policy</Link></li>
            <li><Link href="/refund" style={{ color: "#94a3b8", fontSize: "13.5px", textDecoration: "none" }}>Refund &amp; Cancellation</Link></li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h4 style={{ margin: "0 0 14px 0", fontSize: "14px", fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Support
          </h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
            <li><Link href="/contact" style={{ color: "#94a3b8", fontSize: "13.5px", textDecoration: "none" }}>Contact Us</Link></li>
            <li><span style={{ color: "#94a3b8", fontSize: "13.5px" }}>support@schoolerp.cloud</span></li>
            <li><span style={{ color: "#94a3b8", fontSize: "13.5px" }}>Mon – Sat, 9 AM – 6 PM IST</span></li>
          </ul>
        </div>

        {/* Connect */}
        <div>
          <h4 style={{ margin: "0 0 14px 0", fontSize: "14px", fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Platform
          </h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
            <li><span style={{ color: "#94a3b8", fontSize: "13.5px" }}>Neon PostgreSQL Powered</span></li>
            <li><span style={{ color: "#94a3b8", fontSize: "13.5px" }}>DPDP Act Compliant</span></li>
            <li><span style={{ color: "#94a3b8", fontSize: "13.5px" }}>256-bit SSL Encrypted</span></li>
          </ul>
        </div>
      </div>

      {/* Copyright */}
      <div
        style={{
          borderTop: "1px solid #1e293b",
          paddingTop: "20px",
          textAlign: "center",
          fontSize: "12.5px",
          color: "#64748b",
        }}
      >
        © 2026 School ERP Cloud. All Rights Reserved. Made with ❤️ in India.
      </div>
    </footer>
  );
}
