/**
 * Comenta.AI Widget v1.0
 * Embed AI-moderated comments on any website
 * Usage: <script src="/widget.js" data-site-id="..."></script>
 * Authentication is done via Origin header validation (no API key needed).
 */
(function () {
  "use strict";

  const script = document.currentScript;
  const SITE_ID = script?.getAttribute("data-site-id");
  const API_BASE = script?.getAttribute("data-api-base") || window.location.origin;
  const PAGE_URL = window.location.href;

  if (!SITE_ID) {
    console.error("[Comenta.AI] data-site-id is required");
    return;
  }

  const container = document.getElementById("comenta-ai") || (() => {
    const el = document.createElement("div");
    el.id = "comenta-ai";
    document.currentScript.parentNode.insertBefore(el, document.currentScript.nextSibling);
    return el;
  })();

  const API = `${API_BASE}/api/widget/${SITE_ID}/comments`;

  const style = document.createElement("style");
  style.textContent = `
    #comenta-ai { font-family: system-ui, sans-serif; max-width: 640px; color: #111; }
    #comenta-ai * { box-sizing: border-box; }
    .cai-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 1rem; }
    .cai-form { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 2rem; }
    .cai-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .cai-input { width: 100%; padding: 0.6rem 0.8rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.875rem; outline: none; }
    .cai-input:focus { border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,0.15); }
    .cai-textarea { resize: vertical; min-height: 90px; }
    .cai-btn { background: #6366f1; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 8px; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: background 0.2s; align-self: flex-start; }
    .cai-btn:hover { background: #4f46e5; }
    .cai-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .cai-msg { padding: 0.6rem 0.8rem; border-radius: 8px; font-size: 0.8rem; }
    .cai-msg.ok { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
    .cai-msg.err { background: #fff1f2; color: #be123c; border: 1px solid #fecdd3; }
    .cai-comments { display: flex; flex-direction: column; gap: 1rem; }
    .cai-comment { display: flex; gap: 0.75rem; }
    .cai-avatar { width: 36px; height: 36px; border-radius: 50%; background: #eef2ff; color: #6366f1; font-weight: 600; font-size: 0.875rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .cai-comment-body { flex: 1; }
    .cai-author { font-weight: 600; font-size: 0.875rem; }
    .cai-date { font-size: 0.75rem; color: #94a3b8; margin-left: 0.5rem; }
    .cai-text { font-size: 0.875rem; color: #374151; margin-top: 0.25rem; line-height: 1.5; }
    .cai-empty { color: #94a3b8; font-size: 0.875rem; text-align: center; padding: 2rem 0; }
    .cai-badge { font-size: 0.7rem; background: #eef2ff; color: #6366f1; padding: 0.15rem 0.5rem; border-radius: 99px; font-weight: 500; }
  `;
  document.head.appendChild(style);

  function timeAgo(dateStr) {
    const date = new Date(dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T") + "Z");
    const diff = Date.now() - date.getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}min atrás`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h atrás`;
    return `${Math.floor(h / 24)}d atrás`;
  }

  async function loadComments() {
    try {
      const res = await fetch(`${API}?page_url=${encodeURIComponent(PAGE_URL)}`);
      const data = await res.json();
      renderComments(data.comments || []);
    } catch (e) {
      console.error("[Comenta.AI]", e);
    }
  }

  function renderComments(comments) {
    const list = document.getElementById("cai-list");
    if (!list) return;
    if (comments.length === 0) {
      list.innerHTML = '<p class="cai-empty">Seja o primeiro a comentar!</p>';
      return;
    }
    list.innerHTML = comments.map((c) => `
      <div class="cai-comment">
        <div class="cai-avatar">${escHtml((c.author_name?.[0] || "?").toUpperCase())}</div>
        <div class="cai-comment-body">
          <span class="cai-author">${escHtml(c.author_name)}</span>
          <span class="cai-date">${timeAgo(c.created_at)}</span>
          <p class="cai-text">${escHtml(c.content)}</p>
        </div>
      </div>
    `).join("");
  }

  function escHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  container.innerHTML = `
    <div class="cai-title">Comentários <span class="cai-badge">Comenta.AI</span></div>
    <form class="cai-form" id="cai-form">
      <div class="cai-row">
        <input class="cai-input" id="cai-name" type="text" placeholder="Seu nome *" required maxlength="80">
        <input class="cai-input" id="cai-email" type="email" placeholder="E-mail (opcional)" maxlength="120">
      </div>
      <textarea class="cai-input cai-textarea" id="cai-content" placeholder="Escreva seu comentário..." required maxlength="2000"></textarea>
      <div id="cai-feedback"></div>
      <button class="cai-btn" type="submit" id="cai-submit">Publicar comentário</button>
    </form>
    <div class="cai-comments" id="cai-list"><p class="cai-empty">Carregando...</p></div>
  `;

  document.getElementById("cai-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("cai-submit");
    const fb = document.getElementById("cai-feedback");
    btn.disabled = true;
    btn.textContent = "Enviando...";
    fb.innerHTML = "";

    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_url: PAGE_URL,
          author_name: document.getElementById("cai-name").value,
          author_email: document.getElementById("cai-email").value || undefined,
          content: document.getElementById("cai-content").value,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        fb.innerHTML = `<div class="cai-msg ok">${data.message}</div>`;
        document.getElementById("cai-form").reset();
        if (data.status === "approved") loadComments();
      } else {
        fb.innerHTML = `<div class="cai-msg err">${data.error || "Erro ao enviar"}</div>`;
      }
    } catch {
      fb.innerHTML = '<div class="cai-msg err">Erro de conexão. Tente novamente.</div>';
    } finally {
      btn.disabled = false;
      btn.textContent = "Publicar comentário";
    }
  });

  loadComments();
})();
