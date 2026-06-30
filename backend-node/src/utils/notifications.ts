interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  attachments?: Array<{ filename: string; content: string }>;
}

interface WhatsAppPayload {
  to: string;
  message: string;
}

export async function sendInvoiceEmail(payload: EmailPayload): Promise<{ success: boolean; provider: string; messageId: string }> {
  console.log(`[MAIL STUB] Sending invoice email to ${payload.to}`);
  console.log(`[MAIL STUB] Subject: ${payload.subject}`);
  if (payload.attachments && payload.attachments.length > 0) {
    console.log(`[MAIL STUB] Attachments: ${payload.attachments.map((a) => a.filename).join(', ')}`);
  }

  return {
    success: true,
    provider: 'mock-smtp',
    messageId: `mock-mail-${Date.now()}`,
  };
}

export async function sendWhatsAppMessage(payload: WhatsAppPayload): Promise<{ success: boolean; provider: string; messageId: string }> {
  console.log(`[WHATSAPP STUB] Sending WhatsApp message to ${payload.to}`);
  console.log(`[WHATSAPP STUB] Message: ${payload.message.substring(0, 100)}...`);

  return {
    success: true,
    provider: 'mock-whatsapp',
    messageId: `mock-wa-${Date.now()}`,
  };
}
