export interface EmailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  text: string;
  html: string;
  headers: Record<string, string>;
  otp: string | null;
  preview: string;
}

export type MessageSummary = Pick<
  EmailMessage,
  'id' | 'from' | 'to' | 'subject' | 'date' | 'preview'
>;
