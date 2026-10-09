/* Funis: sequências de mensagens (texto, arquivo, áudio, espera) reutilizáveis. */
(() => {
  const CMT = window.CMT;
  const { ui: UI, util: U, store: S } = CMT;
  const h = UI.h;
  let editing = null; // cópia do funil em edição

  const F = (CMT.funnels = {});
  F.all = () => S.get('funnels');
  F.byId = (id) => F.all().find((f) => f.id === id);
  F.options = (empty = '— sem funil —') => [['', empty]].concat(F.all().map((f) => [f.id, f.name]));

  const describe = (f) =>
    (f.steps || [])
      .map((s) => (s.type === 'delay' ? `⏱ ${s.seconds}s` : s.type === 'file' ? `📎 ${s.file ? s.file.name : 'arquivo'}` : `💬 ${(s.text || '').slice(0, 30)}`))
      .join(' → ');

  /** Envio rápido (texto/arquivo ou funil) para uma lista de destinatários, usado por CRM, abas e grupos. */
  CMT.quickSend = (targets, { title = 'Enviar mensagem' } = {}) =>
    new Promise((resolve) => {
      const st = { text: '', file: null, funnelId: '' };
      const body = h(
        'div',
        null,
        h('p', { class: 'muted' }, `Para ${targets.length} destinatário(s). ${targets.length > 1 ? 'Será aplicado um intervalo aleatório entre os envios.' : ''}`),
        UI.field('Mensagem', UI.textarea({ placeholder: '{saudacao}, {primeiro_nome}!', onInput: (e) => (st.text = e.target.value) }), null),
        UI.varsHint(),
        UI.attachField(st, 'file'),
        UI.field('Ou enviar um funil', UI.select(F.options(), '', { onChange: (e) => (st.funnelId = e.target.value) }))
      );
      UI.modal({
        title,
        body,
        actions: [
          { label: 'Cancelar', onClick: (c) => (c(), resolve(null)) },
          {
            label: 'Enviar',
            kind: 'primary',
            icon: 'send',
            onClick: async (c) => {
              const funnel = st.funnelId ? F.byId(st.funnelId) : null;
              if (!funnel && !st.text.trim() && !st.file) return UI.toast('Escreva uma mensagem, anexe um arquivo ou escolha um funil.', 'warn');
              c();
              const cfg = S.get('settings').broadcast;
              let ok = 0;
              let fail = 0;
              for (let i = 0; i < targets.length; i++) {
                const t = targets[i];
                const vars = { nome: t.name || '', numero: t.number || '' };
                try {
                  if (funnel) await CMT.sendFunnel(t.id || t.number, funnel, vars);
                  else await CMT.send(t.id || t.number, { text: U.render(st.text, vars), file: st.file, typing: true });
                  ok++;
                } catch (e) {
                  fail++;
                  console.warn('[Comenta AI] quickSend', t, e);
                }
                if (i < targets.length - 1) await U.sleep(U.rand(Math.min(cfg.minDelay, 5), Math.min(cfg.maxDelay, 10)) * 1000);
              }
              UI.toast(`Envio concluído: ${ok} ok, ${fail} falha(s).`, fail ? 'warn' : 'success');
              resolve({ ok, fail });
            },
          },
        ],
      });
    });

  // ------------------------------------------------------------ editor
  const stepEditor = (step, i, redraw) => {
    const content = [];
    if (step.type === 'text') {
      content.push(UI.textarea({ value: step.text || '', rows: 3, placeholder: 'Texto da mensagem…', onInput: (e) => (step.text = e.target.value) }));
    } else if (step.type === 'file') {
      content.push(
        UI.attachField(step, 'file', redraw),
        UI.input({ value: step.text || '', placeholder: 'Legenda (opcional)', onInput: (e) => (step.text = e.target.value) }),
        UI.toggle(!!step.asAudio, (v) => (step.asAudio = v), 'Enviar como áudio gravado (PTT)')
      );
    } else {
      content.push(
        UI.row(
          h('span', null, 'Aguardar'),
          UI.input({ type: 'number', min: 1, value: step.seconds || 5, style: { width: '90px' }, onInput: (e) => (step.seconds = Number(e.target.value)) }),
          h('span', null, 'segundos')
        )
      );
    }
    return h(
      'div',
      { class: 'step' },
      h('div', { class: 'step-n' }, String(i + 1)),
      h(
        'div',
        { class: 'grow' },
        UI.row(
          UI.select(
            [
              ['text', 'Mensagem de texto'],
              ['file', 'Arquivo / mídia'],
              ['delay', 'Espera'],
            ],
            step.type,
            {
              style: { width: 'auto' },
              onChange: (e) => {
                step.type = e.target.value;
                redraw();
              },
            }
          ),
          h('div', { class: 'grow' }),
          UI.iconBtn('up', () => {
            if (i === 0) return;
            [editing.steps[i - 1], editing.steps[i]] = [editing.steps[i], editing.steps[i - 1]];
            redraw();
          }, 'Mover para cima'),
          UI.iconBtn('down', () => {
            if (i === editing.steps.length - 1) return;
            [editing.steps[i + 1], editing.steps[i]] = [editing.steps[i], editing.steps[i + 1]];
            redraw();
          }, 'Mover para baixo'),
          UI.iconBtn('trash', () => {
            editing.steps.splice(i, 1);
            redraw();
          }, 'Remover passo', 'danger')
        ),
        ...content
      )
    );
  };

  const renderEditor = (body) => {
    const stepsEl = h('div', null);
    const redraw = () => {
      stepsEl.textContent = '';
      editing.steps.forEach((s, i) => stepsEl.append(stepEditor(s, i, redraw)));
      if (!editing.steps.length) stepsEl.append(h('p', { class: 'muted' }, 'Adicione o primeiro passo abaixo.'));
    };
    redraw();
    body.append(
      UI.section(
        editing.id ? 'Editar funil' : 'Novo funil',
        UI.field('Nome do funil', UI.input({ value: editing.name, placeholder: 'Ex.: Boas-vindas, Follow-up, Proposta…', onInput: (e) => (editing.name = e.target.value) })),
        UI.varsHint(),
        h('div', { style: { height: '10px' } }),
        stepsEl,
        UI.row(
          UI.btn('Texto', () => (editing.steps.push({ type: 'text', text: '' }), redraw()), { icon: 'plus', small: true }),
          UI.btn('Arquivo', () => (editing.steps.push({ type: 'file', file: null, text: '' }), redraw()), { icon: 'clip', small: true }),
          UI.btn('Espera', () => (editing.steps.push({ type: 'delay', seconds: 5 }), redraw()), { icon: 'clock', small: true })
        ),
        h('div', { style: { height: '14px' } }),
        UI.row(
          UI.btn(
            'Salvar funil',
            async () => {
              if (!editing.name.trim()) return UI.toast('Dê um nome ao funil.', 'warn');
              if (!editing.steps.length) return UI.toast('Adicione pelo menos um passo.', 'warn');
              const f = JSON.parse(JSON.stringify(editing));
              if (!f.id) f.id = U.uid();
              await S.update('funnels', (l) => {
                const i = l.findIndex((x) => x.id === f.id);
                i >= 0 ? (l[i] = f) : l.push(f);
              });
              editing = null;
              UI.toast('Funil salvo.', 'success');
              UI.renderPanel();
            },
            { kind: 'primary', icon: 'check' }
          ),
          UI.btn('Cancelar', () => {
            editing = null;
            UI.renderPanel();
          })
        )
      )
    );
  };

  const renderList = (body) => {
    const list = F.all();
    body.append(
      UI.row(
        h('p', { class: 'muted grow' }, 'Funis são sequências de mensagens enviadas em ordem, com pausas. Use em transmissões, agendamentos, chatbot e CRM.'),
        UI.btn(
          'Novo funil',
          () => {
            editing = { id: '', name: '', steps: [{ type: 'text', text: '' }] };
            UI.renderPanel();
          },
          { kind: 'primary', icon: 'plus' }
        )
      ),
      h('div', { style: { height: '12px' } }),
      list.length
        ? h(
            'div',
            { class: 'list' },
            list.map((f) =>
              h(
                'div',
                { class: 'item' },
                h('div', { class: 'grow' }, h('div', { class: 'title' }, f.name), h('div', { class: 'text' }, `${f.steps.length} passo(s): ${describe(f)}`)),
                h(
                  'div',
                  { class: 'actions' },
                  UI.iconBtn('play', async () => {
                    const chat = UI.requireChat();
                    if (!chat) return;
                    if (!(await UI.confirm(`Enviar o funil "${f.name}" para ${chat.name}?`, 'Enviar', 'primary'))) return;
                    try {
                      await CMT.sendFunnel(chat.id, f, { nome: chat.name, numero: chat.number });
                      UI.toast('Funil enviado.', 'success');
                    } catch (e) {
                      UI.toast(e.message, 'error');
                    }
                  }, 'Enviar para a conversa atual'),
                  UI.iconBtn('users', async () => {
                    const chats = await UI.pickChats({ multi: true, title: 'Enviar funil para…' });
                    if (!chats || !chats.length) return;
                    let ok = 0;
                    for (const c of chats) {
                      try {
                        await CMT.sendFunnel(c.id, f, { nome: c.name, numero: c.number });
                        ok++;
                      } catch (e) {}
                      await U.sleep(U.rand(3, 8) * 1000);
                    }
                    UI.toast(`Funil enviado para ${ok}/${chats.length} conversas.`, 'success');
                  }, 'Enviar para várias conversas'),
                  UI.iconBtn('copy', () => S.update('funnels', (l) => l.push(Object.assign(JSON.parse(JSON.stringify(f)), { id: U.uid(), name: `${f.name} (cópia)` }))), 'Duplicar'),
                  UI.iconBtn('edit', () => {
                    editing = JSON.parse(JSON.stringify(f));
                    UI.renderPanel();
                  }, 'Editar'),
                  UI.iconBtn('trash', async () => (await UI.confirm(`Excluir o funil "${f.name}"?`, 'Excluir')) && S.update('funnels', (l) => l.filter((x) => x.id !== f.id)), 'Excluir', 'danger')
                )
              )
            )
          )
        : UI.empty('Nenhum funil criado ainda.')
    );
  };

  UI.register({
    id: 'funnels',
    title: 'Funis de mensagens',
    icon: 'funnel',
    order: 6,
    render(body) {
      editing ? renderEditor(body) : renderList(body);
    },
  });

  CMT.features.funnels = {
    init() {
      S.on('funnels', () => !editing && UI.refresh('funnels'));
    },
  };
})();
