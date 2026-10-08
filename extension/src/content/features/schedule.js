/* Agendamento de mensagens (únicas ou recorrentes) para conversas. */
(() => {
  const CMT = window.CMT;
  const { ui: UI, util: U, store: S, bridge: B } = CMT;
  const h = UI.h;
  const SC = (CMT.schedule = {});
  let busy = false;
  let tab = 'pending';

  const REPEAT = [
    ['none', 'Não repetir'],
    ['daily', 'Diariamente'],
    ['weekly', 'Semanalmente'],
    ['monthly', 'Mensalmente'],
  ];
  const repeatLabel = (r) => (REPEAT.find((x) => x[0] === r) || REPEAT[0])[1];

  const nextAt = (at, repeat) => {
    if (!repeat || repeat === 'none') return null;
    const d = new Date(at);
    const now = Date.now();
    let guard = 0;
    do {
      if (repeat === 'daily') d.setDate(d.getDate() + 1);
      else if (repeat === 'weekly') d.setDate(d.getDate() + 7);
      else d.setMonth(d.getMonth() + 1);
    } while (d.getTime() <= now && guard++ < 1000);
    return d.getTime();
  };

  const patch = (id, data) => S.update('schedules', (l) => void Object.assign(l.find((s) => s.id === id) || {}, data));

  SC.sendNow = async (s) => {
    const vars = { nome: s.chatName, numero: s.number };
    if (s.funnelId) {
      const f = CMT.funnels.byId(s.funnelId);
      if (!f) throw new Error('Funil não encontrado');
      await CMT.sendFunnel(s.chatId, f, vars, 'scheduled');
    } else {
      await CMT.send(s.chatId, { text: U.render(s.text, vars), file: s.file }, 'scheduled');
    }
  };

  SC.process = async () => {
    if (busy || !CMT.state.ready) return;
    busy = true;
    try {
      const now = Date.now();
      const due = S.get('schedules').filter((s) => s.status === 'pending' && s.at <= now);
      for (const s of due) {
        const late = now - s.at > 30 * 60 * 1000;
        if (late && !S.get('settings').ui.sendOverdueSchedules) {
          await patch(s.id, { status: 'missed', error: 'Horário perdido: o WhatsApp Web não estava aberto.' });
          continue;
        }
        try {
          await SC.sendNow(s);
          const nx = nextAt(s.at, s.repeat);
          await patch(s.id, nx ? { at: nx, lastSentAt: now, error: '' } : { status: 'sent', sentAt: now });
          UI.toast(`Agendamento enviado para ${s.chatName}.`, 'success');
        } catch (e) {
          await patch(s.id, { status: 'failed', error: e.message });
          UI.toast(`Falha no agendamento para ${s.chatName}: ${e.message}`, 'error');
        }
      }
    } finally {
      busy = false;
    }
  };

  /** Formulário de criação/edição. */
  SC.edit = (existing, presetChat) =>
    new Promise((resolve) => {
      const st = existing
        ? JSON.parse(JSON.stringify(existing))
        : { chatId: presetChat ? presetChat.id : '', chatName: presetChat ? presetChat.name : '', number: presetChat ? presetChat.number : '', text: '', file: null, funnelId: '', at: Date.now() + 3600e3, repeat: 'none' };
      const chatLabel = h('b', null, st.chatName || 'Nenhuma conversa escolhida');
      const pick = async () => {
        const c = await UI.pickChats({ title: 'Para quem enviar?' });
        if (!c) return;
        Object.assign(st, { chatId: c.id, chatName: c.name, number: c.number });
        chatLabel.textContent = c.name;
      };
      const body = h(
        'div',
        null,
        UI.field('Conversa', UI.row(chatLabel, h('div', { class: 'grow' }), UI.btn('Escolher', pick, { small: true, icon: 'search' }))),
        UI.field('Mensagem', UI.textarea({ value: st.text, rows: 5, onInput: (e) => (st.text = e.target.value) })),
        UI.varsHint(),
        UI.attachField(st, 'file'),
        UI.field('Ou enviar um funil', UI.select(CMT.funnels.options(), st.funnelId, { onChange: (e) => (st.funnelId = e.target.value) })),
        h(
          'div',
          { class: 'grid2' },
          UI.field('Data e hora', UI.input({ type: 'datetime-local', value: U.toLocalInput(st.at), onChange: (e) => (st.at = new Date(e.target.value).getTime()) })),
          UI.field('Repetição', UI.select(REPEAT, st.repeat, { onChange: (e) => (st.repeat = e.target.value) }))
        )
      );
      UI.modal({
        title: existing ? 'Editar agendamento' : 'Novo agendamento',
        body,
        actions: [
          { label: 'Cancelar', onClick: (c) => (c(), resolve(null)) },
          {
            label: existing ? 'Salvar' : 'Agendar',
            kind: 'primary',
            icon: 'calendar',
            onClick: async (c) => {
              if (!st.chatId) return UI.toast('Escolha a conversa.', 'warn');
              if (!st.funnelId && !st.text.trim() && !st.file) return UI.toast('Escreva a mensagem, anexe um arquivo ou escolha um funil.', 'warn');
              if (!st.at || isNaN(st.at)) return UI.toast('Data inválida.', 'warn');
              if (!existing && st.at < Date.now() - 60e3) return UI.toast('Escolha uma data futura.', 'warn');
              c();
              await S.update('schedules', (l) => {
                if (existing) Object.assign(l.find((x) => x.id === existing.id) || {}, st, { status: 'pending', error: '' });
                else l.push(Object.assign({ id: U.uid(), status: 'pending', createdAt: Date.now() }, st));
              });
              UI.toast(existing ? 'Agendamento atualizado.' : `Agendado para ${U.fmtDate(st.at)}.`, 'success');
              resolve(true);
            },
          },
        ],
      });
    });

  const STATUS = { pending: ['Pendente', '#3b82f6'], sent: ['Enviado', '#10b981'], failed: ['Falhou', '#ef4444'], missed: ['Perdido', '#f59e0b'] };

  const renderItem = (s) =>
    h(
      'div',
      { class: 'item' },
      h(
        'div',
        { class: 'grow' },
        UI.row(h('span', { class: 'title' }, s.chatName), UI.badge(STATUS[s.status][0], STATUS[s.status][1]), s.repeat && s.repeat !== 'none' ? h('span', { class: 'badge gray' }, repeatLabel(s.repeat)) : null),
        h('div', { class: 'muted' }, `${s.status === 'pending' ? 'Envio em' : 'Programado para'} ${U.fmtDate(s.at)}${s.lastSentAt ? ` · último envio ${U.fmtDate(s.lastSentAt)}` : ''}`),
        h('div', { class: 'text' }, s.funnelId ? `Funil: ${(CMT.funnels.byId(s.funnelId) || {}).name || '(removido)'}` : s.text || (s.file ? `📎 ${s.file.name}` : '')),
        s.file && s.text ? h('div', { class: 'muted' }, `📎 ${s.file.name}`) : null,
        s.error ? h('div', { class: 'error', style: { fontSize: '12px' } }, s.error) : null
      ),
      h(
        'div',
        { class: 'actions' },
        UI.iconBtn('open', () => B.call('openChat', s.chatId), 'Abrir conversa'),
        UI.iconBtn('play', async () => {
          if (!(await UI.confirm(`Enviar agora para ${s.chatName}?`, 'Enviar', 'primary'))) return;
          try {
            await SC.sendNow(s);
            const nx = nextAt(s.at, s.repeat);
            await patch(s.id, nx && s.status === 'pending' ? { lastSentAt: Date.now() } : { status: 'sent', sentAt: Date.now() });
            UI.toast('Enviado.', 'success');
          } catch (e) {
            UI.toast(e.message, 'error');
          }
        }, 'Enviar agora'),
        UI.iconBtn('edit', () => SC.edit(s), 'Editar'),
        UI.iconBtn('copy', () => S.update('schedules', (l) => l.push(Object.assign(JSON.parse(JSON.stringify(s)), { id: U.uid(), status: 'pending', error: '', createdAt: Date.now() }))), 'Duplicar'),
        UI.iconBtn('trash', async () => (await UI.confirm('Excluir este agendamento?', 'Excluir')) && S.update('schedules', (l) => l.filter((x) => x.id !== s.id)), 'Excluir', 'danger')
      )
    );

  UI.register({
    id: 'schedule',
    title: 'Agendamentos',
    icon: 'calendar',
    order: 4,
    badge: () => S.get('schedules').filter((s) => s.status === 'pending').length,
    render(body, params) {
      if (params && params.create) {
        UI.params = null;
        SC.edit(null, CMT.state.activeChat);
      }
      const all = S.get('schedules');
      const pending = all.filter((s) => s.status === 'pending').sort((a, b) => a.at - b.at);
      const history = all.filter((s) => s.status !== 'pending').sort((a, b) => (b.sentAt || b.at) - (a.sentAt || a.at));
      body.append(
        UI.row(
          UI.btn('Novo agendamento', () => SC.edit(null, CMT.state.activeChat), { kind: 'primary', icon: 'plus' }),
          h('span', { class: 'muted' }, 'A aba do WhatsApp Web precisa estar aberta no horário do envio.')
        ),
        h('div', { style: { height: '12px' } }),
        h(
          'div',
          { class: 'tabs' },
          h('button', { class: `tab ${tab === 'pending' ? 'active' : ''}`, type: 'button', onClick: () => ((tab = 'pending'), UI.renderPanel()) }, `Pendentes (${pending.length})`),
          h('button', { class: `tab ${tab === 'history' ? 'active' : ''}`, type: 'button', onClick: () => ((tab = 'history'), UI.renderPanel()) }, `Histórico (${history.length})`)
        ),
        tab === 'pending'
          ? pending.length
            ? h('div', { class: 'list' }, pending.map(renderItem))
            : UI.empty('Nenhum agendamento pendente.')
          : history.length
          ? h(
              'div',
              null,
              UI.row(UI.btn('Limpar histórico', async () => (await UI.confirm('Apagar todo o histórico de agendamentos?', 'Apagar')) && S.set('schedules', pending), { small: true, icon: 'trash' })),
              h('div', { style: { height: '8px' } }),
              h('div', { class: 'list' }, history.map(renderItem))
            )
          : UI.empty('Nenhum agendamento concluído.')
      );
    },
  });

  CMT.features.schedule = {
    init() {
      S.on('schedules', () => {
        UI.refresh('schedule');
        UI.renderRail();
      });
      setInterval(SC.process, 15000);
      CMT.on('ready', () => setTimeout(SC.process, 5000));
    },
  };
})();
