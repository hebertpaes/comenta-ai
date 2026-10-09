/* Service worker: chamadas à API de IA, webhooks e notificações. */

const API_URL = 'https://api.anthropic.com/v1/messages';
const WA_URL = 'https://web.whatsapp.com/*';

const getSecrets = async () => (await chrome.storage.local.get('secrets')).secrets || {};

/** Chama a Messages API da Anthropic com a chave do usuário (direto do navegador). */
async function callClaude({ model, effort, system, messages, maxTokens }) {
  const { anthropicKey } = await getSecrets();
  if (!anthropicKey) throw new Error('Chave de API não configurada.');
  const body = {
    model: model || 'claude-opus-5-5',
    max_tokens: Math.min(Math.max(Number(maxTokens) || 2048, 256), 8192),
    system: system || undefined,
    messages,
    output_config: { effort: effort || 'low' },
  };
  const headers = {
    'content-type': 'application/json',
    'x-api-key': anthropicKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  };
  // Fallback automático em caso de recusa por classificador de segurança (Opus/Sonnet 5.5).
  if (/^claude-(opus|sonnet)-5-5/.test(body.model)) {
    headers['anthropic-beta'] = 'server-side-fallback-2026-07-01';
    body.fallbacks = 'default';
  }
  const res = await fetch(API_URL, { method: 'POST', headers, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json.error && json.error.message) || `HTTP ${res.status}`;
    if (res.status === 401) throw new Error('Chave de API inválida.');
    if (res.status === 429) throw new Error('Limite de requisições atingido. Tente novamente em instantes.');
    throw new Error(msg);
  }
  if (json.stop_reason === 'refusal') throw new Error('A IA recusou gerar este conteúdo.');
  const text = (json.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
  return { text, usage: json.usage, stop_reason: json.stop_reason };
}

async function postWebhook(event, data) {
  const { webhookUrl } = await getSecrets();
  if (!webhookUrl) return;
  try {
    // text/plain evita preflight CORS; o servidor recebe o JSON no corpo.
    await fetch(webhookUrl, { method: 'POST', mode: 'no-cors', headers: { 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ event, data, at: new Date().toISOString() }) });
  } catch (e) {
    console.warn('[Comenta AI] webhook', e);
  }
}

const notifyChats = new Map();
function notify({ title, message, chatId }) {
  const id = `cmt-${Date.now()}`;
  if (chatId) notifyChats.set(id, chatId);
  chrome.notifications.create(id, { type: 'basic', iconUrl: chrome.runtime.getURL('icons/icon128.png'), title: title || 'Comenta AI', message: message || '', priority: 2 });
}

/** Aba do WhatsApp Web mais provável de estar em uso (ativa ou acessada por último). */
async function bestWaTab() {
  const tabs = await chrome.tabs.query({ url: WA_URL });
  return tabs.sort((a, b) => (b.active === true) - (a.active === true) || (b.lastAccessed || 0) - (a.lastAccessed || 0))[0] || null;
}

chrome.notifications.onClicked.addListener(async (id) => {
  chrome.notifications.clear(id);
  const tab = await bestWaTab();
  if (!tab) return chrome.tabs.create({ url: 'https://web.whatsapp.com/' });
  await chrome.tabs.update(tab.id, { active: true });
  await chrome.windows.update(tab.windowId, { focused: true });
  const chatId = notifyChats.get(id);
  if (chatId) chrome.tabs.sendMessage(tab.id, { type: 'cmt:open-chat', chatId }).catch(() => {});
  notifyChats.delete(id);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;
  if (msg.type === 'cmt:ai') {
    callClaude(msg)
      .then((r) => sendResponse(r))
      .catch((e) => sendResponse({ error: e.message || String(e) }));
    return true;
  }
  if (msg.type === 'cmt:webhook') {
    postWebhook(msg.event, msg.data);
    sendResponse({ ok: true });
    return;
  }
  if (msg.type === 'cmt:notify') {
    notify(msg);
    sendResponse({ ok: true });
    return;
  }
  if (msg.type === 'cmt:open-options') {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return;
  }
  if (msg.type === 'cmt:open-whatsapp') {
    bestWaTab().then(async (tab) => {
      if (tab) {
        await chrome.tabs.update(tab.id, { active: true });
        await chrome.windows.update(tab.windowId, { focused: true });
      } else await chrome.tabs.create({ url: 'https://web.whatsapp.com/' });
      sendResponse({ ok: true });
    });
    return true;
  }
});

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') chrome.tabs.create({ url: 'https://web.whatsapp.com/' });
});
