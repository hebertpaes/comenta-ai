/* Contatos & grupos: extrair membros de grupos, exportar contatos e validar números. */
(() => {
  const CMT = window.CMT;
  const { ui: UI, util: U, store: S, bridge: B } = CMT;
  const h = UI.h;
  const G = (CMT.groups = {});
  let tab = 'groups';
  let groupId = '';
  let members = null;
  let contacts = null;
  let checkText = '';
  let checkResults = null;
  let busy = false;

  G.list = async () => {
    const groups = await B.call('getGroups');
    return groups.sort((a, b) => a.name.localeCompare(b.name));
  };

  /** Abre um seletor de grupo e devolve seus membros (sem o próprio usuário). */
  G.pickMembers = async () => {
    const groups = await G.list();
    if (!groups.length) return UI.toast('Você não participa de nenhum grupo.', 'warn'), null;
    const r = await UI.form('Membros de grupo', [{ name: 'g', label: 'Grupo', type: 'select', options: groups.map((g) => [g.id, `${g.name} (${g.size})`]) }], 'Carregar membros');
    if (!r) return null;
    const me = CMT.state.status && CMT.state.status.me;
    const parts = await B.call('getGroupParticipants', r.g);
    return parts.filter((p) => p.id !== me && (p.number || p.id)).map((p) => ({ id: p.id, number: p.number, name: p.name }));
  };

  const table = (rows, cols) =>
    h(
      'div',
      { class: 'pick-list', style: { maxHeight: '360px' } },
      rows.map((r) =>
        h(
          'div',
          { class: 'pick-item', style: { cursor: 'default' } },
          h('span', { class: 'avatar', style: { width: '26px', height: '26px', fontSize: '12px' } }, (r.name || r.number || '?')[0].toUpperCase()),
          h('div', { class: 'grow' }, h('b', null, r.name || '(sem nome)'), h('small', null, cols(r)))
        )
      )
    );

  const exportRows = (name, rows) => U.download(name, U.toCSV([['Nome', 'Número', 'ID']].concat(rows.map((r) => [r.name || '', r.number || '', r.id || '']))), 'text/csv;charset=utf-8');
  const copyNumbers = (rows) => navigator.clipboard.writeText(rows.map((r) => r.number).filter(Boolean).join('\n')).then(() => UI.toast('Números copiados.', 'success'));

  const actionsFor = (rows, name) =>
    UI.row(
      UI.btn('Exportar CSV', () => exportRows(`${name}.csv`, rows), { small: true, icon: 'download' }),
      UI.btn('Copiar números', () => copyNumbers(rows), { small: true, icon: 'copy' }),
      UI.btn(
        'Enviar transmissão',
        () => {
          CMT.broadcast.setRecipients(rows.filter((r) => r.number || r.id), false);
          UI.open('broadcast');
        },
        { small: true, icon: 'send', kind: 'primary' }
      ),
      UI.btn(
        'Adicionar ao CRM',
        async () => {
          const r = await UI.form('Adicionar ao CRM', [{ name: 'col', label: 'Coluna', type: 'select', options: CMT.kanban.columnOptions() }], 'Adicionar');
          if (!r) return;
          for (const x of rows) if (x.id) await CMT.kanban.add({ id: x.id, name: x.name || x.number, number: x.number }, r.col);
          UI.toast(`${rows.length} contato(s) adicionados ao CRM.`, 'success');
        },
        { small: true, icon: 'kanban' }
      )
    );

  const renderGroups = async (body) => {
    const groups = await G.list();
    const sel = groups.find((g) => g.id === groupId);
    body.append(
      UI.section(
        `Grupos (${groups.length})`,
        UI.row(
          UI.select([['', '— escolha um grupo —']].concat(groups.map((g) => [g.id, `${g.name} (${g.size} membros)`])), groupId, {
            onChange: (e) => {
              groupId = e.target.value;
              members = null;
              UI.renderPanel();
            },
          }),
          UI.btn(
            'Carregar membros',
            async () => {
              if (!groupId) return UI.toast('Escolha um grupo.', 'warn');
              busy = true;
              UI.renderPanel();
              try {
                const me = CMT.state.status && CMT.state.status.me;
                members = (await B.call('getGroupParticipants', groupId)).filter((p) => p.id !== me);
              } catch (e) {
                UI.toast(e.message, 'error');
              }
              busy = false;
              UI.renderPanel();
            },
            { kind: 'primary', icon: 'users', disabled: busy || !groupId }
          )
        ),
        busy ? h('p', { class: 'muted' }, 'Carregando…') : null,
        members
          ? h(
              'div',
              null,
              h('p', { class: 'muted' }, `${members.length} membro(s) em "${sel ? sel.name : ''}" · ${members.filter((m) => m.isAdmin).length} admin(s) · ${members.filter((m) => !m.number).length} sem número visível`),
              actionsFor(members, `grupo-${sel ? sel.name : 'membros'}`),
              h('div', { style: { height: '8px' } }),
              table(members, (m) => `${m.number ? `+${m.number}` : m.id}${m.isAdmin ? ' · admin' : ''}`)
            )
          : null
      ),
      UI.section(
        'Exportar lista de conversas',
        h('p', { class: 'muted' }, 'Baixa todas as conversas (contatos e grupos) com nome, número, não lidas e última mensagem.'),
        UI.btn(
          'Exportar conversas (CSV)',
          async () => {
            await CMT.refreshChats();
            const rows = [['Nome', 'Número', 'Tipo', 'Não lidas', 'Última mensagem', 'Data']].concat(
              CMT.state.chats.map((c) => [c.name, c.number, c.isGroup ? 'grupo' : 'contato', c.unread, c.last ? c.last.body : '', c.t ? U.fmtDate(c.t * 1000) : ''])
            );
            U.download('conversas.csv', U.toCSV(rows), 'text/csv;charset=utf-8');
          },
          { icon: 'download' }
        )
      )
    );
  };

  const renderContacts = (body) => {
    body.append(
      UI.section(
        'Contatos da agenda',
        UI.row(
          UI.btn(
            contacts ? 'Recarregar' : 'Carregar contatos',
            async () => {
              busy = true;
              UI.renderPanel();
              try {
                contacts = (await B.call('listContacts')).filter((c) => c.number || c.name).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
              } catch (e) {
                UI.toast(e.message, 'error');
              }
              busy = false;
              UI.renderPanel();
            },
            { kind: 'primary', icon: 'users', disabled: busy }
          ),
          contacts ? h('span', { class: 'muted' }, `${contacts.length} contato(s)`) : null
        ),
        busy ? h('p', { class: 'muted' }, 'Carregando…') : null,
        contacts ? h('div', null, h('div', { style: { height: '8px' } }), actionsFor(contacts, 'contatos'), h('div', { style: { height: '8px' } }), table(contacts, (c) => (c.number ? `+${c.number}` : c.id) + (c.isBusiness ? ' · comercial' : ''))) : null
      )
    );
  };

  const renderCheck = (body) => {
    body.append(
      UI.section(
        'Verificar números',
        h('p', { class: 'muted' }, 'Descubra quais números têm WhatsApp antes de uma transmissão.'),
        UI.textarea({ value: checkText, rows: 6, placeholder: '5511999999999\n5521988888888;Maria', onInput: (e) => (checkText = e.target.value) }),
        h('div', { style: { height: '8px' } }),
        UI.btn(
          'Verificar',
          async () => {
            const list = U.parseContacts(checkText);
            if (!list.length) return UI.toast('Cole ao menos um número.', 'warn');
            busy = true;
            checkResults = [];
            UI.renderPanel();
            for (const c of list) {
              try {
                const r = await B.call('checkNumber', c.number);
                checkResults.push(Object.assign({}, c, { exists: r.exists, id: r.id || '' }));
              } catch (e) {
                checkResults.push(Object.assign({}, c, { exists: false }));
              }
              await U.sleep(400);
            }
            busy = false;
            UI.renderPanel();
          },
          { kind: 'primary', icon: 'check', disabled: busy }
        ),
        busy ? h('p', { class: 'muted' }, `Verificando… ${checkResults ? checkResults.length : 0}`) : null,
        checkResults && !busy
          ? h(
              'div',
              null,
              h('div', { style: { height: '10px' } }),
              h('p', null, h('b', null, `${checkResults.filter((r) => r.exists).length}`), ' com WhatsApp · ', h('b', null, `${checkResults.filter((r) => !r.exists).length}`), ' sem WhatsApp'),
              actionsFor(checkResults.filter((r) => r.exists), 'numeros-validos'),
              h('div', { style: { height: '8px' } }),
              table(checkResults, (r) => `+${r.number} · ${r.exists ? '✅ tem WhatsApp' : '❌ não encontrado'}`)
            )
          : null
      )
    );
  };

  UI.register({
    id: 'groups',
    title: 'Contatos & grupos',
    icon: 'users',
    order: 11,
    async render(body) {
      body.append(
        h(
          'div',
          { class: 'tabs' },
          [
            ['groups', 'Grupos'],
            ['contacts', 'Contatos'],
            ['check', 'Verificar números'],
          ].map(([id, l]) => h('button', { class: `tab ${tab === id ? 'active' : ''}`, type: 'button', onClick: () => ((tab = id), UI.renderPanel()) }, l))
        )
      );
      if (!CMT.state.ready) return body.append(h('p', { class: 'muted' }, 'Aguardando conexão com o WhatsApp…'));
      if (tab === 'groups') await renderGroups(body);
      else if (tab === 'contacts') renderContacts(body);
      else renderCheck(body);
    },
  });

  CMT.features.groups = { init() {} };
})();
