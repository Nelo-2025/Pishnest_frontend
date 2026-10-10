// Kilo, the floating Organiser Assistant: a chat bubble in the bottom-right corner.
// Loaded on demand by common.js for logged-in organisers. The Claude API key
// never touches the browser: this only talks to the PishNest backend
// (assistant.php), which calls Claude and stores every conversation in the
// database, so chats follow the organiser across devices.

(function () {
  if (window.openOrganiserAssistant || document.getElementById('pn-assistant')) return;
  // Kilo is for logged-in organisers only.
  if (!isOrganiserRole(getCurrentUser())) return;

  const API = typeof API_BASE !== 'undefined' ? API_BASE : 'https://pishnest.co.uk/backend';
  const ENDPOINT = `${API}/assistant.php`;
  const DEFAULT_TITLE = 'Kilo';

  const SUGGESTIONS = [
    'Help me plan a new kids activity',
    'Give me school holiday activity ideas',
    'How do I create and publish an event?',
    'How do I build an impact report?',
    'I have a problem to report'
  ];

  let conversations = [];
  let activeId = null;
  let messages = [];
  let busy = false;
  let loaded = false;
  let loadingConversation = false;
  let isOpen = false;

  // ---------- DOM ----------

  const root = document.createElement('div');
  root.id = 'pn-assistant';
  root.className = 'pn-assistant';
  root.innerHTML = `
    <section class="pn-panel" id="pn-panel" role="dialog" aria-label="Kilo, your assistant with a thousand answers" hidden>
      <header class="pn-head">
        <span class="pn-head-avatar" aria-hidden="true">${icon('sparkles', 'icon')}</span>
        <div class="pn-head-copy">
          <strong id="pn-title">${DEFAULT_TITLE}</strong>
          <span>Your assistant with a thousand answers</span>
        </div>
        <div class="pn-head-actions">
          <button type="button" class="pn-icon-btn" id="pn-history-btn" aria-label="Past chats" title="Past chats">${icon('history', 'icon icon-sm')}</button>
          <button type="button" class="pn-icon-btn" id="pn-new-btn" aria-label="New chat" title="New chat">${icon('plus', 'icon icon-sm')}</button>
          <button type="button" class="pn-icon-btn" id="pn-close-btn" aria-label="Close Kilo" title="Close">${icon('close', 'icon icon-sm')}</button>
        </div>
      </header>

      <div class="pn-body">
        <div class="pn-thread" id="pn-thread" role="log" aria-live="polite"></div>
        <div class="pn-history" id="pn-history" hidden>
          <p class="pn-history-heading">Past chats</p>
          <div class="pn-history-list" id="pn-history-list"></div>
        </div>
      </div>

      <div class="pn-suggestions" id="pn-suggestions"></div>

      <div class="pn-form" id="pn-form">
        <label for="pn-input" class="sr-only">Message Kilo</label>
        <textarea id="pn-input" rows="1" maxlength="2000" placeholder="Type your message…" required></textarea>
        <button type="button" class="pn-send" id="pn-send" aria-label="Send">${icon('send', 'icon icon-sm')}</button>
      </div>
      <p class="pn-note">AI can make mistakes. Need a person? <a href="mailto:support@pishnest.co.uk">support@pishnest.co.uk</a></p>
    </section>

    <button type="button" class="pn-fab" id="pn-fab" aria-label="Open Kilo, your assistant" aria-expanded="false" aria-controls="pn-panel">
      <span class="pn-fab-icon pn-fab-icon-open" aria-hidden="true">${icon('sparkles', 'icon')}</span>
      <span class="pn-fab-icon pn-fab-icon-close" aria-hidden="true">${icon('close', 'icon')}</span>
    </button>
  `;
  document.body.appendChild(root);

  const $ = (id) => root.querySelector(`#${id}`);
  const panel = $('pn-panel');
  const fab = $('pn-fab');
  const thread = $('pn-thread');
  const input = $('pn-input');
  const sendBtn = $('pn-send');
  const newBtn = $('pn-new-btn');
  const historyBtn = $('pn-history-btn');
  const closeBtn = $('pn-close-btn');
  const historyEl = $('pn-history');
  const historyList = $('pn-history-list');
  const suggestionsEl = $('pn-suggestions');
  const titleEl = $('pn-title');

  // ---------- helpers ----------

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function inlineFormat(text) {
    return escapeHtml(text)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[\s(])\*([^*\s][^*]*)\*(?=[\s).,!?]|$)/g, '$1<em>$2</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/(https?:\/\/[^\s<)]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, '<a href="mailto:$1">$1</a>');
  }

  // Tiny, safe markdown: paragraphs, bullet/numbered lists, bold, italics.
  function renderMarkdown(text) {
    const lines = String(text || '').replace(/\r/g, '').split('\n');
    const out = [];
    let listType = null;

    function closeList() {
      if (listType) {
        out.push(`</${listType}>`);
        listType = null;
      }
    }

    lines.forEach((line) => {
      const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
      const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
      const heading = line.match(/^\s*#{1,4}\s+(.*)$/);

      if (bullet || numbered) {
        const type = bullet ? 'ul' : 'ol';
        if (listType !== type) {
          closeList();
          out.push(`<${type}>`);
          listType = type;
        }
        out.push(`<li>${inlineFormat((bullet || numbered)[1])}</li>`);
        return;
      }

      closeList();
      if (!line.trim()) return;
      out.push(heading
        ? `<p><strong>${inlineFormat(heading[1])}</strong></p>`
        : `<p>${inlineFormat(line)}</p>`);
    });

    closeList();
    return out.join('');
  }

  function formatListDate(value) {
    const d = new Date(String(value || '').replace(' ', 'T'));
    if (isNaN(d)) return '';
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  function currentSection() {
    if (getCurrentPageFile().toLowerCase() !== 'dashboard.html') return '';
    return String(window.location.hash || '').replace('#', '') || 'overview';
  }

  function firstName() {
    const user = getCurrentUser();
    const full = user ? getUserDisplayName(user) : '';
    return String(full).trim().split(/\s+/)[0] || '';
  }

  function greeting() {
    const name = firstName();
    return `Hi${name ? ` ${name}` : ''}! I'm Kilo, your PishNest assistant with a thousand answers. I can help with event planning, activity ideas, getting set up, managing bookings and reports, or using the site. If something's gone wrong, tell me and I'll help.\n\nWhat can I help with?`;
  }

  function scrollToEnd() {
    thread.scrollTop = thread.scrollHeight;
  }

  // ---------- rendering ----------

  function addBubble(role, content, extraClass = '') {
    const row = document.createElement('div');
    row.className = `pn-msg pn-msg-${role}${extraClass ? ` ${extraClass}` : ''}`;

    const bubble = document.createElement('div');
    bubble.className = 'pn-bubble';
    if (role === 'assistant') {
      bubble.innerHTML = renderMarkdown(content);
    } else {
      bubble.textContent = content;
    }

    row.appendChild(bubble);
    thread.appendChild(row);
    scrollToEnd();
    return row;
  }

  function showTyping() {
    const row = document.createElement('div');
    row.className = 'pn-msg pn-msg-assistant pn-typing';
    row.innerHTML = '<div class="pn-bubble" aria-label="Kilo is typing"><span></span><span></span><span></span></div>';
    thread.appendChild(row);
    scrollToEnd();
    return row;
  }

  function renderSuggestions() {
    const show = messages.length === 0 && !loadingConversation && historyEl.hidden;
    suggestionsEl.hidden = !show;
    suggestionsEl.innerHTML = show
      ? SUGGESTIONS.map((text) =>
        `<button type="button" class="pn-chip" data-suggestion="${escapeHtml(text)}">${escapeHtml(text)}</button>`
      ).join('')
      : '';
  }

  function renderTitle() {
    const active = conversations.find((c) => c.id === activeId);
    titleEl.textContent = active ? active.title : DEFAULT_TITLE;
  }

  function renderThread() {
    thread.innerHTML = '';
    if (messages.length === 0) addBubble('assistant', greeting());
    messages.forEach((m) => addBubble(m.role, m.content));
    renderSuggestions();
    renderTitle();
  }

  function renderHistory() {
    if (!conversations.length) {
      historyList.innerHTML = '<p class="pn-history-empty">No saved chats yet. Start one and it will appear here, on any device.</p>';
      return;
    }

    historyList.innerHTML = conversations.map((c) => `
      <div class="pn-history-item${c.id === activeId ? ' is-active' : ''}">
        <button type="button" class="pn-history-open" data-open="${c.id}" title="${escapeHtml(c.title)}">
          <span class="pn-history-title">${escapeHtml(c.title)}</span>
          <span class="pn-history-date">${escapeHtml(formatListDate(c.updated_at))}</span>
        </button>
        <button type="button" class="pn-history-delete" data-delete="${c.id}" aria-label="Delete chat ${escapeHtml(c.title)}" title="Delete">${icon('close', 'icon icon-sm')}</button>
      </div>
    `).join('');
  }

  function showHistory(show) {
    historyEl.hidden = !show;
    thread.hidden = show;
    historyBtn.classList.toggle('is-active', show);
    if (show) renderHistory();
    renderSuggestions();
    if (!show) scrollToEnd();
  }

  function setBusy(value) {
    busy = value;
    sendBtn.disabled = value;
    input.disabled = value;
    newBtn.disabled = value;
    historyBtn.disabled = value;
    fab.classList.toggle('is-busy', value);
  }

  function autoGrow() {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 110)}px`;
  }

  // ---------- data ----------

  async function loadConversations() {
    const data = await fetchJSON(`${ENDPOINT}?action=list`);
    if (data && data.success && Array.isArray(data.conversations)) {
      conversations = data.conversations.map((c) => ({
        id: Number(c.id),
        title: String(c.title || 'New chat'),
        updated_at: c.updated_at
      }));
      return true;
    }
    return false;
  }

  function startNewChat() {
    if (busy) return;
    activeId = null;
    messages = [];
    loadingConversation = false;
    showHistory(false);
    renderThread();
    input.focus();
  }

  async function openConversation(id) {
    if (busy || loadingConversation) return;
    id = Number(id);
    if (!id) return;

    loadingConversation = true;
    activeId = id;
    showHistory(false);
    thread.innerHTML = '<div class="pn-msg pn-msg-assistant"><div class="pn-bubble">Loading chat…</div></div>';
    renderSuggestions();
    renderTitle();

    const data = await fetchJSON(`${ENDPOINT}?action=get&id=${encodeURIComponent(id)}`);
    loadingConversation = false;

    if (data && data.success && Array.isArray(data.messages)) {
      messages = data.messages
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
        .map((m) => ({ role: m.role, content: String(m.content || '') }));
      renderThread();
    } else {
      activeId = null;
      messages = [];
      renderThread();
      addBubble('assistant', (data && data.error) || 'Could not load that chat.', 'pn-msg-error');
    }
  }

  async function deleteConversation(id) {
    if (busy || loadingConversation) return;
    id = Number(id);
    if (!id || !window.confirm('Delete this chat? This cannot be undone.')) return;

    const data = await fetchJSON(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', conversation_id: id })
    });

    if (data && data.success) {
      conversations = conversations.filter((c) => c.id !== id);
      if (activeId === id) {
        activeId = null;
        messages = [];
        renderThread();
      }
      renderHistory();
    } else {
      window.alert((data && data.error) || 'Could not delete that chat.');
    }
  }

  async function sendMessage(text) {
    const content = String(text || '').trim();
    if (!content || busy || loadingConversation) return;

    showHistory(false);
    // Shown straight away; only saved server-side once the assistant replies.
    if (messages.length === 0) thread.innerHTML = '';
    messages.push({ role: 'user', content });
    addBubble('user', content);
    renderSuggestions();
    input.value = '';
    autoGrow();
    setBusy(true);

    const typing = showTyping();
    const data = await fetchJSON(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send',
        message: content,
        conversation_id: activeId,
        page: currentSection()
      })
    });
    typing.remove();

    if (data && data.success && data.reply) {
      messages.push({ role: 'assistant', content: data.reply });
      addBubble('assistant', data.reply);

      const convId = Number(data.conversation_id);
      activeId = convId || activeId;
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
      const existing = conversations.find((c) => c.id === convId);
      if (existing) {
        existing.updated_at = stamp;
        conversations = [existing, ...conversations.filter((c) => c.id !== convId)];
      } else if (convId) {
        conversations.unshift({ id: convId, title: String(data.title || content), updated_at: stamp });
      }
      renderTitle();
    } else {
      const expired = !!(data && data.status === 401);
      const error = expired
        ? 'Your session has expired. Please log in again to keep chatting with me.'
        : ((data && (data.error || data.message)) || 'Sorry, something went wrong. Please try again.');
      messages.pop(); // not saved server-side, so let them resend cleanly
      renderThread();
      const errRow = addBubble('assistant', error, 'pn-msg-error');
      if (expired) {
        const link = document.createElement('a');
        link.href = `login.html?next=${encodeURIComponent(getCurrentPagePath())}`;
        link.textContent = 'Log in';
        link.className = 'pn-login-link';
        errRow.querySelector('.pn-bubble').append(' ', link);
      }
      input.value = content;
      autoGrow();
    }

    setBusy(false);
    input.focus();
  }

  async function firstOpen() {
    if (loaded) return;
    loaded = true;

    renderThread();
    const ok = await loadConversations();
    // Pick up where you left off, on any device.
    if (ok && conversations.length && activeId === null && messages.length === 0 && !busy) {
      openConversation(conversations[0].id);
    }
  }

  // ---------- open / close ----------

  function openPanel() {
    if (isOpen) return;
    isOpen = true;
    panel.hidden = false;
    // next frame so the CSS transition runs
    requestAnimationFrame(() => root.classList.add('is-open'));
    fab.setAttribute('aria-expanded', 'true');
    fab.setAttribute('aria-label', 'Close Kilo');
    firstOpen();
    setTimeout(() => input.focus(), 150);
  }

  function closePanel() {
    if (!isOpen) return;
    isOpen = false;
    root.classList.remove('is-open');
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-label', 'Open Kilo, your assistant');
    setTimeout(() => { if (!isOpen) panel.hidden = true; }, 200);
    fab.focus();
  }

  window.openOrganiserAssistant = openPanel;
  window.closeOrganiserAssistant = closePanel;

  // ---------- events ----------

  fab.addEventListener('click', () => (isOpen ? closePanel() : openPanel()));
  closeBtn.addEventListener('click', closePanel);
  newBtn.addEventListener('click', startNewChat);
  historyBtn.addEventListener('click', () => showHistory(historyEl.hidden));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen) closePanel();
  });

  sendBtn.addEventListener('click', () => sendMessage(input.value));

  input.addEventListener('input', autoGrow);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage(input.value);
    }
  });

  suggestionsEl.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-suggestion]');
    if (chip) sendMessage(chip.getAttribute('data-suggestion'));
  });

  historyList.addEventListener('click', (event) => {
    const del = event.target.closest('[data-delete]');
    if (del) {
      deleteConversation(del.getAttribute('data-delete'));
      return;
    }
    const open = event.target.closest('[data-open]');
    if (open) openConversation(open.getAttribute('data-open'));
  });
})();
