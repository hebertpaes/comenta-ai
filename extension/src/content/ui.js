/*
 * Interface: barra lateral (rail), gaveta de painéis, modais, toasts e componentes.
 * Tudo vive dentro de um Shadow DOM para não colidir com o CSS do WhatsApp.
 * Não usamos innerHTML (o WhatsApp Web aplica Trusted Types).
 */
(() => {
  const CMT = window.CMT;
  const U = CMT.util;
  const UI = (CMT.ui = { panels: [], current: null, params: null });

  // ---------------------------------------------------------------- DOM helper
  const h = (UI.h = (tag, props, ...children) => {
    const el = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v === undefined || v === null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'style') Object.assign(el.style, v);
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (['value', 'checked', 'disabled', 'selected', 'multiple', 'readOnly', 'draggable'].includes(k)) el[k] = v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const c of children.flat(Infinity)) {
      if (c === null || c === undefined || c === false) continue;
      el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  });

  // ---------------------------------------------------------------- ícones (traços no estilo Lucide, ISC)
  // Formato: elementos separados por "|"; p:d  c:cx cy r  r:x y w h rx  g:points (polígono)
  const ICONS = {
    logo: 'p:M7.9 20A9 9 0 1 0 4 16.1L2 22Z|p:M12 7.5l1.2 2.9 3 .3-2.3 2 .7 3-2.6-1.6-2.6 1.6.7-3-2.3-2 3-.3z',
    dashboard: 'r:3 3 7 9 1|r:14 3 7 5 1|r:14 12 7 9 1|r:3 16 7 5 1',
    kanban: 'r:3 3 18 18 2|p:M8 7v7|p:M12 7v4|p:M16 7v9',
    send: 'p:m22 2-7 20-4-9-9-4Z|p:M22 2 11 13',
    calendar: 'r:3 4 18 18 2|p:M16 2v4M8 2v4M3 10h18|p:M12 14v3l2 1',
    zap: 'p:M13 2 3 14h9l-1 8 10-12h-9l1-8z',
    funnel: 'p:M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
    bot: 'r:3 11 18 10 2|c:12 5 2|p:M12 7v4|p:M8 16h.01M16 16h.01',
    sparkles: 'p:M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z|p:M19 3v4M17 5h4',
    bell: 'p:M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9|p:M10.3 21a1.94 1.94 0 0 0 3.4 0',
    tabs: 'p:m12 2 10 5-10 5L2 7z|p:m2 17 10 5 10-5|p:m2 12 10 5 10-5',
    users: 'p:M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2|c:9 7 4|p:M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    eye: 'p:M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z|c:12 12 3',
    eyeOff: 'p:M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z|c:12 12 3|p:M3 3l18 18',
    settings: 'p:M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
    x: 'p:M18 6 6 18M6 6l12 12',
    plus: 'p:M12 5v14M5 12h14',
    trash: 'p:M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
    edit: 'p:M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z',
    play: 'g:6 3 20 12 6 21 6 3',
    pause: 'r:6 4 4 16 1|r:14 4 4 16 1',
    stop: 'r:5 5 14 14 1',
    copy: 'r:9 9 13 13 2|p:M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
    download: 'p:M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
    upload: 'p:M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
    message: 'p:M7.9 20A9 9 0 1 0 4 16.1L2 22Z',
    clock: 'c:12 12 10|p:M12 6v6l4 2',
    clip: 'p:m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48',
    note: 'p:M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z|p:M15 3v6h6',
    link: 'p:M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71|p:M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
    check: 'p:M20 6 9 17l-5-5',
    up: 'p:m18 15-6-6-6 6',
    down: 'p:m6 9 6 6 6-6',
    open: 'p:M15 3h6v6|p:M10 14 21 3|p:M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
    refresh: 'p:M21 12a9 9 0 1 1-3-6.7L21 8|p:M21 3v5h-5',
    search: 'c:11 11 8|p:m21 21-4.3-4.3',
  };
  const SVG = 'http://www.w3.org/2000/svg';
  UI.icon = (name, size = 20) => {
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.classList.add('ico');
    for (const part of (ICONS[name] || ICONS.message).split('|')) {
      const [t, spec] = [part[0], part.slice(2)];
      let el;
      if (t === 'p') {
        el = document.createElementNS(SVG, 'path');
        el.setAttribute('d', spec);
      } else if (t === 'c') {
        const [cx, cy, r] = spec.split(' ');
        el = document.createElementNS(SVG, 'circle');
        el.setAttribute('cx', cx);
        el.setAttribute('cy', cy);
        el.setAttribute('r', r);
      } else if (t === 'r') {
        const [x, y, w, hh, rx] = spec.split(' ');
        el = document.createElementNS(SVG, 'rect');
        Object.entries({ x, y, width: w, height: hh, rx: rx || 0 }).forEach(([k, v]) => el.setAttribute(k, v));
      } else if (t === 'g') {
        el = document.createElementNS(SVG, 'polygon');
        el.setAttribute('points', spec);
      }
      if (el) svg.appendChild(el);
    }
    return svg;
  };

  // ---------------------------------------------------------------- componentes simples
  UI.btn = (label, onClick, opts = {}) =>
    h(
      'button',
      { class: `btn ${opts.kind || ''} ${opts.small ? 'sm' : ''}`.trim(), onClick, title: opts.title, disabled: opts.disabled, type: 'button' },
      opts.icon ? UI.icon(opts.icon, opts.small ? 14 : 16) : null,
      label ? h('span', null, label) : null
    );
  UI.iconBtn = (icon, onClick, title, kind = '') => h('button', { class: `icon-btn ${kind}`, onClick, title, type: 'button' }, UI.icon(icon, 16));
  UI.field = (label, input, hint) => h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), input, hint ? h('small', { class: 'hint' }, hint) : null);
  UI.input = (props = {}) => h('input', Object.assign({ class: 'inp', type: 'text' }, props));
  UI.textarea = (props = {}) => h('textarea', Object.assign({ class: 'inp', rows: 4 }, props));
  UI.select = (options, value, props = {}) =>
    h(
      'select',
      Object.assign({ class: 'inp' }, props),
      options.map((o) => {
        const [v, l] = Array.isArray(o) ? o : [o.value ?? o, o.label ?? o];
        return h('option', { value: v, selected: String(v) === String(value) }, l);
      })
    );
  UI.toggle = (checked, onChange, label) =>
    h(
      'label',
      { class: 'toggle' },
      h('input', { type: 'checkbox', checked, onChange: (e) => onChange(e.target.checked) }),
      h('span', { class: 'slider' }),
      label ? h('span', { class: 'toggle-label' }, label) : null
    );
  UI.empty = (text, action) => h('div', { class: 'empty' }, UI.icon('message', 32), h('p', null, text), action || null);
  UI.card = (...children) => h('div', { class: 'card' }, ...children);
  UI.section = (title, ...children) => h('section', { class: 'section' }, title ? h('h3', null, title) : null, ...children);
  UI.row = (...children) => h('div', { class: 'row' }, ...children);
  UI.badge = (text, color) => h('span', { class: 'badge', style: color ? { background: color } : null }, text);
  UI.varsHint = () =>
    h('small', { class: 'hint' }, 'Variáveis: {nome} {primeiro_nome} {saudacao} {numero} {data} {hora} · Variações aleatórias: {Olá|Oi|E aí}');

  /** Botão "anexar arquivo" que guarda o anexo em obj[key]. */
  UI.attachField = (obj, key, onChange, accept = '*/*') => {
    const wrap = h('div', { class: 'attach' });
    const draw = () => {
      wrap.textContent = '';
      const f = obj[key];
      if (f) {
        wrap.append(
          h('span', { class: 'attach-name' }, UI.icon('clip', 14), ` ${f.name} (${Math.round((f.size || 0) / 1024)} KB)`),
          UI.iconBtn('x', () => {
            obj[key] = null;
            draw();
            onChange && onChange();
          }, 'Remover anexo')
        );
      } else {
        wrap.append(
          UI.btn('Anexar arquivo', async () => {
            const file = await U.pickFile(accept);
            if (!file) return;
            try {
              obj[key] = await U.fileToAttachment(file);
              draw();
              onChange && onChange();
            } catch (e) {
              UI.toast(e.message, 'error');
            }
          }, { icon: 'clip', small: true })
        );
      }
    };
    draw();
    return wrap;
  };

  // ---------------------------------------------------------------- shell
  UI.mount = async () => {
    const host = h('div', { id: 'cmt-host' });
    document.documentElement.appendChild(host);
    const root = (UI.root = host.attachShadow({ mode: 'open' }));
    try {
      const css = await (await fetch(chrome.runtime.getURL('src/content/ui.css'))).text();
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      root.adoptedStyleSheets = [sheet];
    } catch (e) {
      console.error('[Comenta AI] CSS', e);
    }

    UI.railEl = h('nav', { class: 'rail' });
    UI.drawer = h('aside', { class: 'drawer' });
    UI.toasts = h('div', { class: 'toasts' });
    UI.layer = h('div', { class: 'layer' });
    UI.popupLayer = h('div', { class: 'popup-layer' });
    UI.app = h('div', { class: 'app' }, UI.railEl, UI.drawer, UI.layer, UI.popupLayer, UI.toasts);
    root.appendChild(UI.app);
    document.documentElement.classList.add('cmt-on');
    UI.syncTheme();
    setInterval(UI.syncTheme, 3000);
    UI.renderRail();
  };

  UI.syncTheme = () => {
    const b = document.body;
    if (!b || !UI.app) return;
    // Cor de fundo efetiva (ignora transparente), do body ou do html.
    const parse = (c) => {
      const m = c && c.match(/[\d.]+/g);
      if (!m || m.length < 3 || (m.length === 4 && Number(m[3]) === 0)) return null;
      return m.slice(0, 3).map(Number);
    };
    const bg = parse(getComputedStyle(b).backgroundColor) || parse(getComputedStyle(document.documentElement).backgroundColor);
    let dark;
    if (b.classList.contains('dark') || document.documentElement.classList.contains('dark')) dark = true;
    else if (bg) dark = bg.every((n) => n < 60);
    else dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    UI.app.classList.toggle('dark', !!dark);
  };

  UI.register = (panel) => {
    UI.panels.push(panel);
    UI.panels.sort((a, b) => (a.order || 50) - (b.order || 50));
  };

  UI.renderRail = () => {
    const rail = UI.railEl;
    rail.textContent = '';
    const status = CMT.state.ready ? 'on' : 'off';
    rail.append(
      h('div', { class: 'rail-logo', title: 'Comenta AI' }, UI.icon('logo', 26)),
      h(
        'div',
        { class: 'rail-items' },
        UI.panels
          .filter((p) => !p.bottom)
          .map((p) =>
            h(
              'button',
              { class: `rail-btn ${UI.current === p.id ? 'active' : ''}`, title: p.title, onClick: () => (p.action ? p.action() : UI.toggle(p.id)), type: 'button' },
              UI.icon(typeof p.icon === 'function' ? p.icon() : p.icon, 22),
              p.badge && p.badge() ? h('span', { class: 'rail-badge' }, String(p.badge())) : null,
              h('span', { class: 'rail-tip' }, p.title)
            )
          )
      ),
      h(
        'div',
        { class: 'rail-bottom' },
        UI.panels
          .filter((p) => p.bottom)
          .map((p) =>
            h(
              'button',
              { class: `rail-btn ${UI.current === p.id ? 'active' : ''}`, title: p.title, onClick: () => (p.action ? p.action() : UI.toggle(p.id)), type: 'button' },
              UI.icon(typeof p.icon === 'function' ? p.icon() : p.icon, 22),
              h('span', { class: 'rail-tip' }, p.title)
            )
          ),
        h('div', { class: `rail-status ${status}`, title: CMT.state.ready ? 'Conectado ao WhatsApp' : 'Aguardando WhatsApp...' }),
        h('div', { class: 'rail-ver' }, `v${chrome.runtime.getManifest().version}`)
      )
    );
  };

  UI.toggle = (id, params) => (UI.current === id && !params ? UI.close() : UI.open(id, params));
  UI.open = (id, params = null) => {
    const panel = UI.panels.find((p) => p.id === id);
    if (!panel) return;
    UI.current = id;
    UI.params = params;
    UI.drawer.className = `drawer open ${panel.wide ? 'wide' : ''}`;
    UI.renderPanel();
    UI.renderRail();
  };
  UI.close = () => {
    UI.current = null;
    UI.drawer.className = 'drawer';
    UI.drawer.textContent = '';
    UI.renderRail();
  };
  UI.renderPanel = () => {
    const panel = UI.panels.find((p) => p.id === UI.current);
    if (!panel) return;
    const prevBody = UI.drawer.querySelector('.drawer-body');
    const scroll = prevBody ? prevBody.scrollTop : 0;
    const body = h('div', { class: 'drawer-body' });
    const ac = CMT.state.activeChat;
    UI.drawer.textContent = '';
    UI.drawer.append(
      h(
        'header',
        { class: 'drawer-head' },
        h('div', { class: 'drawer-title' }, UI.icon(typeof panel.icon === 'function' ? panel.icon() : panel.icon, 20), h('h2', null, panel.title)),
        h('div', { class: 'drawer-chat', title: 'Conversa aberta no WhatsApp' }, ac ? `💬 ${ac.name}` : 'Nenhuma conversa aberta'),
        UI.iconBtn('x', UI.close, 'Fechar')
      ),
      body
    );
    try {
      const r = panel.render(body, UI.params);
      if (r && r.then) r.then(() => (body.scrollTop = scroll)).catch((e) => body.append(h('p', { class: 'error' }, e.message)));
      else body.scrollTop = scroll;
    } catch (e) {
      console.error(e);
      body.append(h('p', { class: 'error' }, `Erro: ${e.message}`));
    }
  };
  /** Re-renderiza o painel atual se ele for um dos ids informados e não houver campo em edição. */
  UI.refresh = (...ids) => {
    if (!UI.current) return;
    if (ids.length && !ids.includes(UI.current)) return;
    const active = UI.root.activeElement;
    if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName) && UI.drawer.contains(active)) return;
    if (UI.layer.childElementCount) return;
    UI.renderPanel();
  };

  // ---------------------------------------------------------------- toast & modais
  UI.toast = (msg, type = 'info', ms = 3500) => {
    const t = h('div', { class: `toast ${type}` }, msg);
    UI.toasts.appendChild(t);
    setTimeout(() => t.classList.add('hide'), ms);
    setTimeout(() => t.remove(), ms + 400);
  };

  UI.modal = ({ title, body, actions = [], width }) => {
    const close = () => wrap.remove();
    const box = h(
      'div',
      { class: 'modal', style: width ? { width } : null },
      h('header', { class: 'modal-head' }, h('h3', null, title || ''), UI.iconBtn('x', close, 'Fechar')),
      h('div', { class: 'modal-body' }, body),
      actions.length
        ? h(
            'footer',
            { class: 'modal-foot' },
            actions.map((a) => UI.btn(a.label, () => a.onClick(close), { kind: a.kind || '', icon: a.icon }))
          )
        : null
    );
    const wrap = h('div', { class: 'backdrop', onMousedown: (e) => e.target === wrap && close() }, box);
    UI.layer.appendChild(wrap);
    const first = box.querySelector('input,textarea,select');
    if (first) setTimeout(() => first.focus(), 30);
    return close;
  };

  UI.confirm = (text, okLabel = 'Confirmar', kind = 'danger') =>
    new Promise((resolve) => {
      UI.modal({
        title: 'Confirmação',
        body: h('p', null, text),
        actions: [
          { label: 'Cancelar', onClick: (c) => (c(), resolve(false)) },
          { label: okLabel, kind, onClick: (c) => (c(), resolve(true)) },
        ],
      });
    });

  /**
   * Formulário genérico. fields: [{name,label,type:'text'|'textarea'|'number'|'select'|'datetime'|'color'|'checkbox', value, options, hint, placeholder}]
   */
  UI.form = (title, fields, okLabel = 'Salvar') =>
    new Promise((resolve) => {
      const inputs = {};
      const body = h(
        'div',
        { class: 'form' },
        fields.map((f) => {
          let el;
          if (f.type === 'textarea') el = UI.textarea({ value: f.value || '', rows: f.rows || 5, placeholder: f.placeholder || '' });
          else if (f.type === 'select') el = UI.select(f.options, f.value);
          else if (f.type === 'checkbox') el = h('input', { type: 'checkbox', checked: !!f.value });
          else
            el = UI.input({
              type: f.type === 'datetime' ? 'datetime-local' : f.type || 'text',
              value: f.value ?? '',
              placeholder: f.placeholder || '',
              min: f.min,
              max: f.max,
            });
          inputs[f.name] = el;
          return UI.field(f.label, el, f.hint);
        })
      );
      UI.modal({
        title,
        body,
        actions: [
          { label: 'Cancelar', onClick: (c) => (c(), resolve(null)) },
          {
            label: okLabel,
            kind: 'primary',
            onClick: (c) => {
              const out = {};
              for (const f of fields) {
                const el = inputs[f.name];
                out[f.name] = f.type === 'checkbox' ? el.checked : f.type === 'number' ? Number(el.value) : el.value;
              }
              c();
              resolve(out);
            },
          },
        ],
      });
    });

  /** Seleção de conversas a partir da lista do WhatsApp. */
  UI.pickChats = async ({ multi = false, title = 'Escolher conversa', filter } = {}) => {
    await CMT.refreshChats();
    return new Promise((resolve) => {
      const selected = new Set();
      let q = '';
      const list = h('div', { class: 'pick-list' });
      const draw = () => {
        list.textContent = '';
        const items = CMT.state.chats
          .filter((c) => (!filter || filter(c)) && (!q || `${c.name} ${c.number}`.toLowerCase().includes(q)))
          .slice(0, 300);
        if (!items.length) list.append(UI.empty('Nenhuma conversa encontrada'));
        for (const c of items) {
          list.append(
            h(
              'div',
              {
                class: `pick-item ${selected.has(c.id) ? 'sel' : ''}`,
                onClick: () => {
                  if (!multi) {
                    close();
                    resolve(c);
                    return;
                  }
                  selected.has(c.id) ? selected.delete(c.id) : selected.add(c.id);
                  draw();
                },
              },
              multi ? h('input', { type: 'checkbox', checked: selected.has(c.id) }) : null,
              h('span', { class: 'avatar' }, (c.name || '?')[0].toUpperCase()),
              h('div', { class: 'grow' }, h('b', null, c.name), h('small', null, c.isGroup ? 'Grupo' : c.number || ''))
            )
          );
        }
      };
      const search = UI.input({ placeholder: 'Buscar por nome ou número...', onInput: (e) => ((q = e.target.value.toLowerCase()), draw()) });
      draw();
      const close = UI.modal({
        title,
        body: h('div', null, search, list),
        actions: multi
          ? [
              { label: 'Cancelar', onClick: (c) => (c(), resolve(null)) },
              { label: 'Adicionar selecionados', kind: 'primary', onClick: (c) => (c(), resolve(CMT.state.chats.filter((x) => selected.has(x.id)))) },
            ]
          : [{ label: 'Cancelar', onClick: (c) => (c(), resolve(null)) }],
      });
    });
  };

  /** Exige uma conversa aberta; mostra aviso se não houver. */
  UI.requireChat = () => {
    const c = CMT.state.activeChat;
    if (!c) UI.toast('Abra uma conversa no WhatsApp primeiro.', 'warn');
    return c;
  };
})();
