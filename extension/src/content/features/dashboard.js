/* Painel inicial: estatísticas, gráfico dos últimos 7 dias e atalhos. */
(() => {
  const CMT = window.CMT;
  const { ui: UI, util: U, store: S, bridge: B } = CMT;
  const h = UI.h;

  const stat = (n, label) => h('div', { class: 'stat' }, h('b', null, String(n ?? 0)), h('span', null, label));

  UI.register({
    id: 'dashboard',
    title: 'Painel',
    icon: 'dashboard',
    order: 1,
    render(body) {
      const st = S.get('stats');
      const chats = CMT.state.chats;
      const unread = chats.reduce((a, c) => a + (c.unread || 0), 0);
      const pending = S.get('schedules').filter((s) => s.status === 'pending').length;
      const cards = Object.keys(S.get('kanban').cards).length;
      const status = CMT.state.status;

      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push({ label: `${U.pad(d.getDate())}/${U.pad(d.getMonth() + 1)}`, n: st.byDay[U.dayKey(d)] || 0 });
      }
      const max = Math.max(1, ...days.map((d) => d.n));

      const unreadChats = chats
        .filter((c) => c.unread > 0)
        .sort((a, b) => (b.t || 0) - (a.t || 0))
        .slice(0, 8);

      body.append(
        UI.section(
          null,
          UI.row(
            h('div', { class: `rail-status ${CMT.state.ready ? 'on' : 'off'}`, style: { marginTop: 0 } }),
            h(
              'div',
              { class: 'grow' },
              h('b', null, CMT.state.ready ? 'Conectado ao WhatsApp Web' : 'Aguardando o WhatsApp carregar...'),
              h('div', { class: 'muted' }, status && status.me ? `Sua conta: +${status.me.split('@')[0]}` : 'Faça login no WhatsApp Web para ativar os recursos.')
            ),
            UI.btn(
              'Atualizar',
              async () => {
                await CMT.refreshChats();
                UI.refresh();
              },
              { icon: 'refresh', small: true }
            )
          )
        ),
        h(
          'div',
          { class: 'stats' },
          stat(st.sent, 'Mensagens enviadas'),
          stat(st.broadcast, 'Enviadas em transmissão'),
          stat(st.auto, 'Respostas automáticas'),
          stat(st.scheduled, 'Agendamentos enviados'),
          stat(st.ai, 'Usos da IA'),
          stat(unread, 'Mensagens não lidas'),
          stat(chats.length, 'Conversas'),
          stat(chats.filter((c) => c.isGroup).length, 'Grupos'),
          stat(pending, 'Agendamentos pendentes'),
          stat(cards, 'Cards no CRM')
        ),
        UI.section(
          'Envios nos últimos 7 dias',
          h(
            'div',
            { class: 'bars' },
            days.map((d) => h('div', { class: 'bar', title: `${d.n} mensagens` }, h('small', null, String(d.n)), h('div', { style: { height: `${Math.max(2, (d.n / max) * 80)}%` } }), h('span', null, d.label)))
          )
        ),
        UI.section(
          'Ações rápidas',
          UI.row(
            UI.btn('Nova transmissão', () => UI.open('broadcast'), { icon: 'send', kind: 'primary' }),
            UI.btn('Agendar mensagem', () => UI.open('schedule', { create: true }), { icon: 'calendar' }),
            UI.btn('Abrir CRM', () => UI.open('kanban'), { icon: 'kanban' }),
            UI.btn('Assistente IA', () => UI.open('ai'), { icon: 'sparkles' }),
            UI.btn('Chatbot', () => UI.open('chatbot'), { icon: 'bot' })
          )
        ),
        UI.section(
          'Conversas não lidas',
          unreadChats.length
            ? h(
                'div',
                { class: 'list' },
                unreadChats.map((c) =>
                  h(
                    'div',
                    { class: 'item', style: { cursor: 'pointer', alignItems: 'center' }, onClick: () => B.call('openChat', c.id) },
                    h('span', { class: 'avatar' }, (c.name || '?')[0].toUpperCase()),
                    h('div', { class: 'grow' }, h('div', { class: 'title' }, c.name), h('div', { class: 'text' }, c.last ? c.last.body : '')),
                    UI.badge(String(c.unread)),
                    h('small', { class: 'muted' }, U.fmtRelative(c.t))
                  )
                )
              )
            : h('p', { class: 'muted' }, 'Nenhuma mensagem não lida. 🎉')
        )
      );
    },
  });

  CMT.features.dashboard = {
    init() {
      S.on('stats', () => UI.refresh('dashboard'));
    },
  };
})();
