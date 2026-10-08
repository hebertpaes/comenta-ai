/* Notas internas por conversa (só você vê). */
(() => {
  const CMT = window.CMT;
  const { ui: UI, util: U, store: S, bridge: B } = CMT;
  const h = UI.h;
  let timer = null;

  UI.register({
    id: 'notes',
    title: 'Notas da conversa',
    icon: 'note',
    order: 13,
    render(body) {
      const chat = CMT.state.activeChat;
      const notes = S.get('notes');
      const cur = chat ? notes[chat.id] || {} : null;
      const status = h('small', { class: 'hint' }, cur && cur.updatedAt ? `Salvo em ${U.fmtDate(cur.updatedAt)}` : 'As notas são salvas automaticamente.');
      body.append(
        UI.section(
          chat ? `Nota para ${chat.name}` : 'Abra uma conversa para anotar',
          chat
            ? h(
                'div',
                null,
                UI.textarea({
                  value: cur.text || '',
                  rows: 7,
                  placeholder: 'Preferências do cliente, histórico, combinados…',
                  onInput: (e) => {
                    clearTimeout(timer);
                    const text = e.target.value;
                    timer = setTimeout(async () => {
                      await S.update('notes', (n) => {
                        if (text.trim()) n[chat.id] = { text, updatedAt: Date.now(), name: chat.name };
                        else delete n[chat.id];
                      });
                      status.textContent = `Salvo em ${U.fmtDate(Date.now())}`;
                    }, 600);
                  },
                }),
                status
              )
            : null
        ),
        UI.section(
          `Todas as notas (${Object.keys(notes).length})`,
          Object.keys(notes).length
            ? h(
                'div',
                { class: 'list' },
                Object.entries(notes)
                  .sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0))
                  .map(([id, n]) =>
                    h(
                      'div',
                      { class: 'item' },
                      h('div', { class: 'grow' }, h('div', { class: 'title' }, n.name || (CMT.chatById(id) || {}).name || id), h('div', { class: 'text' }, n.text), h('small', { class: 'muted' }, U.fmtDate(n.updatedAt))),
                      h('div', { class: 'actions' }, UI.iconBtn('open', () => B.call('openChat', id), 'Abrir conversa'), UI.iconBtn('trash', () => S.update('notes', (x) => void delete x[id]), 'Excluir', 'danger'))
                    )
                  )
              )
            : h('p', { class: 'muted' }, 'Nenhuma nota ainda.')
        )
      );
    },
  });

  CMT.features.notes = {
    init() {
      CMT.on('activeChat', () => UI.refresh('notes'));
    },
  };
})();
