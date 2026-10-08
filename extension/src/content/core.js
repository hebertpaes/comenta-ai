/*
 * Núcleo do content script (world isolado): namespace, utilitários,
 * armazenamento persistente, cliente da ponte com o WhatsApp e estado global.
 */
(() => {
  if (window.CMT) return;
  const CMT = (window.CMT = { features: {}, state: { ready: false, activeChat: null, chats: [], labels: [], status: null } });

  // ---------------------------------------------------------------- utils
  const U = (CMT.util = {});
  U.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  U.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  U.rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  U.digits = (s) => String(s || '').replace(/\D/g, '');
  U.pad = (n) => String(n).padStart(2, '0');
  U.dayKey = (d) => `${d.getFullYear()}-${U.pad(d.getMonth() + 1)}-${U.pad(d.getDate())}`;
  U.today = () => U.dayKey(new Date());
  U.fmtDate = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return `${U.pad(d.getDate())}/${U.pad(d.getMonth() + 1)}/${d.getFullYear()} ${U.pad(d.getHours())}:${U.pad(d.getMinutes())}`;
  };
  U.fmtRelative = (tsSec) => {
    if (!tsSec) return '';
    const diff = Date.now() / 1000 - tsSec;
    if (diff < 60) return 'agora';
    if (diff < 3600) return `${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
    return `${Math.floor(diff / 86400)} d`;
  };
  /** Valor para <input type="datetime-local"> */
  U.toLocalInput = (ts) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${U.pad(d.getMonth() + 1)}-${U.pad(d.getDate())}T${U.pad(d.getHours())}:${U.pad(d.getMinutes())}`;
  };
  U.greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  };
  U.firstName = (name) => String(name || '').trim().split(/\s+/)[0] || '';

  /**
   * Substitui variáveis e spintax.
   * Variáveis: {nome} {primeiro_nome} {saudacao} {numero} {data} {hora} e quaisquer extras do contato.
   * Spintax: {Olá|Oi|E aí} escolhe uma opção aleatória.
   */
  U.render = (text, vars = {}) => {
    const now = new Date();
    const all = Object.assign(
      {
        nome: vars.nome || '',
        primeiro_nome: U.firstName(vars.nome),
        saudacao: U.greeting(),
        data: `${U.pad(now.getDate())}/${U.pad(now.getMonth() + 1)}/${now.getFullYear()}`,
        hora: `${U.pad(now.getHours())}:${U.pad(now.getMinutes())}`,
        numero: vars.numero || '',
      },
      vars
    );
    let out = String(text || '').replace(/\{([a-z_0-9]+)\}/gi, (m, k) => {
      const key = k.toLowerCase();
      return key in all ? String(all[key] ?? '') : m;
    });
    let guard = 0;
    while (/\{[^{}]*\|[^{}]*\}/.test(out) && guard++ < 50) {
      out = out.replace(/\{([^{}]*\|[^{}]*)\}/g, (m, body) => {
        const opts = body.split('|');
        return opts[Math.floor(Math.random() * opts.length)];
      });
    }
    return out;
  };

  U.parseCSV = (text) => {
    const rows = [];
    let row = [];
    let cell = '';
    let q = false;
    const sep = (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"' && text[i + 1] === '"') {
          cell += '"';
          i++;
        } else if (ch === '"') q = false;
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === sep) {
        row.push(cell);
        cell = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
      } else cell += ch;
    }
    if (cell || row.length) {
      row.push(cell);
      rows.push(row);
    }
    return rows.filter((r) => r.some((c) => c.trim()));
  };

  U.toCSV = (rows) =>
    '﻿' +
    rows
      .map((r) =>
        r
          .map((c) => {
            const s = String(c ?? '');
            return /[";\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(';')
      )
      .join('\n');

  U.download = (filename, content, mime = 'text/plain;charset=utf-8') => {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  U.readFile = (file, as = 'dataURL') =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      if (as === 'text') r.readAsText(file);
      else r.readAsDataURL(file);
    });

  U.pickFile = (accept = '*/*') =>
    new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = () => resolve(input.files && input.files[0]);
      input.click();
    });

  /** Converte File em objeto serializável { name, mime, size, dataUrl } */
  U.fileToAttachment = async (file) => {
    if (!file) return null;
    if (file.size > 60 * 1024 * 1024) throw new Error('Arquivo maior que 60 MB');
    return { name: file.name, mime: file.type || 'application/octet-stream', size: file.size, dataUrl: await U.readFile(file) };
  };

  /** Lê uma lista de "numero[,nome]" (texto livre ou CSV). */
  U.parseContacts = (text) => {
    const out = [];
    const seen = new Set();
    for (const r of U.parseCSV(String(text || ''))) {
      let number = '';
      let name = '';
      for (const c of r) {
        const d = U.digits(c);
        if (!number && d.length >= 8 && d.length <= 15 && /^[\s+()\d.-]+$/.test(c.trim())) number = d;
        else if (!name && c.trim() && !/^\d+$/.test(c.trim())) name = c.trim();
      }
      if (number && !seen.has(number)) {
        seen.add(number);
        out.push({ number, name });
      }
    }
    return out;
  };

  // ---------------------------------------------------------------- storage
  const DEFAULTS = {
    settings: {
      privacy: { messages: false, chatList: false, photos: false, revealOnHover: true },
      broadcast: { minDelay: 10, maxDelay: 25, batchSize: 25, batchPause: 180, typing: true, dailyLimit: 300 },
      chatbot: {
        enabled: false,
        groups: false,
        hoursMode: 'always',
        start: '08:00',
        end: '18:00',
        days: [1, 2, 3, 4, 5],
        replyDelay: 3,
        welcomeEnabled: false,
        welcomeText: '{saudacao}! 👋 Obrigado por entrar em contato. Em instantes um atendente vai falar com você.',
        awayEnabled: false,
        awayText: '{saudacao}! No momento estamos fora do horário de atendimento. Retornaremos assim que possível. 🙏',
      },
      ai: { model: 'claude-opus-5-5', effort: 'low', business: '', tone: 'cordial e objetivo' },
      webhook: { onMessage: false, onSent: false },
      ui: { quickReplySlash: true, sendOverdueSchedules: true },
    },
    quickReplies: [
      { id: 'qr1', shortcut: 'oi', title: 'Saudação', text: '{saudacao}, {primeiro_nome}! Tudo bem? Como posso te ajudar?' },
      { id: 'qr2', shortcut: 'obg', title: 'Agradecimento', text: 'Muito obrigado pelo contato, {primeiro_nome}! Qualquer dúvida estou à disposição. 😊' },
      { id: 'qr3', shortcut: 'pix', title: 'Dados para pagamento', text: 'Segue nossa chave PIX: *SUA-CHAVE-AQUI*\nAssim que pagar, me envie o comprovante, por favor.' },
    ],
    kanban: {
      columns: [
        { id: 'novo', name: 'Novos leads', color: '#3b82f6' },
        { id: 'atend', name: 'Em atendimento', color: '#f59e0b' },
        { id: 'prop', name: 'Proposta enviada', color: '#8b5cf6' },
        { id: 'ganho', name: 'Fechado', color: '#10b981' },
        { id: 'perdido', name: 'Perdido', color: '#ef4444' },
      ],
      cards: {},
      autoAdd: false,
    },
    schedules: [],
    funnels: [],
    triggers: [],
    reminders: [],
    notes: {},
    tabs: [],
    campaigns: [],
    stats: { sent: 0, broadcast: 0, auto: 0, scheduled: 0, ai: 0, byDay: {} },
  };
  CMT.DEFAULTS = DEFAULTS;

  const S = (CMT.store = { data: {}, listeners: {} });
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const deepDefaults = (val, def) => {
    if (val === undefined) return clone(def);
    if (def && typeof def === 'object' && !Array.isArray(def) && val && typeof val === 'object' && !Array.isArray(val)) {
      const out = Object.assign({}, val);
      for (const k of Object.keys(def)) out[k] = deepDefaults(val[k], def[k]);
      return out;
    }
    return val;
  };

  S.load = async () => {
    const raw = await chrome.storage.local.get(Object.keys(DEFAULTS));
    for (const k of Object.keys(DEFAULTS)) S.data[k] = deepDefaults(raw[k], DEFAULTS[k]);
    return S.data;
  };
  S.get = (key) => S.data[key];
  S.set = async (key, value) => {
    S.data[key] = value;
    await chrome.storage.local.set({ [key]: value });
    S.emit(key, value);
  };
  /** Atualiza com uma função que recebe uma cópia e retorna (ou altera) o valor. */
  S.update = async (key, fn) => {
    const cur = clone(S.data[key]);
    const res = fn(cur);
    // O mutador altera a cópia no lugar. Só um ARRAY retornado substitui o valor (ex.: l.filter(...));
    // qualquer outro retorno (número do push(), sub-objeto do Object.assign()) é ignorado.
    await S.set(key, Array.isArray(cur) && Array.isArray(res) ? res : cur);
    return S.data[key];
  };
  S.on = (key, fn) => {
    (S.listeners[key] = S.listeners[key] || []).push(fn);
    return () => (S.listeners[key] = S.listeners[key].filter((f) => f !== fn));
  };
  S.emit = (key, value) => (S.listeners[key] || []).forEach((fn) => {
    try {
      fn(value);
    } catch (e) {
      console.error('[Comenta AI]', e);
    }
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    for (const [k, ch] of Object.entries(changes)) {
      if (!(k in DEFAULTS)) continue;
      if (JSON.stringify(S.data[k]) === JSON.stringify(ch.newValue)) continue;
      S.data[k] = deepDefaults(ch.newValue, DEFAULTS[k]);
      S.emit(k, S.data[k]);
    }
  });

  CMT.stat = async (field, n = 1) => {
    await S.update('stats', (s) => {
      s[field] = (s[field] || 0) + n;
      if (field === 'sent') {
        const d = U.today();
        s.byDay[d] = (s.byDay[d] || 0) + n;
        const keys = Object.keys(s.byDay).sort();
        while (keys.length > 60) delete s.byDay[keys.shift()];
      }
      return s;
    });
  };

  // ---------------------------------------------------------------- bridge
  const B = (CMT.bridge = { pending: new Map(), handlers: {} });
  window.addEventListener('message', (ev) => {
    if (ev.source !== window) return;
    const d = ev.data;
    if (!d || !d.__cmt) return;
    if (d.__cmt === 'res') {
      const p = B.pending.get(d.id);
      if (!p) return;
      B.pending.delete(d.id);
      clearTimeout(p.timer);
      d.ok ? p.resolve(d.result) : p.reject(new Error(d.error || 'Erro'));
    } else if (d.__cmt === 'evt') {
      (B.handlers[d.name] || []).forEach((fn) => {
        try {
          fn(d.data);
        } catch (e) {
          console.error('[Comenta AI]', e);
        }
      });
    }
  });
  B.call = (method, ...args) =>
    new Promise((resolve, reject) => {
      const id = U.uid();
      const timeout = /send|getMessages|Participants|listContacts/.test(method) ? 120000 : 30000;
      const timer = setTimeout(() => {
        B.pending.delete(id);
        reject(new Error(`Tempo esgotado (${method})`));
      }, timeout);
      B.pending.set(id, { resolve, reject, timer });
      window.postMessage({ __cmt: 'req', id, method, args }, '*');
    });
  B.on = (name, fn) => (B.handlers[name] = B.handlers[name] || []).push(fn);

  // ---------------------------------------------------------------- envio centralizado
  /**
   * Envia texto ou arquivo para um chat/número registrando estatística e webhook.
   * @param {string} target chatId ou número
   * @param {{text?:string, file?:object, asAudio?:boolean, typing?:boolean}} msg
   */
  CMT.send = async (target, msg, statField = 'sent') => {
    let r;
    if (msg.file) {
      r = await B.call('sendFile', target, msg.file, { caption: msg.text || '', asAudio: msg.asAudio, asDocument: msg.asDocument });
    } else {
      if (!String(msg.text || '').trim()) throw new Error('Mensagem vazia');
      r = await B.call('sendText', target, msg.text, { typing: msg.typing, typingMs: msg.typingMs });
    }
    CMT.stat('sent');
    if (statField && statField !== 'sent') CMT.stat(statField);
    if (S.data.settings.webhook.onSent) CMT.webhook('message_sent', { to: r.chatId || target, text: msg.text || '', file: msg.file ? msg.file.name : null, source: statField });
    return r;
  };

  /** Envia um funil (sequência de passos) para um chat. */
  CMT.sendFunnel = async (target, funnel, vars = {}, statField = 'sent', shouldStop = () => false) => {
    let chatId = target;
    for (const step of funnel.steps || []) {
      if (shouldStop()) throw new Error('Interrompido');
      if (step.type === 'delay') {
        await U.sleep(Math.max(0, Number(step.seconds) || 0) * 1000);
      } else if (step.type === 'text') {
        const r = await CMT.send(chatId, { text: U.render(step.text, vars), typing: true, typingMs: Math.min(4000, 600 + (step.text || '').length * 25) }, statField);
        chatId = r.chatId || chatId;
      } else if (step.type === 'file' && step.file) {
        const r = await CMT.send(chatId, { file: step.file, text: U.render(step.text || '', vars), asAudio: !!step.asAudio }, statField);
        chatId = r.chatId || chatId;
      }
      await U.sleep(800);
    }
    return chatId;
  };

  CMT.webhook = (event, data) => {
    try {
      chrome.runtime.sendMessage({ type: 'cmt:webhook', event, data }).catch(() => {});
    } catch (e) {}
  };

  CMT.bg = (msg) =>
    new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(msg, (res) => {
          const err = chrome.runtime.lastError;
          if (err) return reject(new Error(err.message));
          if (res && res.error) return reject(new Error(res.error));
          resolve(res);
        });
      } catch (e) {
        reject(e);
      }
    });

  /** Recarrega a lista de chats (cache usado por vários painéis). */
  CMT.refreshChats = async () => {
    try {
      CMT.state.chats = await B.call('listChats', {});
    } catch (e) {
      console.warn('[Comenta AI] listChats', e);
    }
    return CMT.state.chats;
  };
  CMT.chatById = (id) => CMT.state.chats.find((c) => c.id === id);

  // ---------------------------------------------------------------- eventos internos
  const E = (CMT.events = {});
  CMT.on = (name, fn) => {
    (E[name] = E[name] || []).push(fn);
    return () => (E[name] = E[name].filter((f) => f !== fn));
  };
  CMT.emit = (name, data) =>
    (E[name] || []).forEach((fn) => {
      try {
        const r = fn(data);
        if (r && r.catch) r.catch((e) => console.error('[Comenta AI]', name, e));
      } catch (e) {
        console.error('[Comenta AI]', name, e);
      }
    });

  // Segredos (chave de API, webhook) ficam fora do backup exportável.
  CMT.secrets = { anthropicKey: '', webhookUrl: '' };
  CMT.loadSecrets = async () => {
    const r = await chrome.storage.local.get('secrets');
    Object.assign(CMT.secrets, r.secrets || {});
    return CMT.secrets;
  };
  CMT.saveSecrets = async (patch) => {
    Object.assign(CMT.secrets, patch);
    await chrome.storage.local.set({ secrets: CMT.secrets });
  };
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.secrets) Object.assign(CMT.secrets, changes.secrets.newValue || {});
  });
})();
