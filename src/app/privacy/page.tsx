import PublicFooter from "@/components/public-footer";

export default function PrivacyPage() {
  return (
    <>
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 20px", color: "#334155", lineHeight: "1.7", fontSize: "15px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#0f172a", marginBottom: "8px" }}>Privacy Policy</h1>
        <p style={{ color: "#64748b", marginBottom: "32px" }}>Last updated: November 2026 · Compliant with the Digital Personal Data Protection (DPDP) Act, 2023</p>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginTop: "32px" }}>1. Data We Collect</h2>
        <p>We collect the following categories of personal data necessary to operate the School ERP platform:</p>
        <ul>
          <li><strong>School Data:</strong> Institution name, board affiliation, address, contact details, principal information.</li>
          <li><strong>Staff Data:</strong> Administrator, teacher, and accountant names, emails, phone numbers.</li>
          <li><strong>Student Data:</strong> Full name, admission number, date of birth, gender, blood group, photographs, class/section assignment, academic records, attendance, and fee payment history.</li>
          <li><strong>Parent Data:</strong> Names, email addresses, phone numbers, relationship to students.</li>
          <li><strong>Technical Data:</strong> IP addresses (for rate limiting and security), browser user-agent, session tokens.</li>
        </ul>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginTop: "32px" }}>2. Purpose of Data Processing</h2>
        <p>Personal data is processed exclusively for: (a) providing the school ERP service; (b) facilitating academic administration; (c) enabling secure parent-student-school communication; (d) processing fee payments via Razorpay; (e) platform security and audit compliance.</p>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginTop: "32px" }}>3. Data Storage &amp; Security</h2>
        <p>All data is stored on <strong>Neon PostgreSQL</strong> (cloud-managed PostgreSQL) with encryption at rest and TLS encryption in transit. Database credentials are never exposed in client-side code. Multi-tenant architecture ensures strict isolation — each school&apos;s data is physically separated from other institutions.</p>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginTop: "32px" }}>4. Data Sharing</h2>
        <p>We do <strong>not</strong> sell, rent, or share personal data with third parties for marketing. Data is shared only with: (a) Razorpay — for processing fee payments (subject to their privacy policy); (b) government authorities — if legally required by Indian law.</p>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginTop: "32px" }}>5. Student Data Protection</h2>
        <p>Student data receives the highest level of protection. Access to student records is restricted to authorized school administrators, assigned teachers, and verified parents. All student data operations are tenant-scoped with row-level security enforcement.</p>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginTop: "32px" }}>6. Parental Consent</h2>
        <p>Student data is uploaded to the platform by the school administration, which is deemed the data fiduciary for its students. Parents can verify and access their child&apos;s records through the authenticated parent portal after school-approved link verification.</p>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginTop: "32px" }}>7. Data Retention</h2>
        <p>Student academic records, attendance, and fee payment history are retained for a minimum of <strong>10 years</strong> in accordance with Indian educational regulatory requirements. Archived student records are preserved in read-only historical tables with full academic integrity.</p>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginTop: "32px" }}>8. Data Portability &amp; Export</h2>
        <p>Schools can export all institutional data at any time via the built-in data export facility in CSV and JSON formats. This includes student registries, attendance logs, and fee ledgers — all strictly scoped to the exporting school&apos;s tenant.</p>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginTop: "32px" }}>9. Your Rights Under the DPDP Act</h2>
        <p>As a Data Principal, you have the right to: (a) access your personal data; (b) request correction of inaccurate data; (c) request erasure of data (subject to statutory retention obligations); (d) nominate another person to exercise your rights; (e) grievance redressal.</p>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginTop: "32px" }}>10. Cookies</h2>
        <p>We use essential session cookies for authentication. We do not use advertising or third-party tracking cookies.</p>

        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginTop: "32px" }}>11. Contact the Data Protection Officer</h2>
        <p>For privacy-related inquiries, data access requests, or to exercise your DPDP Act rights, contact: <strong>dpo@schoolerp.cloud</strong></p>
      </div>
      <PublicFooter />
    </>
  );
}
