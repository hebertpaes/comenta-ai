/*
 * Ponte entre a extensão (content script isolado) e o WhatsApp Web.
 * Roda no contexto da página (world MAIN), onde a wa-js expõe o objeto WPP.
 *
 * Protocolo (window.postMessage):
 *   extensão -> página : { __cmt: 'req', id, method, args }
 *   página -> extensão : { __cmt: 'res', id, ok, result, error }
 *   página -> extensão : { __cmt: 'evt', name, data }
 */
(() => {
  if (window.__cmtBridgeLoaded) return;
  window.__cmtBridgeLoaded = true;

  const WPP = window.WPP;
  window.__cmtWPP = WPP;
  // Devolve o WPP de outra extensão, se havia um antes do nosso.
  if (window.__cmtPrevWPP) window.WPP = window.__cmtPrevWPP;

  const post = (msg) => window.postMessage(Object.assign({ __cmt: true }, msg), '*');
  const emit = (name, data) => post({ __cmt: 'evt', name, data });

  if (!WPP) {
    emit('error', { message: 'Biblioteca wa-js não carregou.' });
    return;
  }

  // ---------- helpers ----------
  const sid = (x) => {
    if (!x) return '';
    if (typeof x === 'string') return x;
    return x._serialized || (x.user && x.server ? `${x.user}@${x.server}` : String(x));
  };
  const userOf = (id) => String(sid(id)).split('@')[0];
  const isIgnoredChat = (id) => {
    const s = sid(id);
    return !s || s === 'status@broadcast' || s.endsWith('@newsletter') || s.endsWith('@broadcast');
  };

  const chatName = (chat) => {
    if (!chat) return '';
    try {
      return (
        chat.name ||
        chat.formattedTitle ||
        (chat.contact && (chat.contact.name || chat.contact.verifiedName || chat.contact.pushname)) ||
        (chat.groupMetadata && chat.groupMetadata.subject) ||
        userOf(chat.id)
      );
    } catch (e) {
      return userOf(chat && chat.id);
    }
  };

  const lastMsgOf = (chat) => {
    try {
      const msgs = chat.msgs;
      const m = msgs && (typeof msgs.last === 'function' ? msgs.last() : msgs.getModelsArray && msgs.getModelsArray().slice(-1)[0]);
      if (!m) return null;
      return {
        body: (m.type === 'chat' ? m.body : m.caption || `[${m.type}]`) || '',
        fromMe: !!(m.id && m.id.fromMe),
        t: m.t || 0,
        type: m.type,
      };
    } catch (e) {
      return null;
    }
  };

  const serializeChat = (chat) => {
    const id = sid(chat.id);
    const last = lastMsgOf(chat);
    return {
      id,
      name: chatName(chat),
      number: id.endsWith('@c.us') ? userOf(id) : '',
      isGroup: !!chat.isGroup || id.endsWith('@g.us'),
      unread: chat.unreadCount || 0,
      t: chat.t || (last && last.t) || 0,
      archived: !!chat.archive,
      pinned: !!chat.pin,
      muted: !!(chat.mute && chat.mute.expiration),
      labels: (chat.labels || []).map(String),
      last,
    };
  };

  const serializeMsg = (m) => {
    const remote = m.id && m.id.remote;
    const chatId = sid(remote) || (m.id && m.id.fromMe ? sid(m.to) : sid(m.from));
    return {
      id: sid(m.id),
      chatId,
      fromMe: !!(m.id && m.id.fromMe),
      body: m.type === 'chat' ? m.body || '' : m.caption || '',
      type: m.type,
      t: m.t || Math.floor(Date.now() / 1000),
      author: sid(m.author) || '',
      senderName: m.notifyName || (m.senderObj && (m.senderObj.pushname || m.senderObj.name)) || '',
      isGroup: chatId.endsWith('@g.us'),
      hasMedia: !!(m.mediaData || m.isMedia || ['image', 'video', 'audio', 'ptt', 'document', 'sticker'].includes(m.type)),
    };
  };

  const dataUrlToFile = async (dataUrl, filename, mimetype) => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename || 'arquivo', { type: mimetype || blob.type });
  };

  /** Converte número/ID em um chat válido, consultando o WhatsApp quando é um número. */
  const resolveChatId = async (target) => {
    let s = String(sid(target)).trim();
    if (s.includes('@')) return s;
    const digits = s.replace(/\D/g, '');
    if (digits.length < 8) throw new Error('Número inválido');
    const res = await WPP.contact.queryExists(`${digits}@c.us`);
    if (!res || !res.wid) throw new Error('Número sem WhatsApp');
    return sid(res.wid);
  };

  // ---------- métodos expostos ----------
  const methods = {
    async status() {
      let me = null;
      try {
        const w = WPP.conn.getMyUserId();
        me = w ? sid(w) : null;
      } catch (e) {}
      return {
        ready: !!WPP.isReady,
        fullReady: !!WPP.isFullReady,
        authenticated: (() => {
          try {
            return WPP.conn.isAuthenticated();
          } catch (e) {
            return false;
          }
        })(),
        me,
        version: WPP.version,
      };
    },

    async listChats(opts = {}) {
      const list = await WPP.chat.list(opts);
      return list.filter((c) => !isIgnoredChat(c.id)).map(serializeChat);
    },

    async getActiveChat() {
      const c = WPP.chat.getActiveChat();
      return c ? serializeChat(c) : null;
    },

    async openChat(target) {
      const id = await resolveChatId(target);
      await WPP.chat.openChatBottom(id);
      return id;
    },

    async checkNumber(number) {
      const digits = String(number).replace(/\D/g, '');
      const res = await WPP.contact.queryExists(`${digits}@c.us`);
      return res && res.wid ? { exists: true, id: sid(res.wid) } : { exists: false };
    },

    async sendText(target, text, opts = {}) {
      const id = await resolveChatId(target);
      if (opts.typing) {
        try {
          await WPP.chat.markIsComposing(id, opts.typingMs || 1500);
          await new Promise((r) => setTimeout(r, opts.typingMs || 1500));
        } catch (e) {}
      }
      const r = await WPP.chat.sendTextMessage(id, text, { createChat: true, linkPreview: opts.linkPreview !== false });
      return { id: sid(r && r.id), chatId: id };
    },

    async sendFile(target, file, opts = {}) {
      const id = await resolveChatId(target);
      const f = await dataUrlToFile(file.dataUrl, file.name, file.mime);
      const options = { createChat: true, caption: opts.caption || undefined, filename: file.name };
      if (opts.asAudio || (file.mime || '').startsWith('audio/')) {
        options.type = 'audio';
        options.isPtt = opts.asAudio !== false;
        delete options.caption;
      } else if (opts.asDocument) {
        options.type = 'document';
      } else {
        options.type = 'auto-detect';
      }
      const r = await WPP.chat.sendFileMessage(id, f, options);
      return { id: sid(r && r.id), chatId: id };
    },

    async getMessages(target, count = 30) {
      const id = await resolveChatId(target);
      const msgs = await WPP.chat.getMessages(id, { count });
      return msgs.map(serializeMsg);
    },

    async setInputText(text, chatId) {
      await WPP.chat.setInputText(text, chatId || undefined);
      return true;
    },

    async markUnread(chatId) {
      await WPP.chat.markIsUnread(chatId);
      return true;
    },

    async markRead(chatId) {
      await WPP.chat.markIsRead(chatId);
      return true;
    },

    async getLabels() {
      try {
        const labels = await WPP.labels.getAllLabels();
        return labels.map((l) => ({ id: String(l.id), name: l.name, color: l.hexColor || l.color || '#25d366', count: l.count || 0 }));
      } catch (e) {
        // Contas pessoais não têm etiquetas.
        return [];
      }
    },

    async getGroups() {
      const groups = await WPP.chat.list({ onlyGroups: true });
      return groups.map((g) => ({
        id: sid(g.id),
        name: chatName(g),
        size: (g.groupMetadata && g.groupMetadata.participants && g.groupMetadata.participants.length) || 0,
      }));
    },

    async getGroupParticipants(groupId) {
      const parts = await WPP.group.getParticipants(groupId);
      const out = [];
      for (const p of parts) {
        const id = sid(p.id);
        let number = id.endsWith('@c.us') ? userOf(id) : '';
        let name = '';
        try {
          const c = p.contact || WPP.whatsapp.ContactStore.get(id);
          if (c) name = c.name || c.pushname || c.verifiedName || '';
          if (!number && c && c.phoneNumber) number = userOf(c.phoneNumber);
        } catch (e) {}
        if (!number && WPP.contact.getPnLidEntry) {
          try {
            const e = await WPP.contact.getPnLidEntry(id);
            if (e && e.phoneNumber) number = userOf(e.phoneNumber);
          } catch (e) {}
        }
        out.push({ id, number, name, isAdmin: !!p.isAdmin });
      }
      return out;
    },

    async listContacts() {
      const list = await WPP.contact.list({ onlyMyContacts: true });
      return list
        .filter((c) => sid(c.id).endsWith('@c.us') || sid(c.id).endsWith('@lid'))
        .map((c) => {
          const id = sid(c.id);
          let number = id.endsWith('@c.us') ? userOf(id) : c.phoneNumber ? userOf(c.phoneNumber) : '';
          return { id, number, name: c.name || c.pushname || c.verifiedName || '', isBusiness: !!c.isBusiness };
        });
    },

    async getProfilePic(id) {
      try {
        return (await WPP.contact.getProfilePictureUrl(id)) || null;
      } catch (e) {
        return null;
      }
    },
  };

  window.addEventListener('message', async (ev) => {
    if (ev.source !== window) return;
    const d = ev.data;
    if (!d || d.__cmt !== 'req' || !d.method) return;
    const fn = methods[d.method];
    if (!fn) return post({ __cmt: 'res', id: d.id, ok: false, error: `Método desconhecido: ${d.method}` });
    try {
      const result = await fn(...(d.args || []));
      post({ __cmt: 'res', id: d.id, ok: true, result });
    } catch (e) {
      post({ __cmt: 'res', id: d.id, ok: false, error: (e && (e.message || e.code)) || String(e) });
    }
  });

  // ---------- eventos ----------
  const onReady = async () => {
    emit('ready', await methods.status());
  };
  WPP.loader.onReady(onReady);
  if (WPP.isReady) onReady();

  WPP.on('conn.main_ready', onReady);
  WPP.on('conn.authenticated', onReady);
  WPP.on('conn.logout', () => emit('logout', {}));

  WPP.on('chat.new_message', (m) => {
    try {
      if (!m || !m.isNewMsg) return;
      const data = serializeMsg(m);
      if (isIgnoredChat(data.chatId)) return;
      try {
        const chat = WPP.whatsapp.ChatStore.get(data.chatId);
        data.chatName = chatName(chat);
      } catch (e) {}
      emit('new_message', data);
    } catch (e) {}
  });

  WPP.on('chat.active_chat', (chat) => {
    try {
      emit('active_chat', chat ? serializeChat(chat) : null);
    } catch (e) {
      emit('active_chat', null);
    }
  });

  emit('loaded', { version: WPP.version });
})();
