import path from 'path';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import inbox from '../store/inbox';

export function createApiApp(): Express {
  const app = express();

  app.use(cors());

  app.get('/api/messages', (req: Request, res: Response) => {
    const to = typeof req.query.to === 'string' ? req.query.to.toLowerCase() : null;
    const messages = inbox.list();
    res.json(to ? messages.filter((m) => m.to.toLowerCase().includes(to)) : messages);
  });

  app.get('/api/messages/latest', (req: Request, res: Response) => {
    const to = typeof req.query.to === 'string' ? req.query.to.toLowerCase() : '';
    if (!to) {
      return res.status(400).json({ error: 'Query param "to" is required' });
    }
    const match = inbox.list().find((m) => m.to.toLowerCase().includes(to));
    if (!match) {
      return res.status(404).json({ error: 'No message found for that recipient' });
    }
    const message = inbox.get(match.id);
    inbox.markRead(match.id);
    res.json(message);
  });

  app.get('/api/messages/:id', (req: Request<{ id: string }>, res: Response) => {
    const message = inbox.get(req.params.id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    inbox.markRead(req.params.id);
    res.json(message);
  });

  app.delete('/api/messages/:id', (req: Request<{ id: string }>, res: Response) => {
    const removed = inbox.remove(req.params.id);
    if (!removed) {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.status(204).end();
  });

  app.delete('/api/messages', (_req: Request, res: Response) => {
    inbox.clear();
    res.status(204).end();
  });

  app.use(express.static(path.join(__dirname, '..', 'web')));
  app.use(express.static(path.join(__dirname, '..', '..', 'public')));

  return app;
}
