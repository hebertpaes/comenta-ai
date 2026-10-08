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

const $ = (id) => document.getElementById(id);
$('version').textContent = `v${chrome.runtime.getManifest().version}`;
$('options').onclick = () => chrome.runtime.openOptionsPage();
$('openWa').onclick = () => chrome.runtime.sendMessage({ type: 'cmt:open-whatsapp' }, () => window.close());

async function init() {
  const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
  const stats = (await chrome.storage.local.get('stats')).stats || {};
  $('sSent').textContent = stats.sent || 0;
  $('sAuto').textContent = stats.auto || 0;
  if (!tabs.length) {
    $('status').textContent = 'WhatsApp Web fechado';
    $('closed').hidden = false;
    return;
  }
  const tab = tabs[0];
  let state = null;
  try {
    state = await chrome.tabs.sendMessage(tab.id, { type: 'cmt:state' });
  } catch (e) {}
  if (!state) {
    $('status').textContent = 'Recarregue a aba do WhatsApp Web';
    $('closed').hidden = false;
    $('closed').querySelector('p').textContent = 'A extensão ainda não carregou nesta aba. Recarregue a página do WhatsApp Web.';
    $('openWa').textContent = 'Ir para o WhatsApp Web';
    return;
  }
  $('status').textContent = state.ready ? `Conectado${state.me ? ` · +${state.me.split('@')[0]}` : ''}${state.running ? ' · transmissão em andamento' : ''}` : 'Aguardando o WhatsApp carregar…';
  $('sUnread').textContent = state.unread || 0;
  $('open').hidden = false;
  const grid = $('panels');
  for (const [id, label] of PANELS) {
    const b = document.createElement('button');
    b.textContent = label;
    b.onclick = async () => {
      await chrome.tabs.update(tab.id, { active: true });
      await chrome.windows.update(tab.windowId, { focused: true });
      chrome.tabs.sendMessage(tab.id, { type: 'cmt:open', panel: id });
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
init();
