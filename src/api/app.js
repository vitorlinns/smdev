const path = require('path');
const express = require('express');
const inbox = require('../store/inbox');

function createApiApp() {
  const app = express();

  app.get('/api/messages', (req, res) => {
    res.json(inbox.list());
  });

  app.get('/api/messages/:id', (req, res) => {
    const message = inbox.get(req.params.id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.json(message);
  });

  app.delete('/api/messages/:id', (req, res) => {
    const removed = inbox.remove(req.params.id);
    if (!removed) {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.status(204).end();
  });

  app.delete('/api/messages', (req, res) => {
    inbox.clear();
    res.status(204).end();
  });

  app.use(express.static(path.join(__dirname, '..', 'web')));

  return app;
}

module.exports = { createApiApp };
