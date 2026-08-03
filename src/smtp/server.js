const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
const { v4: uuidv4 } = require('uuid');
const inbox = require('../store/inbox');

const OTP_REGEX = /\b\d{4,8}\b/;

function extractOtp(text) {
  if (!text) return null;
  const match = text.match(OTP_REGEX);
  return match ? match[0] : null;
}

function makePreview(text, html) {
  const source = text || (html ? html.replace(/<[^>]+>/g, ' ') : '');
  return source.replace(/\s+/g, ' ').trim().slice(0, 140);
}

function createSmtpServer() {
  return new SMTPServer({
    authOptional: true,
    disabledCommands: ['STARTTLS'],
    logger: false,
    onAuth(auth, session, callback) {
      callback(null, { user: auth.username || 'anonymous' });
    },
    onData(stream, session, callback) {
      simpleParser(stream)
        .then((parsed) => {
          const text = parsed.text || '';
          const html = typeof parsed.html === 'string' ? parsed.html : '';
          const message = {
            id: uuidv4(),
            from: parsed.from
              ? parsed.from.text
              : session.envelope.mailFrom?.address || 'unknown',
            to: parsed.to
              ? parsed.to.text
              : (session.envelope.rcptTo || []).map((r) => r.address).join(', '),
            subject: parsed.subject || '(no subject)',
            date: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
            text,
            html,
            headers: Object.fromEntries(
              (parsed.headerLines || []).map((h) => [h.key, h.line])
            ),
            otp: extractOtp(text) || extractOtp(html),
            preview: makePreview(text, html),
          };
          inbox.add(message);
          callback();
        })
        .catch((err) => callback(err));
    },
  });
}

module.exports = { createSmtpServer };
