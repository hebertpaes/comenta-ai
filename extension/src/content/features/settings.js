/* Configurações: privacidade, transmissão, IA, webhook, backup e sobre. */
(() => {
  const CMT = window.CMT;
  const { ui: UI, util: U, store: S } = CMT;
  const h = UI.h;
  let section = 'privacy';

  const SECTIONS = [
    ['privacy', 'Privacidade'],
    ['broadcast', 'Transmissão'],
    ['ai', 'Inteligência artificial'],
    ['webhook', 'Webhook'],
    ['backup', 'Backup'],
    ['about', 'Sobre'],
  ];

  const upd = (fn) => S.update('settings', (s) => void fn(s));
  const num = (obj, key, props = {}) =>
    UI.input(Object.assign({ type: 'number', value: obj[key], onChange: (e) => upd((s) => (deref(s, obj)[key] = Number(e.target.value))) }, props));
  // Localiza, dentro da cópia de settings, o sub-objeto equivalente ao passado.
  const deref = (s, obj) => {
    for (const k of Object.keys(s)) if (JSON.stringify(Object.keys(s[k])) === JSON.stringify(Object.keys(obj))) return s[k];
    return s;
  };

  const renderPrivacy = (body) => {
    const p = S.get('settings').privacy;
    body.append(
      UI.section(
        'Modo privacidade',
        h('p', { class: 'muted' }, 'Desfoque partes da tela para atender em locais públicos ou compartilhar a tela. Atalho: Alt+Shift+P.'),
        UI.toggle(p.messages, (v) => upd((s) => (s.privacy.messages = v)), 'Desfocar mensagens da conversa aberta'),
        h('div', { style: { height: '8px' } }),
        UI.toggle(p.chatList, (v) => upd((s) => (s.privacy.chatList = v)), 'Desfocar nomes e prévias na lista de conversas'),
        h('div', { style: { height: '8px' } }),
        UI.toggle(p.photos, (v) => upd((s) => (s.privacy.photos = v)), 'Desfocar fotos de perfil e imagens'),
        h('div', { style: { height: '8px' } }),
        UI.toggle(p.revealOnHover, (v) => upd((s) => (s.privacy.revealOnHover = v)), 'Revelar ao passar o mouse')
      )
    );
  };

  const renderBroadcast = (body) => {
    const b = S.get('settings').broadcast;
    body.append(
      UI.section(
        'Intervalos e limites da transmissão',
        h('p', { class: 'muted' }, 'Intervalos maiores e aleatórios imitam o uso humano e reduzem o risco de bloqueio.'),
        h(
          'div',
          { class: 'grid2' },
          UI.field('Intervalo mínimo (s)', num(b, 'minDelay', { min: 1 })),
          UI.field('Intervalo máximo (s)', num(b, 'maxDelay', { min: 1 })),
          UI.field('Mensagens por lote', num(b, 'batchSize', { min: 0 }), '0 desativa a pausa por lote'),
          UI.field('Pausa entre lotes (s)', num(b, 'batchPause', { min: 0 })),
          UI.field('Limite diário de mensagens', num(b, 'dailyLimit', { min: 0 }), '0 = sem limite')
        ),
        UI.toggle(b.typing, (v) => upd((s) => (s.broadcast.typing = v)), 'Simular "digitando…" antes de cada envio')
      )
    );
  };

  const renderAI = (body) => {
    const a = S.get('settings').ai;
    let key = CMT.secrets.anthropicKey || '';
    body.append(
      UI.section(
        'Chave de API (Anthropic)',
        h('p', { class: 'muted' }, 'Crie uma chave em ', h('a', { href: 'https://console.anthropic.com/settings/keys', target: '_blank', rel: 'noopener' }, 'console.anthropic.com'), '. Ela fica salva somente neste navegador e é usada direto do seu computador.'),
        UI.row(
          UI.input({ type: 'password', value: key, placeholder: 'sk-ant-…', class: 'inp grow', onInput: (e) => (key = e.target.value.trim()) }),
          UI.btn(
            'Salvar',
            async () => {
              if (key && !key.startsWith('sk-ant-')) return UI.toast('A chave deve começar com sk-ant-', 'warn');
              await CMT.saveSecrets({ anthropicKey: key });
              UI.toast(key ? 'Chave salva.' : 'Chave removida.', 'success');
            },
            { kind: 'primary', icon: 'check' }
          ),
          UI.btn(
            'Testar',
            async () => {
              try {
                const r = await CMT.ai.complete({ system: 'Responda apenas "ok".', user: 'teste', maxTokens: 64 });
                UI.toast(`Conexão OK: ${r.slice(0, 40)}`, 'success');
              } catch (e) {
                UI.toast(e.message, 'error', 6000);
              }
            },
            { icon: 'sparkles' }
          )
        )
      ),
      UI.section(
        'Modelo e estilo',
        h(
          'div',
          { class: 'grid2' },
          UI.field(
            'Modelo',
            UI.select(
              [
                ['claude-opus-5-5', 'Claude Opus 5.5 (recomendado)'],
                ['claude-sonnet-5-5', 'Claude Sonnet 5.5 (rápido)'],
                ['claude-haiku-5-5', 'Claude Haiku 5.5 (econômico)'],
              ],
              a.model,
              { onChange: (e) => upd((s) => (s.ai.model = e.target.value)) }
            )
          ),
          UI.field(
            'Esforço de raciocínio',
            UI.select(
              [
                ['low', 'Baixo (respostas rápidas)'],
                ['medium', 'Médio'],
                ['high', 'Alto'],
              ],
              a.effort,
              { onChange: (e) => upd((s) => (s.ai.effort = e.target.value)) }
            )
          )
        ),
        UI.field('Tom de voz', UI.input({ value: a.tone, placeholder: 'cordial e objetivo', onChange: (e) => upd((s) => (s.ai.tone = e.target.value)) })),
        UI.field(
          'Sobre o seu negócio',
          UI.textarea({ value: a.business, rows: 6, placeholder: 'Nome, o que vende, horários, formas de pagamento, políticas, diferenciais, perguntas frequentes…', onChange: (e) => upd((s) => (s.ai.business = e.target.value)) }),
          'Esse texto é enviado como contexto em todas as gerações (sugestões, chatbot com IA, etc.).'
        )
      )
    );
  };

  const renderWebhook = (body) => {
    const w = S.get('settings').webhook;
    let url = CMT.secrets.webhookUrl || '';
    body.append(
      UI.section(
        'Webhook (integrações)',
        h('p', { class: 'muted' }, 'Envia um POST JSON para a URL abaixo quando ocorrem eventos. Útil para n8n, Make, Zapier ou seu próprio sistema.'),
        UI.row(
          UI.input({ value: url, placeholder: 'https://seu-servidor.com/webhook', class: 'inp grow', onInput: (e) => (url = e.target.value.trim()) }),
          UI.btn('Salvar', async () => (await CMT.saveSecrets({ webhookUrl: url }), UI.toast('Webhook salvo.', 'success')), { kind: 'primary', icon: 'check' }),
          UI.btn('Testar', () => (CMT.secrets.webhookUrl ? (CMT.webhook('test', { hello: 'world' }), UI.toast('Evento de teste enviado.', 'info')) : UI.toast('Salve a URL primeiro.', 'warn')), { icon: 'link' })
        ),
        h('div', { style: { height: '10px' } }),
        UI.toggle(w.onMessage, (v) => upd((s) => (s.webhook.onMessage = v)), 'Enviar evento a cada mensagem recebida (new_message)'),
        h('div', { style: { height: '8px' } }),
        UI.toggle(w.onSent, (v) => upd((s) => (s.webhook.onSent = v)), 'Enviar evento a cada mensagem enviada pela extensão (message_sent)'),
        h('p', { class: 'hint' }, 'Eventos sempre enviados: broadcast_finished. Corpo: { event, data, at }.')
      )
    );
  };

  const renderBackup = (body) => {
    body.append(
      UI.section(
        'Backup e restauração',
        h('p', { class: 'muted' }, 'Exporta configurações, respostas rápidas, funis, CRM, agendamentos, abas, notas e relatórios (sem a chave de API).'),
        UI.row(
          UI.btn(
            'Exportar backup (JSON)',
            () => {
              const data = {};
              for (const k of Object.keys(CMT.DEFAULTS)) data[k] = S.get(k);
              U.download(`comenta-ai-backup-${U.today()}.json`, JSON.stringify({ app: 'comenta-ai', version: chrome.runtime.getManifest().version, exportedAt: Date.now(), data }, null, 2), 'application/json');
            },
            { icon: 'download', kind: 'primary' }
          ),
          UI.btn(
            'Importar backup',
            async () => {
              const f = await U.pickFile('.json');
              if (!f) return;
              try {
                const json = JSON.parse(await U.readFile(f, 'text'));
                const data = json.data || json;
                const keys = Object.keys(data).filter((k) => k in CMT.DEFAULTS);
                if (!keys.length) throw new Error('Arquivo não reconhecido');
                if (!(await UI.confirm(`Importar ${keys.length} seções (${keys.join(', ')})? Os dados atuais dessas seções serão substituídos.`, 'Importar', 'primary'))) return;
                for (const k of keys) await S.set(k, data[k]);
                await S.load();
                UI.toast('Backup importado.', 'success');
                UI.renderPanel();
              } catch (e) {
                UI.toast(`Erro: ${e.message}`, 'error');
              }
            },
            { icon: 'upload' }
          )
        )
      ),
      UI.section(
        'Zerar',
        UI.row(
          UI.btn('Zerar estatísticas', async () => (await UI.confirm('Zerar todas as estatísticas?', 'Zerar')) && S.set('stats', JSON.parse(JSON.stringify(CMT.DEFAULTS.stats))), { icon: 'refresh', small: true }),
          UI.btn(
            'Apagar todos os dados',
            async () => {
              if (!(await UI.confirm('Apagar TODOS os dados da extensão (CRM, funis, agendamentos, etc.)? Esta ação não pode ser desfeita.', 'Apagar tudo'))) return;
              for (const k of Object.keys(CMT.DEFAULTS)) await S.set(k, JSON.parse(JSON.stringify(CMT.DEFAULTS[k])));
              UI.toast('Dados apagados.', 'success');
            },
            { icon: 'trash', kind: 'danger', small: true }
          )
        )
      )
    );
  };

  const renderAbout = (body) => {
    const m = chrome.runtime.getManifest();
    body.append(
      UI.section(
        `${m.name} v${m.version}`,
        h('p', null, 'Superpoderes para o WhatsApp Web: CRM Kanban, transmissão em massa, agendamentos, respostas rápidas, funis, chatbot, assistente de IA, lembretes, abas, extração de grupos e modo privacidade.'),
        h('p', { class: 'muted' }, 'Todos os dados ficam no seu navegador. Nenhuma mensagem passa por servidores da extensão. O assistente de IA envia apenas o texto necessário diretamente para a API da Anthropic usando a sua chave.'),
        h('p', { class: 'muted' }, 'Integração com o WhatsApp Web via ', h('a', { href: 'https://github.com/wppconnect-team/wa-js', target: '_blank', rel: 'noopener' }, 'WPPConnect/WA-JS'), ' (Apache-2.0). Este projeto não é afiliado ao WhatsApp/Meta. Use com responsabilidade: envios em massa não solicitados violam os termos do WhatsApp e podem causar bloqueio da conta.')
      )
    );
  };

  UI.register({
    id: 'settings',
    title: 'Configurações',
    icon: 'settings',
    order: 90,
    bottom: true,
    render(body, params) {
      if (params && params.section) {
        section = params.section;
        UI.params = null;
      }
      body.append(h('div', { class: 'tabs' }, SECTIONS.map(([id, l]) => h('button', { class: `tab ${section === id ? 'active' : ''}`, type: 'button', onClick: () => ((section = id), UI.renderPanel()) }, l))));
      ({ privacy: renderPrivacy, broadcast: renderBroadcast, ai: renderAI, webhook: renderWebhook, backup: renderBackup, about: renderAbout })[section](body);
    },
  });

  CMT.features.settings = {
    init() {
      S.on('settings', () => UI.refresh('settings'));
    },
  };
})();
