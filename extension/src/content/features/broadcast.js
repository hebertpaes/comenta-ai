/* Transmissão: envio em massa com intervalos aleatórios, lotes, limite diário e relatório. */
(() => {
  const CMT = window.CMT;
  const { ui: UI, util: U, store: S } = CMT;
  const h = UI.h;
  const BC = (CMT.broadcast = { run: null });
  const draft = { name: '', mode: 'text', text: '', file: null, funnelId: '', recipients: [] };
  let tab = 'new';
  const refs = {};

  BC.setRecipients = (list, append = true) => {
    const out = append ? draft.recipients.slice() : [];
    const seen = new Set(out.map((r) => r.number || r.id));
    for (const r of list || []) {
      const key = r.number || r.id;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({ id: r.id || '', number: r.number || '', name: r.name || '' });
    }
    draft.recipients = out;
    UI.refresh('broadcast');
  };

  // ------------------------------------------------------------ fontes de destinatários
  const addFromText = () =>
    UI.form('Colar números', [
      { name: 'text', label: 'Um por linha: número ou número;nome', type: 'textarea', rows: 10, placeholder: '5511999999999;Maria\n5521988888888;João', hint: 'Use o DDI (55) + DDD + número. Nomes são opcionais e viram a variável {nome}.' },
    ]).then((r) => r && BC.setRecipients(U.parseContacts(r.text)));

  const addFromCSV = async () => {
    const f = await U.pickFile('.csv,.txt');
    if (!f) return;
    const list = U.parseContacts(await U.readFile(f, 'text'));
    BC.setRecipients(list);
    UI.toast(`${list.length} contato(s) importado(s).`, 'success');
  };

  const addFromChats = async () => {
    const chats = await UI.pickChats({ multi: true, title: 'Escolher conversas', filter: (c) => !c.isGroup });
    if (chats) BC.setRecipients(chats);
  };

  const addFromKanban = async () => {
    const r = await UI.form('Coluna do CRM', [{ name: 'col', label: 'Coluna', type: 'select', options: CMT.kanban.columnOptions() }], 'Adicionar');
    if (r) BC.setRecipients(CMT.kanban.cardsIn(r.col));
  };

  const addFromTab = async () => {
    const tabs = S.get('tabs');
    if (!tabs.length) return UI.toast('Você ainda não criou abas personalizadas.', 'warn');
    const r = await UI.form('Aba personalizada', [{ name: 'tab', label: 'Aba', type: 'select', options: tabs.map((t) => [t.id, t.name]) }], 'Adicionar');
    if (!r) return;
    const t = tabs.find((x) => x.id === r.tab);
    BC.setRecipients(t.chats.filter((c) => !c.id.endsWith('@g.us')));
  };

  const addFromGroup = async () => {
    const members = await CMT.groups.pickMembers();
    if (members) BC.setRecipients(members);
  };

  // ------------------------------------------------------------ execução
  const sleepInt = async (ms, run) => {
    const end = Date.now() + ms;
    while (Date.now() < end && !run.stopped) {
      await U.sleep(250);
      while (run.paused && !run.stopped) await U.sleep(300);
    }
  };
  const log = (run, cls, text) => {
    run.log.push({ cls, text, t: Date.now() });
    if (refs.log && refs.log.isConnected) {
      refs.log.prepend(h('div', { class: cls }, `${new Date().toLocaleTimeString()} — ${text}`));
    }
  };
  const progress = (run) => {
    if (refs.bar && refs.bar.isConnected) {
      refs.bar.style.width = `${Math.round((run.index / run.total) * 100)}%`;
      refs.count.textContent = `${run.index}/${run.total} · ✅ ${run.sent} · ❌ ${run.failed}`;
    }
  };

  BC.start = async () => {
    if (BC.run) return;
    if (!CMT.state.ready) return UI.toast('O WhatsApp ainda não está conectado.', 'error');
    if (!draft.recipients.length) return UI.toast('Adicione destinatários.', 'warn');
    const funnel = draft.mode === 'funnel' ? CMT.funnels.byId(draft.funnelId) : null;
    if (draft.mode === 'funnel' && !funnel) return UI.toast('Escolha um funil.', 'warn');
    if (draft.mode === 'text' && !draft.text.trim() && !draft.file) return UI.toast('Escreva a mensagem ou anexe um arquivo.', 'warn');
    const cfg = S.get('settings').broadcast;
    const todayCount = () => S.get('stats').byDay[U.today()] || 0;
    if (cfg.dailyLimit && todayCount() >= cfg.dailyLimit) return UI.toast(`Limite diário de ${cfg.dailyLimit} mensagens atingido.`, 'error');
    if (!(await UI.confirm(`Iniciar envio para ${draft.recipients.length} destinatário(s)? Intervalo de ${cfg.minDelay}–${cfg.maxDelay}s entre mensagens.`, 'Iniciar', 'primary'))) return;

    const run = (BC.run = {
      id: U.uid(),
      name: draft.name.trim() || `Campanha ${U.fmtDate(Date.now())}`,
      startedAt: Date.now(),
      recipients: draft.recipients.slice(),
      total: draft.recipients.length,
      index: 0,
      sent: 0,
      failed: 0,
      paused: false,
      stopped: false,
      results: [],
      log: [],
      mode: draft.mode,
      text: draft.text,
      file: draft.file,
      funnel,
    });
    UI.renderRail();
    UI.refresh('broadcast');
    log(run, '', `Iniciando "${run.name}" para ${run.total} destinatário(s).`);

    for (let i = 0; i < run.recipients.length; i++) {
      while (run.paused && !run.stopped) await U.sleep(300);
      if (run.stopped) break;
      const r = run.recipients[i];
      run.index = i + 1;
      const target = r.number || r.id;
      const vars = { nome: r.name, numero: r.number };
      try {
        if (cfg.dailyLimit && todayCount() >= cfg.dailyLimit) {
          run.stopped = true;
          throw new Error(`Limite diário (${cfg.dailyLimit}) atingido. Envio interrompido.`);
        }
        if (run.funnel) await CMT.sendFunnel(target, run.funnel, vars, 'broadcast', () => run.stopped);
        else await CMT.send(target, { text: U.render(run.text, vars), file: run.file, typing: cfg.typing, typingMs: U.rand(1200, 3000) }, 'broadcast');
        run.sent++;
        run.results.push({ number: r.number, name: r.name, id: r.id, status: 'ok' });
        log(run, 'ok', `✅ ${r.name || ''} ${r.number || r.id}`);
      } catch (e) {
        run.failed++;
        run.results.push({ number: r.number, name: r.name, id: r.id, status: 'erro', error: e.message });
        log(run, 'fail', `❌ ${r.name || ''} ${r.number || r.id}: ${e.message}`);
      }
      progress(run);
      if (i < run.recipients.length - 1 && !run.stopped) {
        if (cfg.batchSize > 0 && run.index % cfg.batchSize === 0) {
          log(run, '', `⏸ Pausa de ${cfg.batchPause}s após ${run.index} envios (lote).`);
          await sleepInt(cfg.batchPause * 1000, run);
        } else {
          await sleepInt(U.rand(cfg.minDelay, cfg.maxDelay) * 1000, run);
        }
      }
    }

    run.finishedAt = Date.now();
    log(run, '', run.stopped ? 'Envio interrompido.' : 'Envio concluído.');
    await S.update('campaigns', (l) => {
      l.unshift({
        id: run.id,
        name: run.name,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        total: run.total,
        sent: run.sent,
        failed: run.failed,
        stopped: run.stopped,
        mode: run.mode,
        text: run.funnel ? `Funil: ${run.funnel.name}` : run.text,
        results: run.results,
      });
      return l.slice(0, 50);
    });
    CMT.webhook('broadcast_finished', { name: run.name, total: run.total, sent: run.sent, failed: run.failed });
    UI.toast(`Transmissão "${run.name}" finalizada: ${run.sent} enviadas, ${run.failed} falhas.`, run.failed ? 'warn' : 'success', 6000);
    BC.run = null;
    if (!run.stopped) draft.recipients = [];
    UI.renderRail();
    UI.refresh('broadcast');
  };

  const exportCampaign = (c) => {
    const rows = [['Nome', 'Número', 'Status', 'Erro']].concat(c.results.map((r) => [r.name || '', r.number || r.id || '', r.status, r.error || '']));
    U.download(`relatorio-${c.name.replace(/[^\w-]+/g, '_')}.csv`, U.toCSV(rows), 'text/csv;charset=utf-8');
  };

  // ------------------------------------------------------------ render
  const renderRun = (body, run) => {
    refs.bar = h('div', { style: { width: `${Math.round((run.index / run.total) * 100)}%` } });
    refs.count = h('b', null, `${run.index}/${run.total} · ✅ ${run.sent} · ❌ ${run.failed}`);
    refs.log = h('div', { class: 'log' }, run.log.slice().reverse().map((l) => h('div', { class: l.cls }, `${new Date(l.t).toLocaleTimeString()} — ${l.text}`)));
    body.append(
      UI.section(
        `Enviando: ${run.name}`,
        h('div', { class: 'progress' }, refs.bar),
        h('div', { style: { height: '8px' } }),
        UI.row(
          refs.count,
          h('div', { class: 'grow' }),
          run.paused
            ? UI.btn('Continuar', () => ((run.paused = false), UI.renderPanel()), { icon: 'play', kind: 'success' })
            : UI.btn('Pausar', () => ((run.paused = true), UI.renderPanel()), { icon: 'pause' }),
          UI.btn('Parar', async () => (await UI.confirm('Interromper a transmissão?', 'Parar')) && (run.stopped = true), { icon: 'stop', kind: 'danger' })
        ),
        h('p', { class: 'muted' }, 'Mantenha esta aba do WhatsApp Web aberta até o fim do envio.')
      ),
      UI.section('Registro', refs.log)
    );
  };

  const renderComposer = (body) => {
    const cfg = S.get('settings').broadcast;
    const recipients = draft.recipients;
    body.append(
      UI.section(
        'Mensagem',
        UI.field('Nome da campanha (opcional)', UI.input({ value: draft.name, placeholder: 'Ex.: Promoção de outubro', onInput: (e) => (draft.name = e.target.value) })),
        UI.row(
          h('button', { class: `chip ${draft.mode === 'text' ? 'active' : ''}`, type: 'button', onClick: () => ((draft.mode = 'text'), UI.renderPanel()) }, 'Mensagem única'),
          h('button', { class: `chip ${draft.mode === 'funnel' ? 'active' : ''}`, type: 'button', onClick: () => ((draft.mode = 'funnel'), UI.renderPanel()) }, 'Funil (sequência)')
        ),
        h('div', { style: { height: '10px' } }),
        draft.mode === 'text'
          ? h(
              'div',
              null,
              UI.textarea({ value: draft.text, rows: 6, placeholder: '{saudacao}, {primeiro_nome}! {Temos|Preparamos} uma novidade para você…', onInput: (e) => (draft.text = e.target.value) }),
              UI.varsHint(),
              UI.attachField(draft, 'file')
            )
          : UI.field('Funil', UI.select(CMT.funnels.options('— escolha um funil —'), draft.funnelId, { onChange: (e) => (draft.funnelId = e.target.value) }), 'Crie e edite funis no painel "Funis de mensagens".')
      ),
      UI.section(
        `Destinatários (${recipients.length})`,
        UI.row(
          UI.btn('Colar números', addFromText, { icon: 'edit', small: true }),
          UI.btn('Importar CSV', addFromCSV, { icon: 'upload', small: true }),
          UI.btn('Conversas', addFromChats, { icon: 'message', small: true }),
          UI.btn('Membros de grupo', addFromGroup, { icon: 'users', small: true }),
          UI.btn('Coluna do CRM', addFromKanban, { icon: 'kanban', small: true }),
          UI.btn('Aba', addFromTab, { icon: 'tabs', small: true })
        ),
        h('div', { style: { height: '10px' } }),
        recipients.length
          ? h(
              'div',
              null,
              h(
                'div',
                { class: 'pick-list', style: { maxHeight: '220px', marginTop: 0 } },
                recipients.slice(0, 200).map((r, i) =>
                  h(
                    'div',
                    { class: 'pick-item', style: { cursor: 'default' } },
                    h('span', { class: 'avatar', style: { width: '26px', height: '26px', fontSize: '12px' } }, (r.name || r.number || '?')[0].toUpperCase()),
                    h('div', { class: 'grow' }, h('b', null, r.name || '(sem nome)'), h('small', null, r.number ? `+${r.number}` : r.id)),
                    UI.iconBtn('x', () => {
                      draft.recipients.splice(i, 1);
                      UI.renderPanel();
                    }, 'Remover')
                  )
                ),
                recipients.length > 200 ? h('p', { class: 'muted' }, `… e mais ${recipients.length - 200}`) : null
              ),
              UI.row(
                UI.btn('Limpar lista', () => ((draft.recipients = []), UI.renderPanel()), { small: true, icon: 'trash' }),
                UI.btn('Exportar lista', () => U.download('destinatarios.csv', U.toCSV([['Número', 'Nome']].concat(recipients.map((r) => [r.number || r.id, r.name]))), 'text/csv;charset=utf-8'), { small: true, icon: 'download' })
              )
            )
          : h('p', { class: 'muted' }, 'Nenhum destinatário. Use os botões acima para adicionar.')
      ),
      UI.section(
        'Envio',
        h('p', { class: 'muted' }, `Intervalo aleatório de ${cfg.minDelay}–${cfg.maxDelay}s · pausa de ${cfg.batchPause}s a cada ${cfg.batchSize} mensagens · limite diário ${cfg.dailyLimit || 'sem limite'} · ${cfg.typing ? 'simula digitação' : 'sem simular digitação'}.`),
        UI.row(
          UI.btn('Iniciar transmissão', BC.start, { kind: 'primary', icon: 'send' }),
          UI.btn('Ajustar intervalos', () => UI.open('settings', { section: 'broadcast' }), { icon: 'settings' })
        ),
        h('p', { class: 'hint' }, 'Envios em massa fora das regras do WhatsApp podem resultar em bloqueio da conta. Envie apenas para quem autorizou receber suas mensagens.')
      )
    );
  };

  const renderHistory = (body) => {
    const list = S.get('campaigns');
    body.append(
      list.length
        ? h(
            'div',
            { class: 'list' },
            list.map((c) =>
              h(
                'div',
                { class: 'item' },
                h(
                  'div',
                  { class: 'grow' },
                  h('div', { class: 'title' }, c.name, ' ', c.stopped ? h('span', { class: 'badge gray' }, 'interrompida') : null),
                  h('div', { class: 'muted' }, `${U.fmtDate(c.startedAt)} · ${c.total} destinatários · ✅ ${c.sent} · ❌ ${c.failed}`),
                  h('div', { class: 'text' }, c.text || '')
                ),
                h(
                  'div',
                  { class: 'actions' },
                  UI.iconBtn('refresh', () => {
                    const failed = c.results.filter((r) => r.status !== 'ok');
                    if (!failed.length) return UI.toast('Nenhuma falha para reenviar.', 'info');
                    BC.setRecipients(failed, false);
                    tab = 'new';
                    UI.renderPanel();
                    UI.toast(`${failed.length} destinatário(s) com falha carregados.`, 'success');
                  }, 'Reenviar para as falhas'),
                  UI.iconBtn('download', () => exportCampaign(c), 'Exportar relatório CSV'),
                  UI.iconBtn('trash', async () => (await UI.confirm('Excluir este relatório?', 'Excluir')) && S.update('campaigns', (l) => l.filter((x) => x.id !== c.id)), 'Excluir', 'danger')
                )
              )
            )
          )
        : UI.empty('Nenhuma campanha enviada ainda.')
    );
  };

  UI.register({
    id: 'broadcast',
    title: 'Transmissão em massa',
    icon: 'send',
    order: 3,
    badge: () => (BC.run ? `${BC.run.index}/${BC.run.total}` : 0),
    render(body) {
      body.append(
        h(
          'div',
          { class: 'tabs' },
          h('button', { class: `tab ${tab === 'new' ? 'active' : ''}`, type: 'button', onClick: () => ((tab = 'new'), UI.renderPanel()) }, BC.run ? 'Em andamento' : 'Nova transmissão'),
          h('button', { class: `tab ${tab === 'history' ? 'active' : ''}`, type: 'button', onClick: () => ((tab = 'history'), UI.renderPanel()) }, `Histórico (${S.get('campaigns').length})`)
        )
      );
      if (tab === 'history') renderHistory(body);
      else if (BC.run) renderRun(body, BC.run);
      else renderComposer(body);
    },
  });

  CMT.features.broadcast = {
    init() {
      S.on('campaigns', () => UI.refresh('broadcast'));
      window.addEventListener('beforeunload', (e) => {
        if (BC.run && !BC.run.finishedAt) {
          e.preventDefault();
          e.returnValue = '';
        }
      });
    },
  };
})();
