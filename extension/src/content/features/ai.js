/* Assistente de IA (Claude): resumo da conversa, sugestão de resposta, reescrita e criação de textos. */
(() => {
  const CMT = window.CMT;
  const { ui: UI, util: U, store: S, bridge: B } = CMT;
  const h = UI.h;
  const AI = (CMT.ai = {});
  let tab = 'chat';
  let last = ''; // último resultado exibido
  let busy = false;
  let instruction = '';
  let freeText = '';
  let prompt = '';

  AI.hasKey = () => !!(CMT.secrets.anthropicKey || '').trim();

  AI.system = () => {
    const a = S.get('settings').ai;
    return [
      'Você é um assistente de atendimento comercial via WhatsApp, escrevendo em português do Brasil.',
      a.business ? `Sobre o negócio: ${a.business}` : '',
      `Tom de voz: ${a.tone || 'cordial e objetivo'}.`,
      'Escreva mensagens curtas e naturais, prontas para enviar no WhatsApp. Pode usar *negrito* e poucos emojis. Nunca invente preços, prazos ou dados que não estejam no contexto. Responda somente com o texto da mensagem, sem explicações ou aspas.',
    ]
      .filter(Boolean)
      .join('\n');
  };

  AI.complete = async ({ system, user, maxTokens = 2048 }) => {
    if (!AI.hasKey()) throw new Error('Configure sua chave de API em Configurações › Inteligência artificial.');
    const a = S.get('settings').ai;
    const r = await CMT.bg({ type: 'cmt:ai', model: a.model, effort: a.effort, system: system || AI.system(), messages: [{ role: 'user', content: user }], maxTokens });
    CMT.stat('ai');
    return (r.text || '').trim();
  };

  AI.context = async (chatId, n = 20) => {
    const msgs = await B.call('getMessages', chatId, n);
    return msgs
      .sort((a, b) => a.t - b.t)
      .map((m) => `${m.fromMe ? 'EU (atendente)' : m.senderName || 'CLIENTE'}: ${m.body || `[${m.type}]`}`)
      .join('\n');
  };

  AI.summarize = async (chatId) => AI.complete({ system: 'Você resume conversas de atendimento em português do Brasil, de forma objetiva, em tópicos curtos. Inclua: contexto, o que o cliente quer, pendências e próximo passo sugerido.', user: `Resuma esta conversa:\n\n${await AI.context(chatId, 40)}` });

  AI.suggest = async (chatId, extra) =>
    AI.complete({ user: `Histórico recente da conversa:\n\n${await AI.context(chatId, 20)}\n\nEscreva a próxima mensagem que EU (atendente) devo enviar.${extra ? ` Orientação: ${extra}` : ''}` });

  AI.autoReply = async (chatId, extra) =>
    AI.complete({ user: `Histórico recente da conversa:\n\n${await AI.context(chatId, 12)}\n\nResponda à última mensagem do CLIENTE como atendente. Se não souber algo, diga que vai verificar e retornar.${extra ? ` Orientação: ${extra}` : ''}`, maxTokens: 1024 });

  const MODES = {
    friendly: 'Reescreva de forma mais amigável e calorosa, mantendo o sentido.',
    formal: 'Reescreva de forma mais formal e profissional, mantendo o sentido.',
    shorter: 'Reescreva de forma mais curta e direta, mantendo as informações essenciais.',
    longer: 'Expanda o texto com mais detalhes e cordialidade, sem inventar fatos.',
    fix: 'Corrija ortografia, gramática e pontuação, sem mudar o estilo.',
    emoji: 'Adicione emojis adequados ao texto, com moderação.',
    en: 'Traduza para o inglês.',
    es: 'Traduza para o espanhol.',
  };
  AI.rewrite = (text, mode) => AI.complete({ user: `${MODES[mode]}\n\nTexto:\n${text}` });

  // ------------------------------------------------------------ painel
  const resultBox = () =>
    last
      ? h(
          'div',
          null,
          h('div', { class: 'result' }, last),
          UI.row(
            UI.btn('Inserir na conversa', () => B.call('setInputText', last).catch((e) => UI.toast(e.message, 'error')), { icon: 'message', kind: 'primary', small: true }),
            UI.btn(
              'Enviar',
              async () => {
                const c = UI.requireChat();
                if (!c) return;
                try {
                  await CMT.send(c.id, { text: last });
                  UI.toast('Enviado.', 'success');
                } catch (e) {
                  UI.toast(e.message, 'error');
                }
              },
              { icon: 'send', small: true }
            ),
            UI.btn('Copiar', () => navigator.clipboard.writeText(last).then(() => UI.toast('Copiado.', 'success')), { icon: 'copy', small: true }),
            UI.btn('Usar como texto', () => ((freeText = last), (tab = 'text'), UI.renderPanel()), { icon: 'edit', small: true })
          )
        )
      : null;

  const runAction = async (fn) => {
    if (busy) return;
    busy = true;
    UI.renderPanel();
    try {
      last = await fn();
    } catch (e) {
      UI.toast(e.message, 'error', 6000);
    } finally {
      busy = false;
      UI.renderPanel();
    }
  };

  const renderNoKey = (body) => {
    let key = '';
    body.append(
      UI.section(
        'Conecte sua chave de API da Anthropic',
        h('p', null, 'O assistente usa os modelos Claude. Crie uma chave em ', h('a', { href: 'https://console.anthropic.com/settings/keys', target: '_blank', rel: 'noopener' }, 'console.anthropic.com'), ' e cole abaixo. A chave fica salva apenas no seu navegador.'),
        UI.field('Chave de API', UI.input({ type: 'password', placeholder: 'sk-ant-…', onInput: (e) => (key = e.target.value.trim()) })),
        UI.row(
          UI.btn(
            'Salvar chave',
            async () => {
              if (!key.startsWith('sk-ant-')) return UI.toast('A chave deve começar com sk-ant-', 'warn');
              await CMT.saveSecrets({ anthropicKey: key });
              UI.toast('Chave salva.', 'success');
              UI.renderPanel();
            },
            { kind: 'primary', icon: 'check' }
          ),
          UI.btn('Mais configurações', () => UI.open('settings', { section: 'ai' }), { icon: 'settings' })
        )
      )
    );
  };

  UI.register({
    id: 'ai',
    title: 'Assistente de IA',
    icon: 'sparkles',
    order: 8,
    render(body) {
      if (!AI.hasKey()) return renderNoKey(body);
      const chat = CMT.state.activeChat;
      body.append(
        h(
          'div',
          { class: 'tabs' },
          ['chat', 'Conversa atual'],
          ['text', 'Melhorar texto'],
          ['create', 'Criar mensagem']
        )
      );
      // (a linha acima só cria o container; os botões vêm abaixo para permitir o loop)
      const tabsEl = body.lastChild;
      tabsEl.textContent = '';
      [
        ['chat', 'Conversa atual'],
        ['text', 'Melhorar texto'],
        ['create', 'Criar mensagem'],
      ].forEach(([id, label]) => tabsEl.append(h('button', { class: `tab ${tab === id ? 'active' : ''}`, type: 'button', onClick: () => ((tab = id), UI.renderPanel()) }, label)));

      if (busy) body.append(h('p', { class: 'muted' }, '✨ Gerando com a IA…'));

      if (tab === 'chat') {
        body.append(
          UI.section(
            chat ? `Conversa: ${chat.name}` : 'Nenhuma conversa aberta',
            chat
              ? h(
                  'div',
                  null,
                  UI.row(
                    UI.btn('Resumir conversa', () => runAction(() => AI.summarize(chat.id)), { icon: 'note', disabled: busy }),
                    UI.btn('Sugerir resposta', () => runAction(() => AI.suggest(chat.id, instruction)), { icon: 'sparkles', kind: 'primary', disabled: busy })
                  ),
                  UI.field('Orientação para a resposta (opcional)', UI.input({ value: instruction, placeholder: 'Ex.: ofereça desconto de 10% e pergunte o melhor horário', onInput: (e) => (instruction = e.target.value) }))
                )
              : h('p', { class: 'muted' }, 'Abra uma conversa no WhatsApp para resumir ou sugerir respostas.')
          )
        );
      } else if (tab === 'text') {
        body.append(
          UI.section(
            'Texto',
            UI.textarea({ value: freeText, rows: 6, placeholder: 'Cole ou escreva o texto a melhorar…', onInput: (e) => (freeText = e.target.value) }),
            h('div', { style: { height: '8px' } }),
            UI.row(
              [
                ['friendly', 'Mais amigável'],
                ['formal', 'Mais formal'],
                ['shorter', 'Mais curto'],
                ['longer', 'Mais completo'],
                ['fix', 'Corrigir'],
                ['emoji', 'Emojis'],
                ['en', '→ Inglês'],
                ['es', '→ Espanhol'],
              ].map(([m, l]) =>
                h('button', { class: 'chip', type: 'button', disabled: busy, onClick: () => (freeText.trim() ? runAction(() => AI.rewrite(freeText, m)) : UI.toast('Escreva um texto primeiro.', 'warn')) }, l)
              )
            )
          )
        );
      } else {
        body.append(
          UI.section(
            'O que você precisa?',
            UI.textarea({ value: prompt, rows: 4, placeholder: 'Ex.: mensagem de divulgação de um curso de inglês com 20% de desconto até sexta, para enviar a leads antigos', onInput: (e) => (prompt = e.target.value) }),
            h('div', { style: { height: '8px' } }),
            UI.row(
              UI.btn('Gerar mensagem', () => (prompt.trim() ? runAction(() => AI.complete({ user: `Crie uma mensagem de WhatsApp. Pedido: ${prompt}` })) : UI.toast('Descreva o que precisa.', 'warn')), { icon: 'sparkles', kind: 'primary', disabled: busy }),
              UI.btn('Gerar 3 variações', () => (prompt.trim() ? runAction(() => AI.complete({ user: `Crie 3 variações diferentes de uma mensagem de WhatsApp, numeradas. Pedido: ${prompt}` })) : UI.toast('Descreva o que precisa.', 'warn')), { icon: 'copy', disabled: busy })
            ),
            h('p', { class: 'hint' }, 'Dica: descreva o negócio e o tom em Configurações › IA para resultados mais alinhados.')
          )
        );
      }
      const rb = resultBox();
      if (rb) body.append(UI.section('Resultado', rb));
    },
  });

  CMT.features.ai = {
    init() {
      chrome.storage.onChanged.addListener((ch, area) => area === 'local' && ch.secrets && UI.refresh('ai'));
    },
  };
})();
