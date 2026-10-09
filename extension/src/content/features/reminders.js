/* Lembretes ligados a conversas, com notificação no horário. */
(() => {
  const CMT = window.CMT;
  const { ui: UI, util: U, store: S, bridge: B } = CMT;
  const h = UI.h;
  const R = (CMT.reminders = {});

  R.create = (chat, text, at) =>
    S.update('reminders', (l) => void l.push({ id: U.uid(), chatId: chat ? chat.id : '', chatName: chat ? chat.name : 'Geral', text, at, done: false, createdAt: Date.now() }));

  R.edit = async (existing, presetChat) => {
    const chat = existing ? { id: existing.chatId, name: existing.chatName } : presetChat || CMT.state.activeChat;
    const r = await UI.form(existing ? 'Editar lembrete' : `Novo lembrete${chat ? ` – ${chat.name}` : ''}`, [
      { name: 'text', label: 'Lembrar de…', type: 'textarea', rows: 3, value: existing ? existing.text : '', placeholder: 'Ex.: Retornar com a proposta' },
      { name: 'at', label: 'Quando', type: 'datetime', value: U.toLocalInput(existing ? existing.at : Date.now() + 3600e3) },
    ]);
    if (!r || !r.text.trim()) return;
    const at = new Date(r.at).getTime();
    if (isNaN(at)) return UI.toast('Data inválida.', 'warn');
    if (existing) await S.update('reminders', (l) => void Object.assign(l.find((x) => x.id === existing.id) || {}, { text: r.text, at, done: false }));
    else await R.create(chat, r.text, at);
    UI.toast(`Lembrete para ${U.fmtDate(at)}.`, 'success');
  };

  R.quick = async (minutes) => {
    const chat = UI.requireChat();
    if (!chat) return;
    await R.create(chat, `Retornar para ${chat.name}`, Date.now() + minutes * 60e3);
    UI.toast(`Lembrete em ${minutes >= 60 ? `${minutes / 60}h` : `${minutes} min`} para ${chat.name}.`, 'success');
  };

  let busy = false;
  R.process = async () => {
    if (busy) return;
    busy = true;
    try {
      const due = S.get('reminders').filter((r) => !r.done && r.at <= Date.now());
      for (const r of due) {
        await S.update('reminders', (l) => void Object.assign(l.find((x) => x.id === r.id) || {}, { done: true, firedAt: Date.now() }));
        CMT.bg({ type: 'cmt:notify', title: `Lembrete: ${r.chatName}`, message: r.text, chatId: r.chatId }).catch(() => {});
        const t = h('div', { class: 'toast warn', style: { cursor: r.chatId ? 'pointer' : 'default' }, onClick: () => r.chatId && B.call('openChat', r.chatId) }, `⏰ ${r.chatName}: ${r.text}`);
        UI.toasts.appendChild(t);
        setTimeout(() => t.remove(), 60000);
      }
    } finally {
      busy = false;
    }
  };

  UI.register({
    id: 'reminders',
    title: 'Lembretes',
    icon: 'bell',
    order: 9,
    badge: () => S.get('reminders').filter((r) => !r.done).length,
    render(body) {
      const all = S.get('reminders');
      const open = all.filter((r) => !r.done).sort((a, b) => a.at - b.at);
      const done = all.filter((r) => r.done).sort((a, b) => (b.firedAt || b.at) - (a.firedAt || a.at)).slice(0, 30);
      const item = (r) =>
        h(
          'div',
          { class: 'item', style: { opacity: r.done ? 0.6 : 1 } },
          h('div', { class: 'grow' }, UI.row(h('span', { class: 'title' }, r.chatName), h('span', { class: 'badge gray' }, U.fmtDate(r.at))), h('div', { class: 'text' }, r.text)),
          h(
            'div',
            { class: 'actions' },
            r.chatId ? UI.iconBtn('open', () => B.call('openChat', r.chatId), 'Abrir conversa') : null,
            r.done ? UI.iconBtn('refresh', () => R.edit(r), 'Reagendar') : UI.iconBtn('edit', () => R.edit(r), 'Editar'),
            r.done ? null : UI.iconBtn('check', () => S.update('reminders', (l) => void (l.find((x) => x.id === r.id).done = true)), 'Concluir'),
            UI.iconBtn('trash', () => S.update('reminders', (l) => l.filter((x) => x.id !== r.id)), 'Excluir', 'danger')
          )
        );
      body.append(
        UI.section(
          'Lembrar da conversa atual em…',
          UI.row(
            [
              [30, '30 min'],
              [60, '1 hora'],
              [180, '3 horas'],
              [1440, 'Amanhã'],
            ].map(([m, l]) => UI.btn(l, () => R.quick(m), { small: true, icon: 'clock' })),
            UI.btn('Personalizado', () => R.edit(null), { small: true, kind: 'primary', icon: 'plus' })
          )
        ),
        UI.section(`Pendentes (${open.length})`, open.length ? h('div', { class: 'list' }, open.map(item)) : h('p', { class: 'muted' }, 'Nenhum lembrete pendente.')),
        done.length
          ? UI.section(
              'Concluídos',
              UI.row(UI.btn('Limpar concluídos', () => S.set('reminders', open), { small: true, icon: 'trash' })),
              h('div', { style: { height: '8px' } }),
              h('div', { class: 'list' }, done.map(item))
            )
          : null
      );
    },
  });

  CMT.features.reminders = {
    init() {
      S.on('reminders', () => {
        UI.refresh('reminders');
        UI.renderRail();
      });
      setInterval(R.process, 20000);
      setTimeout(R.process, 3000);
    },
  };
})();
