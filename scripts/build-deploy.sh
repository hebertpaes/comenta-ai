#!/usr/bin/env bash
# Gera deploy/site/ (HTML da página e da política) e deploy/instalar-site.sh (autocontido, com o site embutido),
# para publicar comenta.com.br na VM sem precisar transferir arquivos.
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=$(python3 -c "import json;print(json.load(open('extension/manifest.json'))['version'])")

mkdir -p deploy/site
python3 scripts/md2html.py docs/PRIVACIDADE.md docs/privacidade.html "Política de Privacidade – Comenta AI"
cp docs/privacidade.html deploy/site/privacidade.html
# A página do projeto no site aponta para a política em HTML e para o download local
sed -e 's#href="privacidade.html"#href="/privacidade.html"#g' \
    -e "s#https://github.com/hebertpaes/comenta-ai/releases\"#/download/comenta-ai-v${VERSION}.zip\"#" \
    docs/index.html > deploy/site/index.html

OUT=deploy/instalar-site.sh
{
cat <<'HEAD'
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
HEAD
echo "cat > \"\$ROOT/index.html\" <<'HTML_INDEX'"
cat deploy/site/index.html
echo "HTML_INDEX"
echo "cat > \"\$ROOT/privacidade.html\" <<'HTML_PRIV'"
cat deploy/site/privacidade.html
echo "HTML_PRIV"
cat <<'TAIL'
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
TAIL
} > "$OUT"
chmod +x "$OUT" deploy/alterar-dominio.sh scripts/*.sh
bash -n "$OUT" && bash -n deploy/alterar-dominio.sh
echo "gerado: $OUT ($(wc -c < "$OUT") bytes), deploy/site/, docs/privacidade.html"
