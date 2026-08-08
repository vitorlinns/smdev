import type { EmailMessage, MessageSummary } from '../types';

const MAX_MESSAGES = Number(process.env.INBOX_MAX_MESSAGES) || 200;

let messages: EmailMessage[] = [];

function add(message: EmailMessage): EmailMessage {
  messages.unshift(message);
  if (messages.length > MAX_MESSAGES) {
    messages.length = MAX_MESSAGES;
  }
  return message;
}

function list(): MessageSummary[] {
  return messages.map(({ id, from, to, subject, date, preview, read }) => ({
    id,
    from,
    to,
    subject,
    date,
    preview,
    read,
  }));
}

function get(id: string): EmailMessage | null {
  return messages.find((m) => m.id === id) || null;
}

function markRead(id: string): boolean {
  const message = messages.find((m) => m.id === id);
  if (!message) return false;
  message.read = true;
  return true;
}

function remove(id: string): boolean {
  const index = messages.findIndex((m) => m.id === id);
  if (index === -1) return false;
  messages.splice(index, 1);
  return true;
}

function clear(): void {
  messages = [];
}

export default { add, list, get, remove, clear, markRead };
