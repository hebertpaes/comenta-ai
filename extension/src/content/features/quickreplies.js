/* Respostas rápidas com atalhos (/atalho) direto na caixa de mensagem do WhatsApp. */
(() => {
  const CMT = window.CMT;
  const { ui: UI, util: U, store: S, bridge: B } = CMT;
  const h = UI.h;
  let query = '';

  const QR = (CMT.quickReplies = {});
  QR.all = () => S.get('quickReplies');
  const varsFor = (chat) => (chat ? { nome: chat.name, numero: chat.number } : {});

  QR.insert = async (q) => {
    const chat = UI.requireChat();
    if (!chat) return;
    const text = U.render(q.text, varsFor(chat));
    if (q.file) {
      await CMT.send(chat.id, { file: q.file, text });
      UI.toast('Arquivo enviado.', 'success');
    } else {
      await B.call('setInputText', text);
    }
  };
  QR.sendNow = async (q) => {
    const chat = UI.requireChat();
    if (!chat) return;
    await CMT.send(chat.id, { file: q.file, text: U.render(q.text, varsFor(chat)) });
    UI.toast('Mensagem enviada.', 'success');
  };

  const edit = async (existing) => {
    const st = existing ? JSON.parse(JSON.stringify(existing)) : { shortcut: '', title: '', text: '', file: null };
    const body = h(
      'div',
      null,
      h(
        'div',
        { class: 'grid2' },
        UI.field('Atalho', UI.input({ value: st.shortcut, placeholder: 'ex.: oi', onInput: (e) => (st.shortcut = e.target.value.replace(/[^\w-]/g, '').toLowerCase()) }), 'Digite /atalho na conversa'),
        UI.field('Título', UI.input({ value: st.title, placeholder: 'Saudação', onInput: (e) => (st.title = e.target.value) }))
      ),
      UI.field('Mensagem', UI.textarea({ value: st.text, rows: 6, onInput: (e) => (st.text = e.target.value) })),
      UI.varsHint(),
      UI.attachField(st, 'file')
    );
    UI.modal({
      title: existing ? 'Editar resposta rápida' : 'Nova resposta rápida',
      body,
      actions: [
        { label: 'Cancelar', onClick: (c) => c() },
        {
          label: 'Salvar',
          kind: 'primary',
          onClick: async (c) => {
            if (!st.shortcut) return UI.toast('Defina um atalho.', 'warn');
            if (!st.text.trim() && !st.file) return UI.toast('Escreva a mensagem ou anexe um arquivo.', 'warn');
            const dup = QR.all().find((q) => q.shortcut === st.shortcut && q.id !== st.id);
            if (dup) return UI.toast(`O atalho /${st.shortcut} já existe.`, 'warn');
            c();
            await S.update('quickReplies', (l) => {
              if (existing) Object.assign(l.find((x) => x.id === existing.id) || {}, st);
              else l.push(Object.assign({ id: U.uid() }, st));
            });
          },
        },
      ],
    });
  };

  // ------------------------------------------------------------ popup /atalho no compositor
  let pop = null;
  let sel = 0;
  let items = [];
  const composerOf = (node) => {
    const main = document.querySelector('#main');
    if (!main || !node || !main.contains(node)) return null;
    const footer = main.querySelector('footer');
    if (!footer || !footer.contains(node)) return null;
    const el = node.closest ? node.closest('[contenteditable="true"]') : null;
    return el;
  };
  const hide = () => {
    if (pop) pop.remove();
    pop = null;
    items = [];
  };
  const drawPop = (anchor) => {
    if (!pop) {
      pop = h('div', { class: 'qr-pop' });
      UI.popupLayer.appendChild(pop);
    }
    const r = anchor.getBoundingClientRect();
    pop.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - 390))}px`;
    pop.style.bottom = `${window.innerHeight - r.top + 10}px`;
    pop.textContent = '';
    pop.append(h('div', { class: 'qr-h' }, 'Respostas rápidas · ↑↓ navegar · Enter inserir · Esc fechar'));
    items.forEach((q, i) =>
      pop.append(
        h(
          'div',
          {
            class: `qr-opt ${i === sel ? 'sel' : ''}`,
            onMousedown: (e) => {
              e.preventDefault();
              choose(q);
            },
          },
          h('b', null, `/${q.shortcut}`),
          q.title,
          h('small', null, q.file ? `📎 ${q.file.name} ` : '', (q.text || '').replace(/\s+/g, ' '))
        )
      )
    );
  };
  const choose = async (q) => {
    hide();
    try {
      await QR.insert(q);
    } catch (e) {
      UI.toast(e.message, 'error');
    }
  };
  const onInput = (e) => {
    const el = composerOf(e.target);
    if (!el) return pop && hide();
    if (!S.get('settings').ui.quickReplySlash) return;
    const text = (el.textContent || '').trim();
    const m = text.match(/^\/([\w-]*)$/);
    if (!m) return hide();
    const q = m[1].toLowerCase();
    items = QR.all()
      .filter((x) => x.shortcut.startsWith(q) || x.title.toLowerCase().includes(q))
      .slice(0, 8);
    if (!items.length) return hide();
    sel = 0;
    drawPop(el);
  };
  const onKey = (e) => {
    if (!pop) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      sel = (sel + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length;
      drawPop(composerOf(e.target) || document.body);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (items[sel]) choose(items[sel]);
    } else if (e.key === 'Escape') {
      hide();
    } else return;
    e.preventDefault();
    e.stopPropagation();
  };

  // ------------------------------------------------------------ painel
  UI.register({
    id: 'quickreplies',
    title: 'Respostas rápidas',
    icon: 'zap',
    order: 5,
    render(body) {
      const list = QR.all().filter((q) => !query || `${q.shortcut} ${q.title} ${q.text}`.toLowerCase().includes(query));
      body.append(
        UI.row(
          UI.input({ placeholder: 'Buscar…', value: query, style: { width: '200px' }, onInput: (e) => ((query = e.target.value.toLowerCase()), UI.renderPanel()) }),
          UI.btn('Nova resposta', () => edit(null), { kind: 'primary', icon: 'plus' }),
          h('div', { class: 'grow' }),
          UI.btn('Exportar', () => U.download('respostas-rapidas.json', JSON.stringify(QR.all(), null, 2), 'application/json'), { small: true, icon: 'download' }),
          UI.btn(
            'Importar',
            async () => {
              const f = await U.pickFile('.json');
              if (!f) return;
              try {
                const arr = JSON.parse(await U.readFile(f, 'text'));
                if (!Array.isArray(arr)) throw new Error('Formato inválido');
                await S.update('quickReplies', (l) => {
                  for (const q of arr) if (q && q.shortcut && (q.text || q.file) && !l.some((x) => x.shortcut === q.shortcut)) l.push({ id: U.uid(), shortcut: q.shortcut, title: q.title || q.shortcut, text: q.text || '', file: q.file || null });
                });
                UI.toast('Respostas importadas.', 'success');
              } catch (e) {
                UI.toast(`Erro ao importar: ${e.message}`, 'error');
              }
            },
            { small: true, icon: 'upload' }
          )
        ),
        h('p', { class: 'muted', style: { margin: '10px 0' } }, 'Digite / na caixa de mensagem do WhatsApp para ver os atalhos. Enter insere o texto (você revisa e envia).'),
        UI.toggle(S.get('settings').ui.quickReplySlash, (v) => S.update('settings', (s) => void (s.ui.quickReplySlash = v)), 'Ativar atalhos com / no compositor'),
        h('div', { style: { height: '12px' } }),
        list.length
          ? h(
              'div',
              { class: 'list' },
              list.map((q) =>
                h(
                  'div',
                  { class: 'item' },
                  h('div', { class: 'grow' }, UI.row(h('span', { class: 'badge' }, `/${q.shortcut}`), h('span', { class: 'title' }, q.title)), h('div', { class: 'text' }, q.file ? `📎 ${q.file.name}\n` : '', q.text)),
                  h(
                    'div',
                    { class: 'actions' },
                    UI.iconBtn('edit', () => edit(q), 'Editar'),
                    UI.iconBtn('message', () => QR.insert(q).catch((e) => UI.toast(e.message, 'error')), 'Inserir na conversa atual'),
                    UI.iconBtn('send', () => QR.sendNow(q).catch((e) => UI.toast(e.message, 'error')), 'Enviar agora'),
                    UI.iconBtn('trash', async () => (await UI.confirm(`Excluir /${q.shortcut}?`, 'Excluir')) && S.update('quickReplies', (l) => l.filter((x) => x.id !== q.id)), 'Excluir', 'danger')
                  )
                )
              )
            )
          : UI.empty('Nenhuma resposta rápida encontrada.')
      );
    },
  });

  CMT.features.quickReplies = {
    init() {
      S.on('quickReplies', () => UI.refresh('quickreplies'));
      document.addEventListener('input', onInput, true);
      document.addEventListener('keydown', onKey, true);
      document.addEventListener('click', (e) => pop && !composerOf(e.target) && hide(), true);
    },
  };
})();
