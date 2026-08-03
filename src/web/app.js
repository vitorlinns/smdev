const POLL_INTERVAL_MS = 3000;

let selectedId = null;
let lastListSignature = '';

const listEl = document.getElementById('message-list');
const emptyStateEl = document.getElementById('empty-state');
const detailEl = document.getElementById('message-detail');
const clearAllBtn = document.getElementById('clear-all');

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

async function fetchList() {
  const res = await fetch('/api/messages');
  const messages = await res.json();
  const signature = JSON.stringify(messages.map((m) => m.id));
  if (signature === lastListSignature) return;
  lastListSignature = signature;
  renderList(messages);
}

function renderList(messages) {
  listEl.innerHTML = '';
  emptyStateEl.hidden = messages.length > 0;

  for (const msg of messages) {
    const li = document.createElement('li');
    li.className = 'message-item' + (msg.id === selectedId ? ' selected' : '');
    li.dataset.id = msg.id;

    const subject = document.createElement('div');
    subject.className = 'subject';
    subject.textContent = msg.subject;

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `${msg.from} → ${msg.to}`;

    const preview = document.createElement('div');
    preview.className = 'preview';
    preview.textContent = msg.preview;

    const date = document.createElement('div');
    date.className = 'date';
    date.textContent = formatDate(msg.date);

    li.append(subject, meta, preview, date);
    li.addEventListener('click', () => selectMessage(msg.id));
    listEl.appendChild(li);
  }
}

async function selectMessage(id) {
  selectedId = id;
  document.querySelectorAll('.message-item').forEach((el) => {
    el.classList.toggle('selected', el.dataset.id === id);
  });

  const res = await fetch(`/api/messages/${id}`);
  if (!res.ok) {
    detailEl.innerHTML = '<p class="placeholder">Email não encontrado (pode ter sido removido).</p>';
    return;
  }
  const msg = await res.json();
  renderDetail(msg);
}

function renderDetail(msg) {
  detailEl.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'detail-header';

  const subject = document.createElement('h2');
  subject.textContent = msg.subject;

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = `De: ${msg.from} — Para: ${msg.to} — ${formatDate(msg.date)}`;

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'danger small';
  deleteBtn.textContent = 'Excluir';
  deleteBtn.addEventListener('click', () => deleteMessage(msg.id));

  header.append(subject, meta, deleteBtn);
  detailEl.appendChild(header);

  if (msg.otp) {
    const otpBox = document.createElement('div');
    otpBox.className = 'otp-box';

    const label = document.createElement('span');
    label.textContent = 'Código detectado: ';

    const code = document.createElement('strong');
    code.textContent = msg.otp;

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copiar';
    copyBtn.className = 'small';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(msg.otp);
      copyBtn.textContent = 'Copiado!';
      setTimeout(() => (copyBtn.textContent = 'Copiar'), 1500);
    });

    otpBox.append(label, code, copyBtn);
    detailEl.appendChild(otpBox);
  }

  const tabs = document.createElement('div');
  tabs.className = 'tabs';
  const htmlTabBtn = document.createElement('button');
  htmlTabBtn.textContent = 'HTML';
  htmlTabBtn.className = 'tab-btn active';
  const textTabBtn = document.createElement('button');
  textTabBtn.textContent = 'Texto';
  textTabBtn.className = 'tab-btn';
  tabs.append(htmlTabBtn, textTabBtn);
  detailEl.appendChild(tabs);

  const htmlPane = document.createElement('iframe');
  htmlPane.className = 'html-pane';
  htmlPane.sandbox = '';
  htmlPane.srcdoc = msg.html || '<p style="font-family: sans-serif; color: #888;">(sem HTML)</p>';

  const textPane = document.createElement('pre');
  textPane.className = 'text-pane';
  textPane.hidden = true;
  textPane.textContent = msg.text || '(sem texto simples)';

  htmlTabBtn.addEventListener('click', () => {
    htmlTabBtn.classList.add('active');
    textTabBtn.classList.remove('active');
    htmlPane.hidden = false;
    textPane.hidden = true;
  });
  textTabBtn.addEventListener('click', () => {
    textTabBtn.classList.add('active');
    htmlTabBtn.classList.remove('active');
    textPane.hidden = false;
    htmlPane.hidden = true;
  });

  detailEl.append(htmlPane, textPane);
}

async function deleteMessage(id) {
  await fetch(`/api/messages/${id}`, { method: 'DELETE' });
  if (selectedId === id) {
    selectedId = null;
    detailEl.innerHTML = '<p class="placeholder">Selecione um email na lista à esquerda.</p>';
  }
  lastListSignature = '';
  fetchList();
}

clearAllBtn.addEventListener('click', async () => {
  await fetch('/api/messages', { method: 'DELETE' });
  selectedId = null;
  lastListSignature = '';
  detailEl.innerHTML = '<p class="placeholder">Selecione um email na lista à esquerda.</p>';
  fetchList();
});

fetchList();
setInterval(fetchList, POLL_INTERVAL_MS);
