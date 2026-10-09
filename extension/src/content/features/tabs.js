/* Abas & filtros: filtros rápidos (não lidas, grupos, etiquetas…) e abas personalizadas de conversas. */
(() => {
  const CMT = window.CMT;
  const { ui: UI, util: U, store: S, bridge: B } = CMT;
  const h = UI.h;
  let filter = 'unread';
  let query = '';

  const T = (CMT.tabs = {});
  T.all = () => S.get('tabs');
  T.byId = (id) => T.all().find((t) => t.id === id);
  T.addChats = (tabId, chats) =>
    S.update('tabs', (l) => {
      const t = l.find((x) => x.id === tabId);
      if (!t) return;
      for (const c of chats) if (!t.chats.some((x) => x.id === c.id)) t.chats.push({ id: c.id, name: c.name, number: c.number || '' });
    });
  T.removeChat = (tabId, chatId) => S.update('tabs', (l) => void (l.find((x) => x.id === tabId).chats = l.find((x) => x.id === tabId).chats.filter((c) => c.id !== chatId)));

  const editTab = async (existing) => {
    const r = await UI.form(existing ? 'Editar aba' : 'Nova aba', [
      { name: 'name', label: 'Nome da aba', value: existing ? existing.name : '', placeholder: 'Ex.: VIP, Fornecedores, Aguardando pagamento' },
      { name: 'color', label: 'Cor', type: 'color', value: existing ? existing.color : '#7c3aed' },
    ]);
    if (!r || !r.name.trim()) return;
    if (existing) await S.update('tabs', (l) => void Object.assign(l.find((x) => x.id === existing.id), { name: r.name, color: r.color }));
    else {
      const id = U.uid();
      await S.update('tabs', (l) => void l.push({ id, name: r.name, color: r.color, chats: [] }));
      filter = `tab:${id}`;
    }
  };

  const currentChats = () => {
    const chats = CMT.state.chats;
    let list;
    if (filter === 'all') list = chats;
    else if (filter === 'unread') list = chats.filter((c) => c.unread > 0);
    else if (filter === 'groups') list = chats.filter((c) => c.isGroup);
    else if (filter === 'contacts') list = chats.filter((c) => !c.isGroup);
    else if (filter === 'archived') list = chats.filter((c) => c.archived);
    else if (filter === 'pinned') list = chats.filter((c) => c.pinned);
    else if (filter.startsWith('label:')) {
      const id = filter.slice(6);
      list = chats.filter((c) => (c.labels || []).includes(id));
    } else if (filter.startsWith('tab:')) {
      const t = T.byId(filter.slice(4));
      list = t ? t.chats.map((c) => CMT.chatById(c.id) || Object.assign({ unread: 0, t: 0 }, c)) : [];
    } else list = chats;
    if (query) list = list.filter((c) => `${c.name} ${c.number}`.toLowerCase().includes(query));
    return list.slice().sort((a, b) => (b.unread > 0) - (a.unread > 0) || (b.t || 0) - (a.t || 0));
  };

  UI.register({
    id: 'tabs',
    title: 'Abas & filtros',
    icon: 'tabs',
    order: 10,
    render(body) {
      const tabs = T.all();
      const labels = CMT.state.labels || [];
      const chip = (id, label, color) =>
        h('button', { class: `chip ${filter === id ? 'active' : ''}`, type: 'button', style: color && filter !== id ? { borderColor: color, color } : null, onClick: () => ((filter = id), UI.renderPanel()) }, label);
      const list = currentChats();
      const curTab = filter.startsWith('tab:') ? T.byId(filter.slice(4)) : null;

      body.append(
        UI.section(
          'Filtros',
          UI.row(chip('unread', 'Não lidas'), chip('all', 'Todas'), chip('contacts', 'Contatos'), chip('groups', 'Grupos'), chip('pinned', 'Fixadas'), chip('archived', 'Arquivadas')),
          labels.length ? h('div', { style: { height: '8px' } }) : null,
          labels.length ? UI.row(h('span', { class: 'muted' }, 'Etiquetas:'), labels.map((l) => chip(`label:${l.id}`, l.name, l.color))) : null
        ),
        UI.section(
          'Minhas abas',
          UI.row(
            tabs.map((t) => chip(`tab:${t.id}`, `${t.name} (${t.chats.length})`, t.color)),
            UI.btn('Nova aba', () => editTab(null), { small: true, icon: 'plus', kind: 'primary' })
          ),
          curTab
            ? h(
                'div',
                null,
                h('div', { style: { height: '10px' } }),
                UI.row(
                  UI.btn(
                    'Adicionar conversa atual',
                    async () => {
                      const c = UI.requireChat();
                      if (c) await T.addChats(curTab.id, [c]);
                    },
                    { small: true, icon: 'plus' }
                  ),
                  UI.btn(
                    'Escolher conversas',
                    async () => {
                      const chats = await UI.pickChats({ multi: true, title: `Adicionar à aba "${curTab.name}"` });
                      if (chats) await T.addChats(curTab.id, chats);
                    },
                    { small: true, icon: 'users' }
                  ),
                  UI.btn('Enviar para todos', () => (curTab.chats.length ? CMT.quickSend(curTab.chats, { title: `Enviar para a aba "${curTab.name}"` }) : UI.toast('Aba vazia.', 'warn')), { small: true, icon: 'send' }),
                  UI.btn('Exportar CSV', () => U.download(`aba-${curTab.name}.csv`, U.toCSV([['Nome', 'Número', 'ID']].concat(curTab.chats.map((c) => [c.name, c.number, c.id]))), 'text/csv;charset=utf-8'), { small: true, icon: 'download' }),
                  UI.btn('Editar', () => editTab(curTab), { small: true, icon: 'edit' }),
                  UI.btn(
                    'Excluir aba',
                    async () => {
                      if (!(await UI.confirm(`Excluir a aba "${curTab.name}"?`, 'Excluir'))) return;
                      await S.update('tabs', (l) => l.filter((x) => x.id !== curTab.id));
                      filter = 'unread';
                      UI.renderPanel();
                    },
                    { small: true, icon: 'trash', kind: 'danger' }
                  )
                )
              )
            : h('p', { class: 'hint' }, 'Abas agrupam conversas do seu jeito (clientes VIP, fornecedores, aguardando pagamento…).')
        ),
        UI.section(
          `Conversas (${list.length})`,
          UI.row(
            UI.input({ placeholder: 'Buscar…', value: query, style: { width: '220px' }, onInput: (e) => ((query = e.target.value.toLowerCase()), UI.renderPanel()) }),
            h('div', { class: 'grow' }),
            filter === 'unread' && list.length
              ? UI.btn(
                  'Marcar todas como lidas',
                  async () => {
                    for (const c of list) await B.call('markRead', c.id).catch(() => {});
                    await CMT.refreshChats();
                    UI.renderPanel();
                  },
                  { small: true, icon: 'check' }
                )
              : null,
            UI.btn(
              'Atualizar',
              async () => {
                await CMT.refreshChats();
                UI.renderPanel();
              },
              { small: true, icon: 'refresh' }
            )
          ),
          h('div', { style: { height: '10px' } }),
          list.length
            ? h(
                'div',
                { class: 'list' },
                list.slice(0, 300).map((c) =>
                  h(
                    'div',
                    { class: 'item', style: { alignItems: 'center', cursor: 'pointer' }, onClick: () => B.call('openChat', c.id) },
                    h('span', { class: 'avatar' }, (c.name || '?')[0].toUpperCase()),
                    h('div', { class: 'grow' }, h('div', { class: 'title' }, c.name, c.isGroup ? h('span', { class: 'badge gray', style: { marginLeft: '6px' } }, 'grupo') : null), h('div', { class: 'text', style: { maxHeight: '20px' } }, c.last ? (c.last.fromMe ? '↗ ' : '') + c.last.body : c.number ? `+${c.number}` : '')),
                    c.unread ? UI.badge(String(c.unread)) : null,
                    h('small', { class: 'muted' }, U.fmtRelative(c.t)),
                    h(
                      'div',
                      { class: 'actions' },
                      UI.iconBtn('bell', (e) => (e.stopPropagation(), B.call('markUnread', c.id).then(() => UI.toast('Marcada como não lida.'))), 'Marcar como não lida'),
                      curTab ? UI.iconBtn('x', (e) => (e.stopPropagation(), T.removeChat(curTab.id, c.id)), 'Remover da aba', 'danger') : null
                    )
                  )
                )
              )
            : UI.empty('Nenhuma conversa neste filtro.')
        )
      );
    },
  });

  CMT.features.tabs = {
    init() {
      S.on('tabs', () => UI.refresh('tabs'));
    },
  };
})();
