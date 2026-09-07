export interface SendResult {
  providerMessageId: string;
}

export interface SmsProvider {
  /**
   * Sends a pre-rendered SMS. `providerTemplateId` and `variableOrder` are
   * required for real providers (DLT regulation means arbitrary free text
   * cannot be sent) - callers that don't have them should not call this and
   * should log a failure instead (see lib/messaging/send.ts).
   */
  send(input: {
    to: string;
    providerTemplateId: string;
    orderedVariableValues: string[];
  }): Promise<SendResult>;
}

export interface WhatsAppProvider {
  send(input: {
    to: string;
    providerTemplateName: string;
    languageCode: string;
    orderedVariableValues: string[];
  }): Promise<SendResult>;
}

export interface EmailProvider {
  sendEmail(input: { to: string; subject: string; html: string }): Promise<SendResult>;
  verifyConfiguration(): Promise<boolean>;
}
