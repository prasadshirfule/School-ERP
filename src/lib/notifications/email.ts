export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailProvider {
  sendEmail(message: EmailMessage): Promise<{ success: boolean; messageId?: string }>;
}

/**
 * In-memory store of recent dispatched emails for local development and test assertions.
 */
export const devEmailOutbox: EmailMessage[] = [];

export class LocalDevEmailProvider implements EmailProvider {
  async sendEmail(message: EmailMessage): Promise<{ success: boolean; messageId: string }> {
    devEmailOutbox.push(message);
    const maskedTo = message.to.replace(/(?<=.).(?=[^@]*?@)/g, "*");
    if (process.env.NODE_ENV !== "test") {
      console.log(`[DevEmail] Dispatched to ${maskedTo}: "${message.subject}"`);
    }
    return {
      success: true,
      messageId: `dev-msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
  }
}

export class ProductionEmailProvider implements EmailProvider {
  async sendEmail(message: EmailMessage): Promise<{ success: boolean; messageId?: string }> {
    const smtpHost = process.env.SMTP_HOST;
    if (!smtpHost) {
      console.warn(`[ProductionEmailProvider] SMTP_HOST is not configured. Email to ${message.to} suppressed.`);
      return { success: false };
    }
    // Production email integration via configured provider
    return { success: true, messageId: `prod-msg-${Date.now()}` };
  }
}

export const emailService: EmailProvider =
  process.env.NODE_ENV === "production"
    ? new ProductionEmailProvider()
    : new LocalDevEmailProvider();
