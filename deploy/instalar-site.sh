#!/usr/bin/env bash
# Publica o site do Comenta AI (página + política de privacidade + download) em uma VM Ubuntu com nginx.
# Gerado por scripts/build-deploy.sh — não edite à mão; edite docs/ e rode o script de novo.
#
# Uso (como root): sudo bash instalar-site.sh <dominio> [email_letsencrypt] [url_do_zip]
# Ex.:             sudo bash instalar-site.sh comenta.com.br voce@exemplo.com https://github.com/hebertpaes/comenta-ai/releases/download/v1.0.0/comenta-ai-v1.0.0.zip
# Pré-requisito: registros A de <dominio> e www.<dominio> apontando para esta VM (Cloudflare com Proxy OFF até o certificado sair).
set -euo pipefail
DOMAIN=${1:-comenta.com.br}; EMAIL=${2:-deploy@deploy.com}; ZIP_URL=${3:-}
[[ $EUID -eq 0 ]] || { echo "execute como root (sudo)"; exit 1; }
export DEBIAN_FRONTEND=noninteractive
ROOT=/var/www/comenta

# Portas 80/443: a imagem Ubuntu da Oracle bloqueia no iptables; a Security List da VCN também precisa liberar.
if command -v iptables >/dev/null && ! iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null; then
  iptables -I INPUT 5 -p tcp --dport 80 -j ACCEPT; iptables -I INPUT 5 -p tcp --dport 443 -j ACCEPT
  apt-get install -y -q iptables-persistent >/dev/null 2>&1 || true; netfilter-persistent save >/dev/null 2>&1 || true
fi
command -v nginx >/dev/null || { apt-get update -q && apt-get install -y -q nginx; }
if ! command -v certbot >/dev/null; then snap install --classic certbot >/dev/null 2>&1 && ln -sf /snap/bin/certbot /usr/bin/certbot || apt-get install -y -q certbot python3-certbot-nginx; fi

