import path from 'path';
import express, { Express, Request, Response } from 'express';
import inbox from '../store/inbox';

export function createApiApp(): Express {
  const app = express();

  app.get('/api/messages', (_req: Request, res: Response) => {
    res.json(inbox.list());
  });

  app.get('/api/messages/:id', (req: Request<{ id: string }>, res: Response) => {
    const message = inbox.get(req.params.id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
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
