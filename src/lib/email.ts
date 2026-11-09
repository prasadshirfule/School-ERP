/**
 * Transactional Email Service
 *
 * Development: Logs emails to console.
 * Production: Sends via SMTP using configured EMAIL_* environment variables.
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const { to, subject, html } = options;

  // Development mode: log to console
  if (process.env.NODE_ENV !== "production") {
    console.log(`\n📧 [EMAIL - DEV MODE] ────────────────────────`);
    console.log(`   To:      ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body:    (${html.length} chars HTML)`);
    console.log(`──────────────────────────────────────────────\n`);
    return true;
  }

  // Production mode: send via SMTP
  try {
    // @ts-expect-error nodemailer is an optional production dependency
    const nodemailer = await import("nodemailer").catch(() => null);
    if (!nodemailer) {
      console.error("[EMAIL] nodemailer is not installed. Run: npm install nodemailer");
      return false;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"School ERP Cloud" <noreply@schoolerp.cloud>`,
      to,
      subject,
      html,
    });

    return true;
  } catch (error) {
    console.error("[EMAIL] Failed to send email:", error);
    return false;
  }
}

// ─── Email Templates ────────────────────────────────────────────

const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .header { background: #1e3a8a; color: #fff; padding: 28px 32px; text-align: center; }
  .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
  .body { padding: 32px; color: #334155; line-height: 1.6; font-size: 15px; }
  .body h2 { color: #0f172a; font-size: 18px; margin: 0 0 16px 0; }
  .btn { display: inline-block; padding: 12px 28px; background: #1e3a8a; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 16px 0; }
  .footer { padding: 20px 32px; background: #f8fafc; color: #94a3b8; font-size: 12px; text-align: center; border-top: 1px solid #e2e8f0; }
`;

function wrapTemplate(content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyles}</style></head><body><div class="container">${content}</div></body></html>`;
}

export function getSchoolApprovalEmailHtml(schoolName: string, adminName: string): string {
  return wrapTemplate(`
    <div class="header"><h1>🎉 School Registration Approved!</h1></div>
    <div class="body">
      <h2>Welcome to School ERP Cloud, ${adminName}!</h2>
      <p>We are delighted to inform you that <strong>${schoolName}</strong> has been successfully verified and approved on the School ERP Cloud platform.</p>
      <p>Your institution has been activated with a <strong>complimentary 30-day trial</strong> of the Professional plan, which includes:</p>
      <ul>
        <li>Complete Student & Staff Management</li>
        <li>Daily Attendance Tracking & Report Cards</li>
        <li>Fee Invoicing & Online Payment Collection</li>
        <li>Parent Self-Registration & Mobile Portal</li>
        <li>Timetable, Syllabus & Leave Management</li>
      </ul>
      <p>Log in with your registered administrator credentials to begin configuring your academic year:</p>
      <p style="text-align: center;"><a class="btn" href="#">Log In to Your Dashboard →</a></p>
      <p style="color: #64748b; font-size: 13px;">If you have any questions, contact our support team at support@schoolerp.cloud.</p>
    </div>
    <div class="footer">© 2026 School ERP Cloud. All Rights Reserved.</div>
  `);
}

export function getParentLinkApprovalEmailHtml(parentName: string, studentName: string, schoolName: string): string {
  return wrapTemplate(`
    <div class="header"><h1>✅ Student Link Approved</h1></div>
    <div class="body">
      <h2>Hello ${parentName},</h2>
      <p>Great news! Your request to link with student <strong>${studentName}</strong> at <strong>${schoolName}</strong> has been approved by the school administration.</p>
      <p>You now have full access to:</p>
      <ul>
        <li>Daily Attendance Records</li>
        <li>Academic Report Cards & Grades</li>
        <li>Fee Invoices & Online Payments</li>
        <li>School Notices & Announcements</li>
      </ul>
      <p style="text-align: center;"><a class="btn" href="#">Open Parent Portal →</a></p>
    </div>
    <div class="footer">© 2026 School ERP Cloud. All Rights Reserved.</div>
  `);
}

export function getSubscriptionExpiryWarningEmailHtml(schoolName: string, daysRemaining: number): string {
  return wrapTemplate(`
    <div class="header" style="background: #d97706;"><h1>⚠️ Trial Expiring Soon</h1></div>
    <div class="body">
      <h2>Action Required: ${schoolName}</h2>
      <p>Your School ERP Cloud 30-day trial will expire in <strong>${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}</strong>.</p>
      <p>After expiration, your school portal will transition to <strong>read-only mode</strong>. All existing data remains 100% safe and accessible, but new records cannot be created until your subscription is renewed.</p>
      <p>Upgrade now to ensure uninterrupted access for your teachers, staff, and parents:</p>
      <p style="text-align: center;"><a class="btn" style="background: #d97706;" href="#">Upgrade Subscription →</a></p>
      <p style="color: #64748b; font-size: 13px;">Need help choosing a plan? Contact us at support@schoolerp.cloud or call +91-80-XXXX-XXXX.</p>
    </div>
    <div class="footer">© 2026 School ERP Cloud. All Rights Reserved.</div>
  `);
}
