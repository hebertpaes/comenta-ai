const PANELS = [
  ['dashboard', '📊 Painel'],
  ['kanban', '🗂 CRM Kanban'],
  ['broadcast', '📣 Transmissão'],
  ['schedule', '📅 Agendamentos'],
  ['quickreplies', '⚡ Respostas rápidas'],
  ['funnels', '🔀 Funis'],
  ['chatbot', '🤖 Chatbot'],
  ['ai', '✨ Assistente IA'],
  ['reminders', '⏰ Lembretes'],
  ['tabs', '🗃 Abas & filtros'],
  ['groups', '👥 Contatos & grupos'],
  ['notes', '📝 Notas'],
];
const WA_URL = 'https://web.whatsapp.com/*';

const $ = (id) => document.getElementById(id);
$('version').textContent = `v${chrome.runtime.getManifest().version}`;
$('options').onclick = () => chrome.runtime.openOptionsPage();
$('openWa').onclick = () => chrome.runtime.sendMessage({ type: 'cmt:open-whatsapp' }, () => window.close());

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

/** Abas do WhatsApp Web, da mais provável (ativa / usada por último) para a menos. */
async function waTabs() {
  const tabs = await chrome.tabs.query({ url: WA_URL });
  return tabs.sort((a, b) => (b.active === true) - (a.active === true) || (b.lastAccessed || 0) - (a.lastAccessed || 0));
}

/** Encontra a primeira aba cujo content script responde. */
async function findLiveTab(tabs) {
  for (const tab of tabs) {
    try {
      const state = await withTimeout(chrome.tabs.sendMessage(tab.id, { type: 'cmt:state' }), 2500);
      if (state) return { tab, state };
    } catch (e) {}
  }
  return null;
}

async function focus(tab) {
  await chrome.tabs.update(tab.id, { active: true });
  await chrome.windows.update(tab.windowId, { focused: true });
}

async function init() {
  const tabs = await waTabs();
  const stats = (await chrome.storage.local.get('stats')).stats || {};
  $('sSent').textContent = stats.sent || 0;
  $('sAuto').textContent = stats.auto || 0;
  if (!tabs.length) {
    $('status').textContent = 'WhatsApp Web fechado';
    $('closed').hidden = false;
    return;
  }
  const live = await findLiveTab(tabs);
  if (!live) {
    $('status').textContent = 'Recarregue a aba do WhatsApp Web';
    $('closed').hidden = false;
    $('closed').querySelector('p').textContent = 'A extensão ainda não carregou nessa aba. Recarregue a página do WhatsApp Web.';
    $('openWa').textContent = 'Ir para o WhatsApp Web';
    $('openWa').onclick = () => focus(tabs[0]).then(() => window.close());
    return;
  }
  const { tab, state } = live;
  $('status').textContent = state.booting
    ? 'Carregando a extensão…'
    : state.ready
    ? `Conectado${state.me ? ` · +${state.me.split('@')[0]}` : ''}${state.running ? ' · transmissão em andamento' : ''}`
    : 'Aguardando login no WhatsApp Web…';
  $('sUnread').textContent = state.unread || 0;
  $('open').hidden = false;
  const grid = $('panels');
  for (const [id, label] of PANELS) {
    const b = document.createElement('button');
    b.textContent = label;
    b.onclick = async () => {
      await focus(tab);
      chrome.tabs.sendMessage(tab.id, { type: 'cmt:open', panel: id }).catch(() => {});
      window.close();
    };
    grid.appendChild(b);
  }
  $('privacy').onclick = async () => {
    const { settings } = await chrome.storage.local.get('settings');
    const s = settings || {};
    s.privacy = s.privacy || {};
    const on = !(s.privacy.messages || s.privacy.chatList || s.privacy.photos);
    Object.assign(s.privacy, { messages: on, chatList: on, photos: on });
    await chrome.storage.local.set({ settings: s });
    window.close();
  };
}
init().catch((e) => {
  $('status').textContent = `Erro: ${e.message}`;
  $('closed').hidden = false;
});
