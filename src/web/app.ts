import type { EmailMessage, MessageSummary } from '../types';

const POLL_INTERVAL_MS = 3000;
const PAGE_SIZE = 20;

type FilterMode = 'all' | 'unread';

let selectedId: string | null = null;
let lastListSignature = '';
let visibleCount = PAGE_SIZE;
let filterMode: FilterMode = 'all';
let currentMessages: MessageSummary[] = [];

const listEl = document.getElementById('message-list') as HTMLUListElement;
const emptyStateEl = document.getElementById('empty-state') as HTMLElement;
const emptyStateTextEl = emptyStateEl.querySelector('p') as HTMLElement;
const detailEl = document.getElementById('message-detail') as HTMLElement;
const clearAllBtn = document.getElementById('clear-all') as HTMLButtonElement;
const filterButtons = document.querySelectorAll<HTMLButtonElement>('.filter-btn');

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatListDate(iso: string): string {
  try {
    const date = new Date(iso);
    const sameDay = date.toDateString() === new Date().toDateString();
    return sameDay
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString([], { day: '2-digit', month: 'short' });
  } catch {
    return iso;
  }
}

function getInitials(from: string): string {
  const name = from.includes('<') ? from.slice(0, from.indexOf('<')) : from.split('@')[0];
  const words = name.replace(/["<>]/g, '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const initials = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0];
  return initials.toUpperCase();
}

const AVATAR_COLORS = [
  '#4f46e5', // indigo
  '#2563eb', // blue
  '#0ea5e9', // sky
  '#0891b2', // cyan
  '#0d9488', // teal
  '#7c3aed', // violet
  '#9333ea', // purple
  '#db2777', // pink
];

function getAvatarColor(from: string): string {
  let hash = 0;
  for (let i = 0; i < from.length; i++) {
    hash = (hash << 5) - hash + from.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const PLACEHOLDER_ICON = `<svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">
  <path d="M3.5 6.5h17a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
  <path d="m3 7 9 6.5L21 7" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

function renderPlaceholder(text: string): void {
  detailEl.innerHTML = `<div class="placeholder">${PLACEHOLDER_ICON}<p>${text}</p></div>`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function fetchList(): Promise<void> {
  const res = await fetch('/api/messages');
  const messages: MessageSummary[] = await res.json();
  const signature = JSON.stringify(messages.map((m) => `${m.id}:${m.read}`));
  if (signature === lastListSignature) return;
  lastListSignature = signature;
  renderList(messages);
}

function updateEmptyState(filteredCount: number, totalCount: number): void {
  emptyStateEl.hidden = filteredCount > 0;
  if (filteredCount > 0) return;
  emptyStateTextEl.innerHTML =
    totalCount === 0
      ? 'Nenhum email ainda.<br />Envie um SMTP pra <code>localhost:1025</code>.'
      : 'Nenhum email não lido.';
}

function renderList(messages: MessageSummary[]): void {
  currentMessages = messages;
  const filtered = filterMode === 'unread' ? messages.filter((m) => !m.read) : messages;

  listEl.innerHTML = '';
  updateEmptyState(filtered.length, messages.length);

  const visibleMessages = filtered.slice(0, visibleCount);

  for (const msg of visibleMessages) {
    const li = document.createElement('li');
    li.className =
      'message-item' + (msg.id === selectedId ? ' selected' : '') + (!msg.read ? ' unread' : '');
    li.dataset.id = msg.id;

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.style.background = getAvatarColor(msg.from);
    avatar.textContent = getInitials(msg.from);

    const content = document.createElement('div');
    content.className = 'message-item-content';

    const top = document.createElement('div');
    top.className = 'item-top';

    const subjectWrap = document.createElement('span');
    subjectWrap.className = 'subject-wrap';

    if (!msg.read) {
      const dot = document.createElement('span');
      dot.className = 'unread-dot';
      subjectWrap.appendChild(dot);
    }

    const subject = document.createElement('span');
    subject.className = 'subject';
    subject.textContent = msg.subject;
    subjectWrap.appendChild(subject);

    const date = document.createElement('span');
    date.className = 'date';
    date.textContent = formatListDate(msg.date);

    top.append(subjectWrap, date);

    const meta = document.createElement('div');
    meta.className = 'meta';

    const fromSpan = document.createElement('span');
    fromSpan.className = 'from';
    fromSpan.textContent = msg.from;

    const arrow = document.createElement('span');
    arrow.className = 'arrow';
    arrow.textContent = '→';
    arrow.setAttribute('aria-hidden', 'true');

    const toSpan = document.createElement('span');
    toSpan.className = 'to';
    toSpan.textContent = msg.to;

    meta.append(fromSpan, arrow, toSpan);

    const preview = document.createElement('div');
    preview.className = 'preview';
    preview.textContent = msg.preview;

    content.append(top, meta, preview);
    li.append(avatar, content);
    li.addEventListener('click', () => selectMessage(msg.id));
    listEl.appendChild(li);
  }

  if (filtered.length > visibleMessages.length) {
    const loadMoreLi = document.createElement('li');
    loadMoreLi.className = 'load-more';

    const loadMoreBtn = document.createElement('button');
    loadMoreBtn.className = 'load-more-btn';
    loadMoreBtn.textContent = `Exibir mais (${filtered.length - visibleMessages.length})`;
    loadMoreBtn.addEventListener('click', () => {
      visibleCount += PAGE_SIZE;
      renderList(messages);
    });

    loadMoreLi.appendChild(loadMoreBtn);
    listEl.appendChild(loadMoreLi);
  }
}

async function selectMessage(id: string): Promise<void> {
  selectedId = id;
  document.querySelectorAll('.message-item').forEach((el) => {
    el.classList.toggle('selected', (el as HTMLElement).dataset.id === id);
  });

  const res = await fetch(`/api/messages/${id}`);
  if (!res.ok) {
    renderPlaceholder('Email não encontrado (pode ter sido removido).');
    return;
  }
  const msg: EmailMessage = await res.json();
  renderDetail(msg);

  const localMsg = currentMessages.find((m) => m.id === id);
  if (localMsg && !localMsg.read) {
    localMsg.read = true;
    renderList(currentMessages);
  }
}

function renderDetail(msg: EmailMessage): void {
  detailEl.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'detail-header';

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.style.background = getAvatarColor(msg.from);
  avatar.textContent = getInitials(msg.from);

  const headerText = document.createElement('div');
  headerText.className = 'detail-header-text';

  const subject = document.createElement('h2');
  subject.textContent = msg.subject;

  const meta = document.createElement('div');
  meta.className = 'meta';

  const fromRow = document.createElement('span');
  fromRow.innerHTML = `<span class="meta-label">De</span> ${msg.from}`;

  const toRow = document.createElement('span');
  toRow.innerHTML = `<span class="meta-label">Para</span> ${msg.to}`;

  const dateRow = document.createElement('span');
  dateRow.textContent = formatDate(msg.date);

  meta.append(fromRow, toRow, dateRow);
  headerText.append(subject, meta);

  header.append(avatar, headerText);
  detailEl.appendChild(header);

  const bodyLabel = document.createElement('div');
  bodyLabel.className = 'body-label';
  bodyLabel.textContent = 'Corpo da mensagem';
  detailEl.appendChild(bodyLabel);

  const bodyText =
    msg.text || (msg.html ? msg.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '');

  let bodyHtml = escapeHtml(bodyText || '(sem conteúdo)');
  if (msg.otp) {
    bodyHtml = bodyHtml.replace(
      new RegExp(`\\b${msg.otp}\\b`, 'g'),
      `<mark class="otp-highlight">${msg.otp}</mark>`
    );
  }

  const bodyPane = document.createElement('pre');
  bodyPane.className = 'message-body';
  bodyPane.innerHTML = bodyHtml;

  detailEl.appendChild(bodyPane);

  if (msg.otp) {
    const mark = bodyPane.querySelector<HTMLElement>('.otp-highlight');
    if (mark) {
      mark.title = 'Clique para copiar';
      mark.addEventListener('click', () => {
        navigator.clipboard.writeText(msg.otp as string);
        const original = mark.textContent;
        mark.textContent = 'Copiado!';
        setTimeout(() => {
          mark.textContent = original;
        }, 1200);
      });
    }
  }

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'danger delete-message-btn';
  deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="currentColor">
    <path d="M17 6H22V8H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V8H2V6H7V3C7 2.44772 7.44772 2 8 2H16C16.5523 2 17 2.44772 17 3V6ZM18 8H6V20H18V8ZM9 11H11V17H9V11ZM13 11H15V17H13V11ZM9 4V6H15V4H9Z" />
  </svg>Excluir`;
  deleteBtn.addEventListener('click', () => deleteMessage(msg.id));

  detailEl.appendChild(deleteBtn);
}

function closeDetail(): void {
  selectedId = null;
  document.querySelectorAll('.message-item.selected').forEach((el) => el.classList.remove('selected'));
  renderPlaceholder('Selecione um email na lista à esquerda.');
}

async function deleteMessage(id: string): Promise<void> {
  await fetch(`/api/messages/${id}`, { method: 'DELETE' });
  if (selectedId === id) {
    closeDetail();
  }
  lastListSignature = '';
  fetchList();
}

clearAllBtn.addEventListener('click', async () => {
  await fetch('/api/messages', { method: 'DELETE' });
  visibleCount = PAGE_SIZE;
  closeDetail();
  fetchList();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && selectedId !== null) {
    closeDetail();
  }
});

filterButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const mode: FilterMode = btn.dataset.filter === 'unread' ? 'unread' : 'all';
    if (mode === filterMode) return;
    filterMode = mode;
    visibleCount = PAGE_SIZE;
    filterButtons.forEach((b) => b.classList.toggle('active', b === btn));
    renderList(currentMessages);
  });
});

fetchList();
setInterval(fetchList, POLL_INTERVAL_MS);
