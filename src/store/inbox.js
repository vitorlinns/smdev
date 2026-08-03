const MAX_MESSAGES = Number(process.env.INBOX_MAX_MESSAGES) || 200;

let messages = [];

function add(message) {
  messages.unshift(message);
  if (messages.length > MAX_MESSAGES) {
    messages.length = MAX_MESSAGES;
  }
  return message;
}

function list() {
  return messages.map(({ id, from, to, subject, date, preview }) => ({
    id,
    from,
    to,
    subject,
    date,
    preview,
  }));
}

function get(id) {
  return messages.find((m) => m.id === id) || null;
}

function remove(id) {
  const index = messages.findIndex((m) => m.id === id);
  if (index === -1) return false;
  messages.splice(index, 1);
  return true;
}

function clear() {
  messages = [];
}

module.exports = { add, list, get, remove, clear };
