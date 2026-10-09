const $ = (id) => document.getElementById(id);
const DATA_KEYS = ['settings', 'quickReplies', 'kanban', 'schedules', 'funnels', 'triggers', 'reminders', 'notes', 'tabs', 'campaigns', 'stats'];

async function load() {
  const { secrets = {}, settings = {} } = await chrome.storage.local.get(['secrets', 'settings']);
  const ai = settings.ai || {};
  $('key').value = secrets.anthropicKey || '';
  $('webhook').value = secrets.webhookUrl || '';
  $('model').value = ai.model || 'claude-opus-5-5';
  $('effort').value = ai.effort || 'low';
  $('tone').value = ai.tone || '';
  $('business').value = ai.business || '';
}

async function save() {
  const key = $('key').value.trim();
  if (key && !key.startsWith('sk-ant-')) return flash('A chave deve começar com sk-ant-', true);
  const { settings = {} } = await chrome.storage.local.get('settings');
  settings.ai = Object.assign({}, settings.ai, { model: $('model').value, effort: $('effort').value, tone: $('tone').value.trim() || 'cordial e objetivo', business: $('business').value.trim() });
  await chrome.storage.local.set({ settings, secrets: { anthropicKey: key, webhookUrl: $('webhook').value.trim() } });
  flash('Salvo!');
}

function flash(text, error) {
  const m = $('msg');
  m.textContent = text;
  m.style.color = error ? '#ef4444' : '#10b981';
  setTimeout(() => (m.textContent = ''), 3000);
}

$('save').onclick = save;
$('export').onclick = async () => {
  const data = await chrome.storage.local.get(DATA_KEYS);
  const blob = new Blob([JSON.stringify({ app: 'comenta-ai', version: chrome.runtime.getManifest().version, exportedAt: Date.now(), data }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `comenta-ai-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
};
$('import').onclick = () => $('file').click();
$('file').onchange = async () => {
  const f = $('file').files[0];
  if (!f) return;
  try {
    const json = JSON.parse(await f.text());
    const data = json.data || json;
    const out = {};
    for (const k of DATA_KEYS) if (k in data) out[k] = data[k];
    if (!Object.keys(out).length) throw new Error('Arquivo não reconhecido');
    if (!confirm(`Importar ${Object.keys(out).length} seções? Os dados atuais dessas seções serão substituídos.`)) return;
    await chrome.storage.local.set(out);
    flash('Backup importado!');
    load();
  } catch (e) {
    flash(`Erro: ${e.message}`, true);
  }
};
load();
