(function () {
  /* Set after the Vercel chat API is live. Leave empty to hide the widget. */
  const CHAT_API_URL = '';
  /* Digits only with country code, no +. Empty = never show a WhatsApp link. */
  const WHATSAPP_NUMBER = '';

  const MAX_HISTORY = 12;
  const WA_TEXT = "Hi Latitude °25, I'd like help planning a yacht charter.";

  function resolveChatApiUrl() {
    try {
      const override = new URLSearchParams(location.search).get('chat_api');
      if (override && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(override)) {
        return override.replace(/\/$/, '');
      }
    } catch (_) { /* ignore */ }
    return (CHAT_API_URL || '').trim();
  }

  const apiUrl = resolveChatApiUrl();
  if (!apiUrl) return;

  const isEs = String(navigator.language || '').toLowerCase().startsWith('es');
  const copy = isEs
    ? {
        title: 'Tu concierge',
        subtitle: 'Pregunta por yates, tarifas o cómo planear tu día en el mar.',
        placeholder: 'Escribe tu pregunta..',
        welcome: 'Bienvenido. Puedo ayudarte a elegir un yate, entender las tarifas publicadas o guiarte en un request. Las tarifas y la disponibilidad se confirman con el operador.',
        open: 'Abrir chat del concierge',
        close: 'Cerrar chat',
        send: 'Enviar mensaje',
        starters: [
          '¿Qué yate me recomiendas para 8 personas en Miami Beach?',
          '¿Cómo funciona un request?',
          '¿Qué incluye la tarifa publicada?',
        ],
        error: 'No pude completar esa respuesta. Inténtalo de nuevo, o envía un request en el sitio.',
        booking: 'Request a charter',
      }
    : {
        title: 'Your concierge',
        subtitle: 'Ask about yachts, pricing or planning your day at sea.',
        placeholder: 'Type your question..',
        welcome: 'Welcome. I can help you choose a yacht, explain listed rates, or walk you through a charter request. Availability and final pricing are confirmed with the operator.',
        open: 'Open concierge chat',
        close: 'Close chat',
        send: 'Send message',
        starters: [
          'What is a good yacht for 8 guests in Miami Beach?',
          'How does a charter request work?',
          'What does the listed rate include?',
        ],
        error: 'I could not finish that reply. Please try again, or send a request from the site.',
        booking: 'Request a charter',
      };

  const state = {
    open: false,
    busy: false,
    messages: [],
    lastFocus: null,
  };

  const root = document.createElement('div');
  root.className = 'l25-chat';
  root.innerHTML = `
    <button type="button" class="l25-chat-launcher" aria-label="${esc(copy.open)}" aria-expanded="false" aria-controls="l25ChatPanel">
      <span class="l25-chat-launcher-icon l25-chat-icon-open" aria-hidden="true">${iconChat()}</span>
      <span class="l25-chat-launcher-icon l25-chat-icon-close" aria-hidden="true">${iconChevron()}</span>
    </button>
    <section id="l25ChatPanel" class="l25-chat-panel" role="dialog" aria-modal="true" aria-labelledby="l25ChatTitle" aria-describedby="l25ChatSub" hidden>
      <header class="l25-chat-header">
        <div>
          <p class="l25-chat-eyebrow">Latitude °25</p>
          <h2 id="l25ChatTitle">${esc(copy.title)}</h2>
          <p id="l25ChatSub">${esc(copy.subtitle)}</p>
        </div>
        <button type="button" class="l25-chat-x" aria-label="${esc(copy.close)}">${iconX()}</button>
      </header>
      <div class="l25-chat-thread" id="l25ChatThread" aria-live="polite"></div>
      <form class="l25-chat-composer" id="l25ChatForm">
        <label class="visually-hidden" for="l25ChatInput">${esc(copy.placeholder)}</label>
        <textarea id="l25ChatInput" rows="1" placeholder="${esc(copy.placeholder)}" maxlength="1000"></textarea>
        <button type="submit" class="l25-chat-send" aria-label="${esc(copy.send)}">${iconSend()}</button>
      </form>
    </section>
  `;
  document.body.appendChild(root);

  const launcher = root.querySelector('.l25-chat-launcher');
  const panel = root.querySelector('#l25ChatPanel');
  const thread = root.querySelector('#l25ChatThread');
  const form = root.querySelector('#l25ChatForm');
  const input = root.querySelector('#l25ChatInput');
  const closeBtn = root.querySelector('.l25-chat-x');

  addWelcome();

  launcher.addEventListener('click', () => (state.open ? closeChat() : openChat()));
  closeBtn.addEventListener('click', closeChat);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    sendMessage(input.value);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input.value);
    }
  });
  input.addEventListener('input', autosize);
  thread.addEventListener('click', onThreadClick);

  document.addEventListener('keydown', (e) => {
    if (!state.open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeChat();
      return;
    }
    if (e.key === 'Tab') trapFocus(e);
  }, true);

  if (typeof openPanel === 'function') {
    const original = openPanel;
    window.openPanel = function (type) {
      if (state.open) closeChat();
      return original(type);
    };
  }

  function openChat() {
    state.open = true;
    state.lastFocus = document.activeElement;
    panel.hidden = false;
    root.classList.add('is-open');
    launcher.setAttribute('aria-expanded', 'true');
    launcher.setAttribute('aria-label', copy.close);
    document.body.classList.add('l25-chat-open');
    track('chat_open');
    requestAnimationFrame(() => input.focus());
  }

  function closeChat() {
    if (!state.open) return;
    state.open = false;
    panel.hidden = true;
    root.classList.remove('is-open');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-label', copy.open);
    document.body.classList.remove('l25-chat-open');
    const target = state.lastFocus && document.body.contains(state.lastFocus) ? state.lastFocus : launcher;
    target.focus();
  }

  function addWelcome() {
    appendBubble('assistant', copy.welcome);
    const starters = document.createElement('div');
    starters.className = 'l25-chat-starters';
    starters.id = 'l25ChatStarters';
    copy.starters.forEach((text) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'l25-chat-chip';
      btn.textContent = text;
      btn.addEventListener('click', () => sendMessage(text));
      starters.appendChild(btn);
    });
    thread.appendChild(starters);
  }

  async function sendMessage(raw) {
    const text = String(raw || '').trim();
    if (!text || state.busy) return;
    hideStarters();
    input.value = '';
    autosize();
    appendBubble('user', text);
    state.messages.push({ role: 'user', content: text });
    if (state.messages.length > MAX_HISTORY) state.messages = state.messages.slice(-MAX_HISTORY);
    track('chat_message_sent');

    const bubble = appendBubble('assistant', '');
    bubble.classList.add('is-pending');
    bubble.innerHTML = '<span class="l25-chat-dots" aria-hidden="true"><i></i><i></i><i></i></span>';
    state.busy = true;
    input.disabled = true;

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: state.messages }),
      });
      if (!res.ok) throw new Error('bad status');
      const reader = res.body && res.body.getReader ? res.body.getReader() : null;
      if (!reader) {
        const full = await res.text();
        finishAssistant(bubble, full);
      } else {
        const decoder = new TextDecoder();
        let full = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          finishAssistant(bubble, full, true);
        }
        finishAssistant(bubble, full);
      }
    } catch (_) {
      finishAssistant(bubble, copy.error + ' [Request a charter](#booking)');
    } finally {
      state.busy = false;
      input.disabled = false;
      if (state.open) input.focus();
    }
  }

  function finishAssistant(bubble, text, streaming) {
    const body = text || (streaming ? '' : copy.error);
    bubble.classList.toggle('is-pending', !body);
    if (body) bubble.innerHTML = renderMessage(body);
    if (!streaming) {
      state.messages.push({ role: 'assistant', content: body });
      if (state.messages.length > MAX_HISTORY) state.messages = state.messages.slice(-MAX_HISTORY);
    }
    thread.scrollTop = thread.scrollHeight;
  }

  function appendBubble(role, text) {
    const el = document.createElement('div');
    el.className = `l25-chat-bubble l25-chat-${role}`;
    el.innerHTML = text ? renderMessage(text) : '';
    thread.appendChild(el);
    thread.scrollTop = thread.scrollHeight;
    return el;
  }

  function hideStarters() {
    const el = document.getElementById('l25ChatStarters');
    if (el) el.remove();
  }

  function renderMessage(text) {
    const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
    const out = [];
    let list = null;

    function closeList() {
      if (!list) return;
      out.push(list === 'ul' ? '</ul>' : '</ol>');
      list = null;
    }

    function openList(type) {
      if (list === type) return;
      closeList();
      out.push(type === 'ul' ? '<ul>' : '<ol>');
      list = type;
    }

    for (const line of lines) {
      const ul = line.match(/^\s*[-*•]\s+(.*)$/);
      const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
      if (ul) {
        openList('ul');
        out.push('<li>' + renderInline(ul[1]) + '</li>');
        continue;
      }
      if (ol) {
        openList('ol');
        out.push('<li>' + renderInline(ol[1]) + '</li>');
        continue;
      }
      closeList();
      if (!line.trim()) continue;
      out.push('<p>' + renderInline(line) + '</p>');
    }
    closeList();
    return out.join('');
  }

  function renderInline(text) {
    const held = [];
    const hold = (html) => {
      const key = `\u0000${held.length}\u0000`;
      held.push(html);
      return key;
    };
    let s = String(text || '');
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
      const safe = sanitizeHref(href);
      if (!safe) return label;
      return hold(`<a href="${esc(safe)}"${anchorAttrs(safe)}>${esc(label)}</a>`);
    });
    s = s.replace(/(^|[^"'>\w])(#(?:booking|contact|fleet|faq|how|about|vessel\/[a-z0-9]+))\b/gi, (_, pre, hash) => {
      return pre + hold(`<a href="${hash}">${esc(hash)}</a>`);
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, (_, inner) => hold(`<strong>${esc(inner)}</strong>`));
    s = s.replace(/__([^_]+)__/g, (_, inner) => hold(`<strong>${esc(inner)}</strong>`));
    s = esc(s);
    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => held[Number(i)]);
  }

  function sanitizeHref(href) {
    const raw = String(href || '').trim();
    if (!raw) return '';
    if (raw.startsWith('#')) return raw;
    try {
      const url = new URL(raw, location.origin);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
      if (url.hostname === 'wa.me' || url.hostname.endsWith('.wa.me') || url.hostname === 'api.whatsapp.com') {
        if (!WHATSAPP_NUMBER) return '#booking';
        return whatsappUrl();
      }
      const host = url.hostname;
      if (host === 'latitude25.us' || host === 'www.latitude25.us' || host === 'pabloapcv.github.io' || host === location.hostname) {
        return url.href;
      }
    } catch (_) { /* ignore */ }
    return '';
  }

  function anchorAttrs(href) {
    if (href.startsWith('https://wa.me/') || href.startsWith('http://wa.me/')) {
      return ' data-chat-wa="1" target="_blank" rel="noopener noreferrer"';
    }
    if (href.startsWith('#')) return '';
    return ' target="_blank" rel="noopener noreferrer"';
  }

  function whatsappUrl() {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WA_TEXT)}`;
  }

  function onThreadClick(e) {
    const wa = e.target.closest('a[data-chat-wa]');
    if (wa) track('chat_whatsapp_click');
    const local = e.target.closest('a[href^="#"]');
    if (local) closeChat();
  }

  function autosize() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 96) + 'px';
  }

  function trapFocus(e) {
    const nodes = focusables(panel);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function focusables(scope) {
    return [...scope.querySelectorAll('a[href],button:not([disabled]),textarea,input')].filter((el) => !el.disabled && el.offsetParent !== null);
  }

  function track(name) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: name, event_category: 'concierge' });
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, { event_category: 'concierge' });
    }
  }

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function iconChat() {
    return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7A2.5 2.5 0 0 1 16.5 16H11l-4 3.2V16H7.5A2.5 2.5 0 0 1 5 13.5z"/></svg>';
  }
  function iconChevron() {
    return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';
  }
  function iconX() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  }
  function iconSend() {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h12M13 6l6 6-6 6"/></svg>';
  }
})();
