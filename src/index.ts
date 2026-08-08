import { createSmtpServer } from './smtp/server';
import { createApiApp } from './api/app';

const SMTP_PORT = Number(process.env.SMTP_PORT) || 1025;
const HTTP_PORT = Number(process.env.HTTP_PORT) || 8025;

const smtpServer = createSmtpServer();
smtpServer.listen(SMTP_PORT, () => {
  console.log(`SMTP server listening on port ${SMTP_PORT}`);
});

const apiApp = createApiApp();
apiApp.listen(HTTP_PORT, () => {
  console.log(`Web UI + API listening on http://localhost:${HTTP_PORT}`);
});
