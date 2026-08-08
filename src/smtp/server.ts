import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';
import { v4 as uuidv4 } from 'uuid';
import inbox from '../store/inbox';
import type { EmailMessage } from '../types';

const OTP_DIGITS_REGEX = /\b\d{4,8}\b/g;
const OTP_CONTEXT_REGEX =
  /c[oó]digo|verifica[cç][aã]o|confirma[cç][aã]o|confirmar|\bsenha\b|autentica[cç][aã]o|\botp\b|\bpin\b|verification|confirmation|\bverify\b|security code|access code|one[- ]time|passcode|password reset|reset.{0,15}password/i;

const CONTEXT_WINDOW = 40;

function extractOtp(text: string | null | undefined): string | null {
  if (!text) return null;
  for (const match of text.matchAll(OTP_DIGITS_REGEX)) {
    const start = Math.max(0, match.index - CONTEXT_WINDOW);
    const end = Math.min(text.length, match.index + match[0].length + CONTEXT_WINDOW);
    if (OTP_CONTEXT_REGEX.test(text.slice(start, end))) {
      return match[0];
    }
  }
  return null;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ');
}

function resolveBodyText(text: string, html: string): string {
  return text || (html ? stripHtml(html) : '');
}

function makePreview(bodyText: string): string {
  return bodyText.replace(/\s+/g, ' ').trim().slice(0, 140);
}

export function createSmtpServer(): SMTPServer {
  return new SMTPServer({
    authOptional: true,
    disabledCommands: ['STARTTLS'],
    logger: false,
    onAuth(auth, _session, callback) {
      callback(null, { user: auth.username || 'anonymous' });
    },
    onData(stream, session, callback) {
      simpleParser(stream)
        .then((parsed) => {
          const text = parsed.text || '';
          const html = typeof parsed.html === 'string' ? parsed.html : '';
          const bodyText = resolveBodyText(text, html);
          const message: EmailMessage = {
            id: uuidv4(),
            from: parsed.from
              ? parsed.from.text
              : session.envelope.mailFrom
                ? session.envelope.mailFrom.address
                : 'unknown',
            to: parsed.to
              ? Array.isArray(parsed.to)
                ? parsed.to.map((t) => t.text).join(', ')
                : parsed.to.text
              : (session.envelope.rcptTo || []).map((r) => r.address).join(', '),
            subject: parsed.subject || '(no subject)',
            date: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
            text,
            html,
            headers: Object.fromEntries(
              (parsed.headerLines || []).map((h) => [h.key, h.line])
            ),
            otp: extractOtp(bodyText),
            preview: makePreview(bodyText),
            read: false,
          };
          inbox.add(message);
          callback();
        })
        .catch((err) => callback(err));
    },
  });
}
