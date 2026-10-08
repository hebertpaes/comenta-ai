/* Inicialização do content script: carrega dados, monta a UI e conecta os eventos da ponte. */
(async () => {
  const CMT = window.CMT;
  const { ui: UI, bridge: B, store: S } = CMT;

  await S.load();
  await CMT.loadSecrets();
  await UI.mount();

  for (const [name, f] of Object.entries(CMT.features)) {
    try {
      if (f.init) await f.init();
    } catch (e) {
      console.error(`[Comenta AI] init ${name}`, e);
    }
  }

  let readyFired = false;
  const onReady = async (status) => {
    CMT.state.status = status || CMT.state.status;
    if (!CMT.state.ready) {
      CMT.state.ready = true;
      UI.renderRail();
      await CMT.refreshChats();
      try {
        CMT.state.labels = await B.call('getLabels');
      } catch (e) {}
      try {
        CMT.state.activeChat = await B.call('getActiveChat');
      } catch (e) {}
      UI.refresh();
      if (!readyFired) {
        readyFired = true;
        CMT.emit('ready', CMT.state.status);
        UI.toast('Comenta AI conectado ao WhatsApp. ✨', 'success', 2500);
      }
    }
  };

  B.on('ready', onReady);
  B.on('loaded', () => console.info('[Comenta AI] wa-js carregada'));
  B.on('error', (e) => UI.toast(`Comenta AI: ${e.message}`, 'error', 8000));
  B.on('logout', () => {
    CMT.state.ready = false;
    UI.renderRail();
    UI.toast('WhatsApp desconectado.', 'warn');
  });
  B.on('active_chat', (chat) => {
    CMT.state.activeChat = chat;
    const el = UI.drawer.querySelector('.drawer-chat');
    if (el) el.textContent = chat ? `💬 ${chat.name}` : 'Nenhuma conversa aberta';
    CMT.emit('activeChat', chat);
  });
  B.on('new_message', (m) => {
    // Atualiza cache local de chats para refletir última mensagem/não lidas.
    const c = CMT.chatById(m.chatId);
    if (c) {
      c.last = { body: m.body, fromMe: m.fromMe, t: m.t, type: m.type };
      c.t = m.t;
      if (!m.fromMe) c.unread = (c.unread || 0) + 1;
    } else if (!m.fromMe) {
      CMT.state.chats.push({ id: m.chatId, name: m.chatName || m.senderName || m.chatId.split('@')[0], number: m.chatId.endsWith('@c.us') ? m.chatId.split('@')[0] : '', isGroup: m.isGroup, unread: 1, t: m.t, labels: [], last: { body: m.body, fromMe: false, t: m.t, type: m.type } });
    }
    if (!m.fromMe && S.get('settings').webhook.onMessage) CMT.webhook('new_message', m);
    CMT.emit('message', m);
    UI.refresh('dashboard', 'tabs', 'kanban');
  });

  // A ponte pode ter ficado pronta antes de registrarmos os listeners.
  const poll = async () => {
    if (CMT.state.ready) return;
    try {
      const st = await B.call('status');
      if (st && st.ready) return onReady(st);
    } catch (e) {}
    setTimeout(poll, 2000);
  };
  setTimeout(poll, 1500);

  // Atualiza o cache de conversas periodicamente.
  setInterval(() => CMT.state.ready && CMT.refreshChats().then(() => UI.refresh('dashboard', 'tabs')), 60000);

  // Mensagens vindas do popup / service worker.
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || !msg.type) return;
    if (msg.type === 'cmt:open') {
      UI.open(msg.panel, msg.params || null);
      sendResponse({ ok: true });
    } else if (msg.type === 'cmt:state') {
      sendResponse({ ready: CMT.state.ready, me: CMT.state.status && CMT.state.status.me, chats: CMT.state.chats.length, unread: CMT.state.chats.reduce((a, c) => a + (c.unread || 0), 0), running: !!(CMT.broadcast && CMT.broadcast.run) });
    } else if (msg.type === 'cmt:open-chat' && msg.chatId) {
      B.call('openChat', msg.chatId).catch(() => {});
      sendResponse({ ok: true });
    }
  });
})();
