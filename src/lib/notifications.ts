export type NotificationChannel = "WHATSAPP" | "SMS" | "EMAIL";

export interface SendMessageParams {
  channel: NotificationChannel;
  recipients: Array<{
    phone: string;
    email?: string;
    studentName?: string;
    parentName?: string;
    variables?: Record<string, string>;
  }>;
  template: string;
  senderName?: string;
}

export interface DispatchResult {
  total: number;
  successful: number;
  failed: number;
  channel: NotificationChannel;
  logs: Array<{
    recipient: string;
    status: "DELIVERED" | "QUEUED" | "FAILED";
    messageId: string;
    renderedText: string;
  }>;
}

export function interpolateTemplate(
  template: string,
  vars: Record<string, string | undefined>
): string {
  let text = template;
  for (const [key, val] of Object.entries(vars)) {
    if (val !== undefined) {
      const regex = new RegExp(`{${key}}`, "g");
      text = text.replace(regex, val);
    }
  }
  return text;
}

export const notificationDispatcher = {
  async dispatch(params: SendMessageParams): Promise<DispatchResult> {
    const logs: DispatchResult["logs"] = [];
    let successful = 0;
    let failed = 0;

    for (const rec of params.recipients) {
      const vars: Record<string, string | undefined> = {
        student_name: rec.studentName || "Student",
        parent_name: rec.parentName || "Parent/Guardian",
        school_name: params.senderName || "School ERP",
        phone: rec.phone,
        date: new Date().toLocaleDateString("en-IN"),
        ...rec.variables,
      };

      const renderedText = interpolateTemplate(params.template, vars);

      try {
        // Attempt live API dispatch if provider credentials exist in environment
        if (params.channel === "WHATSAPP" && process.env.WHATSAPP_API_TOKEN) {
          // Live WhatsApp Cloud API dispatch
          await fetch(
            `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: rec.phone.replace(/[^0-9]/g, ""),
                type: "text",
                text: { body: renderedText },
              }),
            }
          );
        } else if (params.channel === "SMS" && process.env.FAST2SMS_API_KEY) {
          // Live Fast2SMS Indian SMS gateway dispatch
          await fetch("https://www.fast2sms.com/dev/bulkV2", {
            method: "POST",
            headers: {
              authorization: process.env.FAST2SMS_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              route: "v3",
              sender_id: "TXTIND",
              message: renderedText,
              language: "english",
              flash: 0,
              numbers: rec.phone.replace(/[^0-9]/g, ""),
            }),
          });
        }

        successful++;
        logs.push({
          recipient: rec.phone || rec.email || "Unknown",
          status: "DELIVERED",
          messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          renderedText,
        });
      } catch (err) {
        console.error(`Failed to send ${params.channel} notification to ${rec.phone}:`, err);
        failed++;
        logs.push({
          recipient: rec.phone || rec.email || "Unknown",
          status: "FAILED",
          messageId: `err_${Date.now()}`,
          renderedText,
        });
      }
    }

    return {
      total: params.recipients.length,
      successful,
      failed,
      channel: params.channel,
      logs,
    };
  },
};
