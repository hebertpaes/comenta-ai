/* Chatbot: respostas automáticas por palavras-chave, boas-vindas, fora do expediente e IA. */
(() => {
  const CMT = window.CMT;
  const { ui: UI, util: U, store: S, bridge: B } = CMT;
  const h = UI.h;
  const CB = (CMT.chatbot = { log: [] });
  const cooldown = new Map(); // `${triggerId}|${chatId}` -> timestamp
  const awaySent = new Map(); // chatId -> dayKey
  const welcomed = new Set();
  const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const norm = (s) =>
    String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim();

  CB.inHours = (cfg = S.get('settings').chatbot) => {
    const now = new Date();
    if (!cfg.days.includes(now.getDay())) return false;
    const cur = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = cfg.start.split(':').map(Number);
    const [eh, em] = cfg.end.split(':').map(Number);
    const s = sh * 60 + sm;
    const e = eh * 60 + em;
    return s <= e ? cur >= s && cur < e : cur >= s || cur < e;
  };

  const matches = (t, body) => {
    const nb = norm(body);
    const kws = String(t.keywords || '')
      .split(',')
      .map((k) => norm(k))
      .filter(Boolean);
    switch (t.match) {
      case 'any':
        return true;
      case 'exact':
        return kws.some((k) => nb === k);
      case 'starts':
        return kws.some((k) => nb.startsWith(k));
      case 'regex':
        try {
          return new RegExp(t.keywords, 'i').test(body);
        } catch (e) {
          return false;
        }
      default:
        return kws.some((k) => nb.includes(k));
    }
  };

  const addLog = (entry) => {
    CB.log.unshift(Object.assign({ t: Date.now() }, entry));
    CB.log = CB.log.slice(0, 50);
    UI.refresh('chatbot');
  };

  const reply = async (chatId, vars, t) => {
    if (t.mode === 'funnel') {
      const f = CMT.funnels.byId(t.funnelId);
      if (!f) throw new Error('Funil não encontrado');
      await CMT.sendFunnel(chatId, f, vars, 'auto');
    } else if (t.mode === 'ai') {
      const text = await CMT.ai.autoReply(chatId, t.aiInstruction);
      await CMT.send(chatId, { text, typing: true, typingMs: Math.min(5000, 800 + text.length * 25) }, 'auto');
    } else {
      await CMT.send(chatId, { text: U.render(t.text, vars), file: t.file || null, typing: true, typingMs: 1500 }, 'auto');
    }
  };

  CB.handle = async (m) => {
    const cfg = S.get('settings').chatbot;
    if (!cfg.enabled || m.fromMe) return;
    if (m.isGroup && !cfg.groups) return;
    if (!m.body && !m.hasMedia) return;
    const vars = { nome: m.chatName || m.senderName || '', numero: m.chatId.endsWith('@c.us') ? m.chatId.split('@')[0] : '' };
    const inHours = CB.inHours(cfg);
    const wait = () => U.sleep(Math.max(0, cfg.replyDelay || 0) * 1000);

    // Boas-vindas para contatos novos (sem nenhuma mensagem nossa no histórico)
    if (cfg.welcomeEnabled && !m.isGroup && !welcomed.has(m.chatId)) {
      try {
        const msgs = await B.call('getMessages', m.chatId, 15);
        if (!msgs.some((x) => x.fromMe)) {
          welcomed.add(m.chatId);
          await wait();
          await CMT.send(m.chatId, { text: U.render(cfg.welcomeText, vars), typing: true }, 'auto');
          addLog({ chat: vars.nome || m.chatId, trigger: 'Boas-vindas', text: m.body });
          return;
        }
      } catch (e) {
        console.warn('[Comenta AI] boas-vindas', e);
      }
      welcomed.add(m.chatId);
    }

    // Gatilhos
    const hoursOk = cfg.hoursMode === 'always' || (cfg.hoursMode === 'inside' ? inHours : !inHours);
    if (hoursOk) {
      const triggers = S.get('triggers').filter((t) => t.enabled && (!m.isGroup || t.groups));
      for (const t of triggers) {
        if (!matches(t, m.body)) continue;
        const key = `${t.id}|${m.chatId}`;
        const last = cooldown.get(key) || 0;
        if (t.cooldownMin && Date.now() - last < t.cooldownMin * 60e3) return;
        cooldown.set(key, Date.now());
        await wait();
        try {
          await reply(m.chatId, vars, t);
          addLog({ chat: vars.nome || m.chatId, trigger: t.name, text: m.body });
        } catch (e) {
          addLog({ chat: vars.nome || m.chatId, trigger: t.name, text: m.body, error: e.message });
        }
        return;
      }
    }

    // Fora do expediente (uma vez por dia por conversa)
    if (cfg.awayEnabled && !inHours && !m.isGroup && awaySent.get(m.chatId) !== U.today()) {
      awaySent.set(m.chatId, U.today());
      await wait();
      try {
        await CMT.send(m.chatId, { text: U.render(cfg.awayText, vars), typing: true }, 'auto');
        addLog({ chat: vars.nome || m.chatId, trigger: 'Fora do expediente', text: m.body });
      } catch (e) {
        addLog({ chat: vars.nome || m.chatId, trigger: 'Fora do expediente', text: m.body, error: e.message });
      }
    }
  };

  // ------------------------------------------------------------ edição de gatilho
  const editTrigger = (existing) => {
    const st = existing ? JSON.parse(JSON.stringify(existing)) : { name: '', enabled: true, match: 'contains', keywords: '', mode: 'text', text: '', file: null, funnelId: '', aiInstruction: '', cooldownMin: 60, groups: false };
    const modeArea = h('div', null);
    const drawMode = () => {
      modeArea.textContent = '';
      if (st.mode === 'text') modeArea.append(UI.field('Resposta', UI.textarea({ value: st.text, rows: 4, onInput: (e) => (st.text = e.target.value) })), UI.varsHint(), UI.attachField(st, 'file'));
      else if (st.mode === 'funnel') modeArea.append(UI.field('Funil', UI.select(CMT.funnels.options('— escolha —'), st.funnelId, { onChange: (e) => (st.funnelId = e.target.value) })));
      else
        modeArea.append(
          UI.field('Instruções extras para a IA (opcional)', UI.textarea({ value: st.aiInstruction, rows: 3, placeholder: 'Ex.: Pergunte o nome e o que a pessoa precisa. Não prometa prazos.', onInput: (e) => (st.aiInstruction = e.target.value) })),
          h('p', { class: 'hint' }, 'A IA usa o contexto da conversa e a descrição do negócio definida em Configurações › IA. Requer chave de API.')
        );
    };
    drawMode();
    const body = h(
      'div',
      null,
      UI.field('Nome do gatilho', UI.input({ value: st.name, placeholder: 'Ex.: Preço, Horário, Menu', onInput: (e) => (st.name = e.target.value) })),
      h(
        'div',
        { class: 'grid2' },
        UI.field(
          'Quando a mensagem…',
          UI.select(
            [
              ['contains', 'contém alguma palavra'],
              ['exact', 'é exatamente'],
              ['starts', 'começa com'],
              ['regex', 'corresponde à regex'],
              ['any', 'qualquer mensagem'],
            ],
            st.match,
            { onChange: (e) => (st.match = e.target.value) }
          )
        ),
        UI.field('Palavras-chave (separe por vírgula)', UI.input({ value: st.keywords, placeholder: 'preço, valor, quanto custa', onInput: (e) => (st.keywords = e.target.value) }))
      ),
      UI.field(
        'Tipo de resposta',
        UI.select(
          [
            ['text', 'Texto / arquivo'],
            ['funnel', 'Funil'],
            ['ai', 'Resposta gerada por IA'],
          ],
          st.mode,
          {
            onChange: (e) => {
              st.mode = e.target.value;
              drawMode();
            },
          }
        )
      ),
      modeArea,
      h(
        'div',
        { class: 'grid2' },
        UI.field('Não repetir para o mesmo contato por (min)', UI.input({ type: 'number', min: 0, value: st.cooldownMin, onInput: (e) => (st.cooldownMin = Number(e.target.value)) }), '0 = responder sempre'),
        UI.field('Opções', UI.toggle(st.groups, (v) => (st.groups = v), 'Responder também em grupos'))
      )
    );
    UI.modal({
      title: existing ? 'Editar gatilho' : 'Novo gatilho',
      body,
      width: '600px',
      actions: [
        { label: 'Cancelar', onClick: (c) => c() },
        {
          label: 'Salvar',
          kind: 'primary',
          onClick: async (c) => {
            if (!st.name.trim()) return UI.toast('Dê um nome ao gatilho.', 'warn');
            if (st.match !== 'any' && !st.keywords.trim()) return UI.toast('Informe as palavras-chave.', 'warn');
            if (st.mode === 'text' && !st.text.trim() && !st.file) return UI.toast('Escreva a resposta.', 'warn');
            if (st.mode === 'funnel' && !st.funnelId) return UI.toast('Escolha o funil.', 'warn');
            c();
            await S.update('triggers', (l) => {
              if (existing) Object.assign(l.find((x) => x.id === existing.id) || {}, st);
              else l.push(Object.assign({ id: U.uid() }, st));
            });
          },
        },
      ],
    });
  };

  const describe = (t) => {
    const when = t.match === 'any' ? 'qualquer mensagem' : `${{ contains: 'contém', exact: 'é igual a', starts: 'começa com', regex: 'regex' }[t.match]} "${t.keywords}"`;
    const what = t.mode === 'funnel' ? `funil "${(CMT.funnels.byId(t.funnelId) || {}).name || '?'}"` : t.mode === 'ai' ? 'resposta por IA' : (t.text || '').slice(0, 60) + (t.file ? ` 📎 ${t.file.name}` : '');
    return `Se ${when} → ${what}`;
  };

  UI.register({
    id: 'chatbot',
    title: 'Chatbot / Respostas automáticas',
    icon: 'bot',
    order: 7,
    badge: () => (S.get('settings').chatbot.enabled ? 'ON' : 0),
    render(body) {
      const cfg = S.get('settings').chatbot;
      const upd = (fn) => S.update('settings', (s) => void fn(s.chatbot));
      const triggers = S.get('triggers');
      body.append(
        UI.section(
          null,
          UI.row(
            UI.toggle(cfg.enabled, (v) => upd((c) => (c.enabled = v)), cfg.enabled ? 'Chatbot ATIVADO' : 'Chatbot desativado'),
            h('div', { class: 'grow' }),
            UI.toggle(cfg.groups, (v) => upd((c) => (c.groups = v)), 'Atuar em grupos')
          ),
          h('p', { class: 'hint' }, `Responde automaticamente às mensagens recebidas enquanto esta aba estiver aberta. Agora está ${CB.inHours(cfg) ? 'DENTRO' : 'FORA'} do horário de atendimento.`)
        ),
        UI.section(
          'Horário de atendimento',
          h(
            'div',
            { class: 'grid3' },
            UI.field(
              'Gatilhos respondem…',
              UI.select(
                [
                  ['always', 'Sempre'],
                  ['inside', 'Só dentro do horário'],
                  ['outside', 'Só fora do horário'],
                ],
                cfg.hoursMode,
                { onChange: (e) => upd((c) => (c.hoursMode = e.target.value)) }
              )
            ),
            UI.field('Início', UI.input({ type: 'time', value: cfg.start, onChange: (e) => upd((c) => (c.start = e.target.value)) })),
            UI.field('Fim', UI.input({ type: 'time', value: cfg.end, onChange: (e) => upd((c) => (c.end = e.target.value)) }))
          ),
          UI.row(
            DAYS.map((d, i) =>
              h('button', { class: `chip ${cfg.days.includes(i) ? 'active' : ''}`, type: 'button', onClick: () => upd((c) => (c.days = c.days.includes(i) ? c.days.filter((x) => x !== i) : c.days.concat(i).sort())) }, d)
            ),
            h('div', { class: 'grow' }),
            h('span', { class: 'muted' }, 'Atraso antes de responder:'),
            UI.input({ type: 'number', min: 0, max: 120, value: cfg.replyDelay, style: { width: '70px' }, onChange: (e) => upd((c) => (c.replyDelay = Number(e.target.value))) }),
            h('span', { class: 'muted' }, 's')
          )
        ),
        UI.section(
          'Mensagens automáticas',
          UI.toggle(cfg.welcomeEnabled, (v) => upd((c) => (c.welcomeEnabled = v)), 'Boas-vindas para contatos novos (primeira conversa)'),
          UI.textarea({ value: cfg.welcomeText, rows: 3, style: { margin: '6px 0 14px' }, onChange: (e) => upd((c) => (c.welcomeText = e.target.value)) }),
          UI.toggle(cfg.awayEnabled, (v) => upd((c) => (c.awayEnabled = v)), 'Aviso de fora do expediente (1x por dia por contato)'),
          UI.textarea({ value: cfg.awayText, rows: 3, style: { margin: '6px 0 0' }, onChange: (e) => upd((c) => (c.awayText = e.target.value)) }),
          UI.varsHint()
        ),
        UI.section(
          `Gatilhos por palavra-chave (${triggers.length})`,
          UI.row(UI.btn('Novo gatilho', () => editTrigger(null), { kind: 'primary', icon: 'plus' }), h('span', { class: 'muted' }, 'O primeiro gatilho que combinar é usado. Arraste pela ordem com ↑↓.')),
          h('div', { style: { height: '10px' } }),
          triggers.length
            ? h(
                'div',
                { class: 'list' },
                triggers.map((t, i) =>
                  h(
                    'div',
                    { class: 'item', style: { opacity: t.enabled ? 1 : 0.55 } },
                    UI.toggle(t.enabled, (v) => S.update('triggers', (l) => void (l.find((x) => x.id === t.id).enabled = v))),
                    h('div', { class: 'grow' }, h('div', { class: 'title' }, t.name, ' ', t.groups ? h('span', { class: 'badge gray' }, 'grupos') : null), h('div', { class: 'text' }, describe(t))),
                    h(
                      'div',
                      { class: 'actions' },
                      UI.iconBtn('up', () => i > 0 && S.update('triggers', (l) => void ([l[i - 1], l[i]] = [l[i], l[i - 1]])), 'Subir'),
                      UI.iconBtn('down', () => i < triggers.length - 1 && S.update('triggers', (l) => void ([l[i + 1], l[i]] = [l[i], l[i + 1]])), 'Descer'),
                      UI.iconBtn('edit', () => editTrigger(t), 'Editar'),
                      UI.iconBtn('trash', async () => (await UI.confirm(`Excluir o gatilho "${t.name}"?`, 'Excluir')) && S.update('triggers', (l) => l.filter((x) => x.id !== t.id)), 'Excluir', 'danger')
                    )
                  )
                )
              )
            : h('p', { class: 'muted' }, 'Nenhum gatilho. Ex.: palavras "preço, valor" → resposta com a tabela de preços.')
        ),
        UI.section(
          'Últimas respostas automáticas',
          CB.log.length
            ? h('div', { class: 'log' }, CB.log.map((l) => h('div', { class: l.error ? 'fail' : 'ok' }, `${new Date(l.t).toLocaleTimeString()} · ${l.chat} · ${l.trigger} · "${(l.text || '').slice(0, 50)}"${l.error ? ` · ERRO: ${l.error}` : ''}`)))
            : h('p', { class: 'muted' }, 'Nada ainda nesta sessão.')
        )
      );
    },
  });

  CMT.features.chatbot = {
    init() {
      S.on('triggers', () => UI.refresh('chatbot'));
      S.on('settings', () => {
        UI.refresh('chatbot');
        UI.renderRail();
      });
      CMT.on('message', (m) => CB.handle(m).catch((e) => console.warn('[Comenta AI] chatbot', e)));
    },
  };
})();
