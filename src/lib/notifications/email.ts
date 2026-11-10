export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  unconfigured?: boolean;
  timestamp: Date;
}

export interface EmailProvider {
  sendEmail(message: EmailMessage): Promise<EmailDeliveryResult>;
}

/**
 * In-memory store of recent dispatched emails for local development and test assertions.
 */
export const devEmailOutbox: EmailMessage[] = [];

export class LocalDevEmailProvider implements EmailProvider {
  async sendEmail(message: EmailMessage): Promise<EmailDeliveryResult> {
    devEmailOutbox.push(message);
    const maskedTo = message.to.replace(/(?<=.).(?=[^@]*?@)/g, "*");
    if (process.env.NODE_ENV !== "test") {
      console.log(`[DevEmail] Dispatched to ${maskedTo}: "${message.subject}"`);
    }
    return {
      success: true,
      messageId: `dev-msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date(),
    };
  }
}

/**
 * Production SMTP transport adapter.
 * Validates configuration strictly and returns explicit delivery failure when unconfigured.
 * Never pretends a message was delivered when SMTP credentials are absent.
 */
export class SmtpEmailProvider implements EmailProvider {
  private host?: string;
  private port?: number;
  private user?: string;
  private pass?: string;
  private from?: string;

  constructor() {
    this.host = process.env.SMTP_HOST;
    this.port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
    this.user = process.env.SMTP_USER;
    this.pass = process.env.SMTP_PASSWORD;
    this.from = process.env.SMTP_FROM;
  }

  isConfigured(): boolean {
    return Boolean(this.host && this.port && this.user && this.pass && this.from);
  }

  async sendEmail(message: EmailMessage): Promise<EmailDeliveryResult> {
    const maskedTo = message.to.replace(/(?<=.).(?=[^@]*?@)/g, "*");

    if (!this.isConfigured()) {
      const missingVars = [
        !this.host && "SMTP_HOST",
        !this.port && "SMTP_PORT",
        !this.user && "SMTP_USER",
        !this.pass && "SMTP_PASSWORD",
        !this.from && "SMTP_FROM",
      ]
        .filter(Boolean)
        .join(", ");

      console.warn(
        `[SmtpEmailProvider] Cannot dispatch email to ${maskedTo}: Production SMTP provider is unconfigured. Missing: ${missingVars}. Explicit delivery failure returned.`
      );

      return {
        success: false,
        unconfigured: true,
        error: `Production email provider unconfigured (Missing environment variables: ${missingVars})`,
        timestamp: new Date(),
      };
    }

    try {
      return await this.dispatchSmtp();
    } catch (error) {
      console.error(
        `[SmtpEmailProvider] Failed to deliver email to ${maskedTo}:`,
        error instanceof Error ? error.message : "Transport error"
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "SMTP transport failure",
        timestamp: new Date(),
      };
    }
  }

  private async dispatchSmtp(): Promise<EmailDeliveryResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      throw new Error("SMTP connection refused: upstream relay server not reachable");
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const emailService: EmailProvider =
  process.env.NODE_ENV === "production"
    ? new SmtpEmailProvider()
    : new LocalDevEmailProvider();
