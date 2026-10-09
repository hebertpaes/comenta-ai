/* CRM Kanban: organiza conversas em colunas com arrastar-e-soltar. */
(() => {
  const CMT = window.CMT;
  const { ui: UI, util: U, store: S, bridge: B } = CMT;
  const h = UI.h;
  let query = '';

  const K = (CMT.kanban = {});
  K.columns = () => S.get('kanban').columns;
  K.add = (chat, colId) =>
    S.update('kanban', (k) => {
      const col = colId || k.columns[0].id;
      const prev = k.cards[chat.id] || {};
      k.cards[chat.id] = Object.assign({ addedAt: Date.now() }, prev, { col, name: chat.name || prev.name || chat.id.split('@')[0], number: chat.number || prev.number || '', movedAt: Date.now() });
    });
  K.move = (chatId, colId) =>
    S.update('kanban', (k) => {
      if (k.cards[chatId] && k.cards[chatId].col !== colId) {
        k.cards[chatId].col = colId;
        k.cards[chatId].movedAt = Date.now();
      }
    });
  K.remove = (chatId) => S.update('kanban', (k) => void delete k.cards[chatId]);
  K.cardsIn = (colId) =>
    Object.entries(S.get('kanban').cards)
      .filter(([, c]) => c.col === colId)
      .map(([id, c]) => Object.assign({ id }, c));
  K.columnOptions = () => K.columns().map((c) => [c.id, c.name]);

  const editNote = async (id, card) => {
    const cur = (S.get('notes')[id] || {}).text || '';
    const r = await UI.form(`Anotação – ${card.name}`, [{ name: 'text', label: 'Anotação interna (só você vê)', type: 'textarea', value: cur }]);
    if (!r) return;
    await S.update('notes', (n) => {
      if (r.text.trim()) n[id] = { text: r.text, updatedAt: Date.now(), name: card.name };
      else delete n[id];
    });
  };

  const renderCard = (id, card) => {
    const chat = CMT.chatById(id);
    const note = (S.get('notes')[id] || {}).text;
    const el = h(
      'div',
      { class: 'kcard', draggable: true, title: 'Clique para abrir a conversa. Arraste para mover.', onClick: () => B.call('openChat', id).catch((e) => UI.toast(e.message, 'error')) },
      h(
        'div',
        { class: 'kname' },
        h('span', { class: 'avatar', style: { width: '26px', height: '26px', fontSize: '12px' } }, (card.name || '?')[0].toUpperCase()),
        h('span', null, card.name || id),
        chat && chat.unread ? UI.badge(String(chat.unread)) : null
      ),
      chat && chat.last ? h('div', { class: 'klast' }, (chat.last.fromMe ? '↗ ' : '↙ ') + (chat.last.body || '')) : card.number ? h('div', { class: 'klast' }, `+${card.number}`) : null,
      note ? h('div', { class: 'knote' }, note) : null,
      h(
        'div',
        { class: 'kfoot' },
        h('span', null, card.movedAt ? `há ${U.fmtRelative(card.movedAt / 1000)}` : ''),
        h(
          'div',
          { class: 'kactions' },
          UI.iconBtn('note', (e) => (e.stopPropagation(), editNote(id, card)), 'Anotação'),
          UI.iconBtn('send', (e) => (e.stopPropagation(), CMT.quickSend([{ id, name: card.name, number: card.number }], { title: `Enviar para ${card.name}` })), 'Enviar mensagem ou funil'),
          UI.iconBtn('trash', async (e) => {
            e.stopPropagation();
            if (await UI.confirm(`Remover "${card.name}" do CRM?`, 'Remover')) K.remove(id);
          }, 'Remover do CRM', 'danger')
        )
      )
    );
    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', id);
      e.dataTransfer.effectAllowed = 'move';
      el.classList.add('dragging');
    });
    el.addEventListener('dragend', () => el.classList.remove('dragging'));
    return el;
  };

  const editColumn = async (col) => {
    const r = await UI.form(col ? 'Editar coluna' : 'Nova coluna', [
      { name: 'name', label: 'Nome', value: col ? col.name : '' },
      { name: 'color', label: 'Cor', type: 'color', value: col ? col.color : '#7c3aed' },
    ]);
    if (!r || !r.name.trim()) return;
    await S.update('kanban', (k) => {
      if (col) Object.assign(k.columns.find((c) => c.id === col.id), { name: r.name, color: r.color });
      else k.columns.push({ id: U.uid(), name: r.name, color: r.color });
    });
  };

  const renderCol = (col, kb, idx) => {
    const cards = Object.entries(kb.cards)
      .filter(([, c]) => c.col === col.id && (!query || (c.name || '').toLowerCase().includes(query) || (c.number || '').includes(query)))
      .sort((a, b) => (b[1].movedAt || 0) - (a[1].movedAt || 0));
    const el = h(
      'div',
      { class: 'kcol' },
      h(
        'div',
        { class: 'kcol-head', style: { borderTopColor: col.color } },
        h('b', null, col.name),
        h('span', { class: 'badge gray' }, String(cards.length)),
        UI.iconBtn('plus', async () => {
          const chats = await UI.pickChats({ multi: true, title: `Adicionar em "${col.name}"` });
          if (chats) for (const c of chats) await K.add(c, col.id);
        }, 'Adicionar conversas'),
        UI.iconBtn('send', () => {
          const t = K.cardsIn(col.id);
          if (!t.length) return UI.toast('Coluna vazia.', 'warn');
          CMT.quickSend(t, { title: `Enviar para todos em "${col.name}"` });
        }, 'Enviar para toda a coluna'),
        UI.iconBtn('download', () => {
          const rows = [['Nome', 'Número', 'Coluna', 'Anotação', 'Adicionado em']].concat(
            K.cardsIn(col.id).map((c) => [c.name, c.number, col.name, (S.get('notes')[c.id] || {}).text || '', U.fmtDate(c.addedAt)])
          );
          U.download(`crm-${col.name}.csv`, U.toCSV(rows), 'text/csv;charset=utf-8');
        }, 'Exportar CSV'),
        UI.iconBtn('edit', () => editColumn(col), 'Editar coluna'),
        UI.iconBtn('trash', async () => {
          if (kb.columns.length <= 1) return UI.toast('Mantenha ao menos uma coluna.', 'warn');
          if (!(await UI.confirm(`Excluir a coluna "${col.name}"? Os cards vão para a primeira coluna.`, 'Excluir'))) return;
          await S.update('kanban', (k) => {
            k.columns = k.columns.filter((c) => c.id !== col.id);
            for (const c of Object.values(k.cards)) if (c.col === col.id) c.col = k.columns[0].id;
          });
        }, 'Excluir coluna', 'danger')
      ),
      h('div', { class: 'kcol-body' }, cards.length ? cards.map(([id, c]) => renderCard(id, c)) : h('p', { class: 'muted', style: { textAlign: 'center', padding: '14px 0' } }, 'Arraste conversas para cá'))
    );
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      el.classList.add('over');
    });
    el.addEventListener('dragleave', () => el.classList.remove('over'));
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('over');
      const id = e.dataTransfer.getData('text/plain');
      if (id) K.move(id, col.id);
    });
    return el;
  };

  UI.register({
    id: 'kanban',
    title: 'CRM Kanban',
    icon: 'kanban',
    order: 2,
    wide: true,
    badge: () => Object.keys(S.get('kanban').cards).length || 0,
    render(body) {
      const kb = S.get('kanban');
      const board = h('div', { class: 'kanban' });
      const drawBoard = () => {
        board.textContent = '';
        kb.columns.forEach((c, i) => board.append(renderCol(c, kb, i)));
        board.append(h('div', { style: { flex: 'none' } }, UI.btn('Nova coluna', () => editColumn(null), { icon: 'plus' })));
      };
      drawBoard();
      body.append(
        UI.row(
          UI.input({
            placeholder: 'Buscar no CRM…',
            value: query,
            style: { width: '220px' },
            onInput: (e) => {
              query = e.target.value.toLowerCase();
              drawBoard();
            },
          }),
          UI.btn(
            'Conversa atual',
            async () => {
              const c = UI.requireChat();
              if (!c) return;
              await K.add(c);
              UI.toast(`${c.name} adicionado ao CRM.`, 'success');
            },
            { icon: 'plus', kind: 'primary', title: 'Adicionar a conversa aberta na primeira coluna' }
          ),
          UI.btn(
            'Escolher conversas',
            async () => {
              const chats = await UI.pickChats({ multi: true, title: 'Adicionar ao CRM' });
              if (chats) for (const c of chats) await K.add(c);
            },
            { icon: 'users' }
          ),
          h('div', { class: 'grow' }),
          UI.toggle(kb.autoAdd, (v) => S.update('kanban', (k) => void (k.autoAdd = v)), 'Adicionar novas conversas automaticamente'),
          h('span', { class: 'muted' }, `${Object.keys(kb.cards).length} card(s)`)
        ),
        h('div', { style: { height: '12px' } }),
        board
      );
    },
  });

  CMT.features.kanban = {
    init() {
      S.on('kanban', () => UI.refresh('kanban'));
      S.on('notes', () => UI.refresh('kanban'));
      CMT.on('message', (m) => {
        const kb = S.get('kanban');
        if (!kb.autoAdd || m.fromMe || m.isGroup || kb.cards[m.chatId]) return;
        K.add({ id: m.chatId, name: m.chatName || m.senderName || m.chatId.split('@')[0], number: m.chatId.endsWith('@c.us') ? m.chatId.split('@')[0] : '' });
      });
    },
  };
})();