mkdir -p "$ROOT/download"
cat > "$ROOT/index.html" <<'HTML_INDEX'
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Comenta AI – Superpoderes para o WhatsApp Web</title>
    <style>
      :root { color-scheme: light dark; --brand: #7c3aed; --bg: #f5f6f8; --fg: #111827; --card: #fff; --line: #e5e7eb; --muted: #6b7280; }
      @media (prefers-color-scheme: dark) { :root { --bg: #171b1e; --fg: #e9edef; --card: #1f2428; --line: #313a40; --muted: #aebac1; } }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background: var(--bg); color: var(--fg); line-height: 1.5; }
      header { background: linear-gradient(135deg, #312e81, #581c87); color: #fff; padding: 48px 16px; text-align: center; }
      header h1 { margin: 0 0 8px; font-size: 36px; }
      header p { margin: 0 auto; max-width: 640px; opacity: 0.9; }
      main { max-width: 900px; margin: 0 auto; padding: 32px 16px 64px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin: 24px 0; }
      .card { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 16px; }
      .card h3 { margin: 0 0 6px; font-size: 16px; }
      .card p { margin: 0; color: var(--muted); font-size: 14px; }
      .btn { display: inline-block; background: var(--brand); color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; margin: 8px 8px 0 0; }
      .btn.secondary { background: transparent; border: 1px solid var(--line); color: var(--fg); }
      footer { text-align: center; color: var(--muted); font-size: 13px; padding: 24px 16px; }
      ol li { margin-bottom: 6px; }
    </style>
  </head>
  <body>
    <header>
      <h1>Comenta AI</h1>
      <p>Superpoderes para o WhatsApp Web: CRM Kanban, transmissões, agendamentos, respostas rápidas, funis, chatbot, assistente de IA e modo privacidade — tudo no seu navegador.</p>
      <a class="btn" href="https://github.com/hebertpaes/comenta-ai">Ver no GitHub</a>
      <a class="btn secondary" href="/privacidade.html">Política de privacidade</a>
    </header>
    <main>
      <h2>Recursos</h2>
      <div class="grid">
        <div class="card"><h3>🗂 CRM Kanban</h3><p>Organize conversas em colunas com arrastar-e-soltar, anotações e envio em lote.</p></div>
        <div class="card"><h3>📣 Transmissão em massa</h3><p>Listas de contatos, variáveis, intervalos aleatórios, limite diário e relatório.</p></div>
        <div class="card"><h3>📅 Agendamentos</h3><p>Mensagens e funis agendados, com repetição diária, semanal ou mensal.</p></div>
        <div class="card"><h3>⚡ Respostas rápidas</h3><p>Atalhos /comando direto na caixa de mensagem do WhatsApp.</p></div>
        <div class="card"><h3>🤖 Chatbot</h3><p>Respostas automáticas por palavra-chave, boas-vindas, fora do expediente e IA.</p></div>
        <div class="card"><h3>✨ Assistente de IA</h3><p>Resuma conversas, sugira respostas e melhore textos com Claude usando a sua chave.</p></div>
        <div class="card"><h3>👁 Modo privacidade</h3><p>Desfoque mensagens, lista e fotos para atender em público. Alt+Shift+P.</p></div>
        <div class="card"><h3>🔒 Seus dados, no seu navegador</h3><p>Nada passa por servidores da extensão. Backup e restauração em JSON.</p></div>
      </div>
      <h2>Instalação</h2>
      <ol>
        <li>Instale pela Chrome Web Store (em breve) ou baixe o <code>.zip</code> na página de <a href="/download/comenta-ai-v1.0.0.zip">releases</a>.</li>
        <li>Para instalar manualmente: descompacte, abra <code>chrome://extensions</code>, ative o Modo do desenvolvedor e clique em “Carregar sem compactação”.</li>
        <li>Abra o <a href="https://web.whatsapp.com">WhatsApp Web</a> — a barra lateral aparece à esquerda.</li>
      </ol>
      <h2>Aviso</h2>
      <p>Comenta AI é um projeto independente e não é afiliado ao WhatsApp ou à Meta Platforms. Use com responsabilidade: envios em massa não solicitados violam os termos do WhatsApp.</p>
    </main>
    <footer>Comenta AI · Código aberto (MIT) · <a href="/privacidade.html">Privacidade</a></footer>
  </body>
</html>
HTML_INDEX
cat > "$ROOT/privacidade.html" <<'HTML_PRIV'
<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Política de Privacidade – Comenta AI</title><style>
:root{color-scheme:light dark;--bg:#f5f6f8;--fg:#111827;--card:#fff;--line:#e5e7eb;--muted:#6b7280;--brand:#7c3aed}
@media(prefers-color-scheme:dark){:root{--bg:#171b1e;--fg:#e9edef;--card:#1f2428;--line:#313a40;--muted:#aebac1}}
*{box-sizing:border-box}body{margin:0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;background:var(--bg);color:var(--fg);line-height:1.6}
header{background:linear-gradient(135deg,#312e81,#581c87);color:#fff;padding:32px 16px;text-align:center}header a{color:#c7d2fe}
main{max-width:820px;margin:0 auto;padding:24px 16px 64px;background:var(--card)}
h1{font-size:28px}h2{margin-top:32px;border-bottom:1px solid var(--line);padding-bottom:6px}
table{border-collapse:collapse;width:100%;font-size:14px}th,td{border:1px solid var(--line);padding:8px;text-align:left;vertical-align:top}
code{background:var(--bg);padding:2px 5px;border-radius:4px;font-size:90%}a{color:var(--brand)}
footer{text-align:center;color:var(--muted);font-size:13px;padding:24px}
</style></head>
<body><header><strong>Comenta AI</strong> · <a href="/">início</a></header>
<main><h1>Política de Privacidade – Comenta AI</h1>
<p><strong>Última atualização:</strong> 9 de outubro de 2026</p>
<p>O <strong>Comenta AI</strong> é uma extensão para o navegador Google Chrome que adiciona ferramentas de produtividade ao WhatsApp Web (CRM, transmissões, agendamentos, respostas rápidas, chatbot, assistente de IA, lembretes, modo privacidade). Esta política explica quais dados a extensão trata e como.</p>
<h2>Resumo</h2>
<ul><li><strong>Não coletamos, não armazenamos em servidores e não vendemos dados.</strong> O desenvolvedor da extensão não recebe nenhuma informação sua.</li><li>Todos os dados ficam <strong>no seu navegador</strong>, no armazenamento local da extensão (<code>chrome.storage.local</code>).</li><li>Conteúdo de conversas só sai do seu computador <strong>quando você usa um recurso que exige isso</strong> — o assistente de IA (enviado diretamente à API da Anthropic com a <strong>sua</strong> chave) ou um webhook que <strong>você</strong> configurou.</li></ul>
<h2>Dados tratados localmente</h2>
<p>A extensão guarda no seu navegador, exclusivamente para o funcionamento dos recursos:</p>
<ul><li>Configurações e preferências;</li><li>Respostas rápidas, funis, gatilhos do chatbot, lembretes, abas e notas que você cria;</li><li>Cards do CRM (nome e número do contato, coluna, datas) e notas por conversa;</li><li>Agendamentos e seus anexos (arquivos escolhidos por você, armazenados em formato base64);</li><li>Relatórios de transmissões (nome/número do destinatário e status do envio);</li><li>Estatísticas de uso (contadores de mensagens enviadas por dia);</li><li>Sua chave de API da Anthropic e a URL de webhook, se você as informar.</li></ul>
<p>Esses dados <strong>nunca</strong> são transmitidos ao desenvolvedor. Você pode exportá-los (Configurações › Backup) ou apagá-los a qualquer momento (Configurações › Backup › Apagar todos os dados, ou removendo a extensão).</p>
<h2>Dados enviados a terceiros (somente por sua ação)</h2>
<h3>Anthropic (assistente de IA)</h3>
<p>Quando você usa o assistente de IA (resumir conversa, sugerir resposta, reescrever texto, criar mensagem) ou ativa um gatilho de chatbot do tipo "resposta por IA", a extensão envia <strong>diretamente do seu navegador para <code>https://api.anthropic.com</code></strong>:</p>
<ul><li>o texto necessário para a tarefa (por exemplo, as últimas mensagens da conversa aberta ou o texto que você digitou);</li><li>a descrição do seu negócio e o tom de voz que você configurou;</li><li>a sua chave de API, no cabeçalho de autenticação.</li></ul>
<p>O uso é faturado na sua conta Anthropic e regido pelos <a href="https://www.anthropic.com/legal/consumer-terms">termos</a> e pela <a href="https://www.anthropic.com/legal/privacy">política de privacidade</a> da Anthropic. O desenvolvedor da extensão não tem acesso a esses dados nem à sua chave. Se você não configurar uma chave, nada é enviado.</p>
<h3>Webhook (opcional)</h3>
<p>Se você informar uma URL de webhook em Configurações › Webhook, a extensão enviará requisições HTTP <code>POST</code> <strong>para a URL que você escolheu</strong> com os eventos que você ativar (mensagem recebida, mensagem enviada pela extensão, transmissão concluída). O conteúdo pode incluir texto de mensagens e números de telefone. Você é responsável pelo destino configurado. Por padrão, nenhum webhook está ativo.</p>
<h3>WhatsApp</h3>
<p>A extensão funciona dentro do WhatsApp Web (<code>https://web.whatsapp.com</code>) e usa a sessão já autenticada no seu navegador para ler conversas e enviar mensagens <strong>em seu nome, quando você aciona um recurso</strong> (envio, transmissão, agendamento, resposta automática). Nenhum dado é enviado a servidores da extensão. O WhatsApp é um serviço da Meta Platforms, com termos e políticas próprios.</p>
<h2>Permissões solicitadas</h2>
<table><thead><tr><th>Permissão</th><th>Para quê</th></tr></thead><tbody><tr><td><code>storage</code>, <code>unlimitedStorage</code></td><td>Guardar suas configurações, CRM, funis, agendamentos e anexos no navegador.</td></tr><tr><td><code>notifications</code></td><td>Exibir lembretes no horário programado.</td></tr><tr><td>Acesso a <code>web.whatsapp.com</code></td><td>Exibir a barra lateral e integrar-se ao WhatsApp Web.</td></tr><tr><td>Acesso a <code>api.anthropic.com</code></td><td>Chamar a API de IA com a sua chave, quando você usar o assistente.</td></tr></tbody></table>
<p>A extensão não contém código remoto: todo o código é empacotado e revisado pela Chrome Web Store.</p>
<h2>Uso limitado</h2>
<p>O uso de dados do usuário pela extensão segue a <a href="https://developer.chrome.com/docs/webstore/program-policies/user-data-faq">Política de Dados do Usuário da Chrome Web Store</a>, incluindo os requisitos de uso limitado: os dados são usados apenas para fornecer os recursos descritos, não são vendidos, não são usados para publicidade nem para avaliação de crédito, e não são transferidos a terceiros exceto conforme descrito acima (por sua ação).</p>
<h2>Segurança</h2>
<p>Os dados ficam no perfil do seu navegador e estão protegidos pelas proteções do próprio Chrome. A chave de API é armazenada localmente e enviada apenas para <code>api.anthropic.com</code> por HTTPS. Recomendamos criar uma chave exclusiva para a extensão e revogá-la em caso de suspeita de uso indevido.</p>
<h2>Responsabilidade de uso</h2>
<p>Envios em massa e respostas automáticas devem respeitar os Termos de Serviço do WhatsApp e a legislação aplicável (incluindo a LGPD). Envie mensagens apenas a contatos que consentiram em recebê-las.</p>
<h2>Crianças</h2>
<p>A extensão não se destina a menores de 13 anos e não coleta intencionalmente dados de crianças.</p>
<h2>Alterações</h2>
<p>Esta política pode ser atualizada. A versão vigente é sempre publicada neste endereço, com a data de atualização.</p>
<h2>Contato</h2>
<p>Dúvidas sobre privacidade: abra uma <em>issue</em> em <a href="https://github.com/hebertpaes/comenta-ai/issues">https://github.com/hebertpaes/comenta-ai/issues</a> ou escreva para <strong>[preencha seu e-mail de contato]</strong>.</p></main>
<footer>Comenta AI · projeto independente, não afiliado ao WhatsApp/Meta</footer></body></html>
HTML_PRIV
chown -R www-data:www-data "$ROOT"

if [[ -n "$ZIP_URL" ]]; then
  curl -fsSL "$ZIP_URL" -o "$ROOT/download/$(basename "$ZIP_URL")" && echo "zip baixado para $ROOT/download/" || echo "AVISO: não consegui baixar $ZIP_URL (repositório privado?). Envie o zip para $ROOT/download/ manualmente."
fi

cat > /etc/nginx/sites-available/comenta-site <<END
server {
  listen 80;
  listen [::]:80;
  server_name $DOMAIN www.$DOMAIN;
  root $ROOT;
  index index.html;
  location / { try_files \$uri \$uri/ =404; }
  location /PRIVACIDADE.md { return 301 /privacidade.html; }
  location /download/ { autoindex on; add_header Content-Disposition attachment; }
  add_header X-Content-Type-Options nosniff;
}
END
ln -sf /etc/nginx/sites-available/comenta-site /etc/nginx/sites-enabled/comenta-site
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

MYIP=$(curl -s -H 'Authorization: Bearer Oracle' http://169.254.169.254/opc/v2/vnics/ | grep -oP '"publicIp"\s*:\s*"\K[^"]+' | head -1 || curl -s https://api.ipify.org)
OK=1
for H in "$DOMAIN" "www.$DOMAIN"; do R=$(dig +short "$H" @1.1.1.1 | tail -1 || true); [[ "$R" == "$MYIP" ]] || { echo "AVISO: $H resolve para '${R:-nada}', IP da VM é '$MYIP'."; OK=0; }; done
if [[ $OK == 1 ]]; then
  certbot --nginx --non-interactive --agree-tos -m "$EMAIL" --redirect -d "$DOMAIN" -d "www.$DOMAIN" || echo "certbot falhou; rode depois: certbot --nginx --redirect -d $DOMAIN -d www.$DOMAIN"
else
  echo "certbot NÃO executado. Depois de ajustar o DNS: certbot --nginx --redirect -d $DOMAIN -d www.$DOMAIN -m $EMAIL --agree-tos -n"
fi
echo; echo "Site publicado: http://$DOMAIN  (https após o certbot) · política: /privacidade.html · downloads: /download/"
