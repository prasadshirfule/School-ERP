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

export type DeliveryStatus = "DELIVERED" | "QUEUED" | "FAILED" | "MOCK_SIMULATED";

export interface DispatchResult {
  total: number;
  successful: number;
  failed: number;
  simulated: number;
  channel: NotificationChannel;
  logs: Array<{
    recipient: string;
    status: DeliveryStatus;
    messageId: string;
    renderedText?: string;
    error?: string;
  }>;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length <= 4) return "****";
  return `${digits.slice(0, 2)}****${digits.slice(-4)}`;
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
    let simulated = 0;
    const isProd = process.env.NODE_ENV === "production";

    // Check credentials before processing batch
    const hasWhatsAppCreds = Boolean(
      process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
    );
    const hasSmsCreds = Boolean(process.env.FAST2SMS_API_KEY);

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
      const masked = maskPhone(rec.phone || rec.email || "Unknown");

      if (params.channel === "WHATSAPP") {
        if (!hasWhatsAppCreds) {
          if (isProd) {
            failed++;
            logs.push({
              recipient: masked,
              status: "FAILED",
              messageId: `err_unconfigured_${Date.now()}`,
              error: "WhatsApp Cloud API credentials (WHATSAPP_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID) not configured.",
            });
          } else {
            simulated++;
            logs.push({
              recipient: masked,
              status: "MOCK_SIMULATED",
              messageId: `mock_wa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              renderedText,
            });
          }
          continue;
        }

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);

          const res = await fetch(
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
              signal: controller.signal,
            }
          );
          clearTimeout(timeout);

          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            successful++;
            const providerMsgId = data.messages?.[0]?.id || `wa_${Date.now()}`;
            logs.push({
              recipient: masked,
              status: "DELIVERED",
              messageId: providerMsgId,
            });
          } else {
            failed++;
            logs.push({
              recipient: masked,
              status: "FAILED",
              messageId: `err_wa_${res.status}`,
              error: data.error?.message || `WhatsApp API error HTTP ${res.status}`,
            });
          }
        } catch (err: unknown) {
          failed++;
          const errorMsg = err instanceof Error ? err.message : "Network error";
          logs.push({
            recipient: masked,
            status: "FAILED",
            messageId: `err_${Date.now()}`,
            error: errorMsg,
          });
        }
      } else if (params.channel === "SMS") {
        if (!hasSmsCreds) {
          if (isProd) {
            failed++;
            logs.push({
              recipient: masked,
              status: "FAILED",
              messageId: `err_unconfigured_${Date.now()}`,
              error: "SMS Gateway credentials (FAST2SMS_API_KEY) not configured.",
            });
          } else {
            simulated++;
            logs.push({
              recipient: masked,
              status: "MOCK_SIMULATED",
              messageId: `mock_sms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              renderedText,
            });
          }
          continue;
        }

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);

          const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
            method: "POST",
            headers: {
              authorization: process.env.FAST2SMS_API_KEY || "",
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
            signal: controller.signal,
          });
          clearTimeout(timeout);

          const data = await res.json().catch(() => ({}));
          if (res.ok && data.return === true) {
            successful++;
            logs.push({
              recipient: masked,
              status: "DELIVERED",
              messageId: data.request_id || `sms_${Date.now()}`,
            });
          } else {
            failed++;
            logs.push({
              recipient: masked,
              status: "FAILED",
              messageId: `err_sms_${res.status}`,
              error: Array.isArray(data.message) ? data.message.join(", ") : data.message || `SMS dispatch failed (${res.status})`,
            });
          }
        } catch (err: unknown) {
          failed++;
          const errorMsg = err instanceof Error ? err.message : "Network error";
          logs.push({
            recipient: masked,
            status: "FAILED",
            messageId: `err_${Date.now()}`,
            error: errorMsg,
          });
        }
      } else {
        // Unimplemented channel fallback
        failed++;
        logs.push({
          recipient: masked,
          status: "FAILED",
          messageId: `err_unsupported_${Date.now()}`,
          error: `Channel ${params.channel} is not configured or unsupported.`,
        });
      }
    }

    return {
      total: params.recipients.length,
      successful,
      failed,
      simulated,
      channel: params.channel,
      logs,
    };
  },
};
