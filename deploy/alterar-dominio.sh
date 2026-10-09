#!/usr/bin/env bash
# Troca o domínio de uma instância instalada pelo "instala-app-intsoft" (Atendechat) sem o menu interativo.
#
# Uso (como root na VM):
#   sudo bash alterar-dominio.sh <instancia> <host_frontend> <host_backend> [email_letsencrypt]
# Ex.:
#   sudo bash alterar-dominio.sh intsoft app.comenta.com.br api.comenta.com.br voce@exemplo.com
#
# O que faz: backup dos .env e dos sites do nginx → atualiza .env do backend/frontend → rebuild do frontend →
# recria os sites do nginx com os novos hosts → emite certificados (certbot --nginx) → reinicia pm2.
# Pré-requisito: os registros DNS A de <host_frontend> e <host_backend> já apontando para o IP desta VM (Proxy OFF no Cloudflare).
set -euo pipefail

INST=${1:-}; FRONT=${2:-}; BACK=${3:-}; EMAIL=${4:-deploy@deploy.com}
if [[ -z "$INST" || -z "$FRONT" || -z "$BACK" ]]; then
  echo "uso: $0 <instancia> <host_frontend> <host_backend> [email]"; echo "instâncias em /home/deploy:"; ls /home/deploy 2>/dev/null; exit 1
fi
[[ $EUID -eq 0 ]] || { echo "execute como root (sudo)"; exit 1; }
BASE=/home/deploy/$INST
[[ -d $BASE/backend && -d $BASE/frontend ]] || { echo "instância '$INST' não encontrada em /home/deploy"; ls /home/deploy; exit 1; }
FRONT=${FRONT#https://}; BACK=${BACK#https://}; FRONT=${FRONT%/}; BACK=${BACK%/}

# ---- portas atuais (detectadas) --------------------------------------------------------------
BPORT=$(grep -oP '^PORT=\K[0-9]+' "$BASE/backend/.env" || true)
FPORT=$(grep -oP 'listen\(\s*\K[0-9]+' "$BASE/frontend/server.js" || true)
[[ -z "$BPORT" ]] && BPORT=$(grep -oP 'proxy_pass http://127.0.0.1:\K[0-9]+' /etc/nginx/sites-available/${INST}-backend 2>/dev/null || true)
[[ -z "$FPORT" ]] && FPORT=$(grep -oP 'proxy_pass http://127.0.0.1:\K[0-9]+' /etc/nginx/sites-available/${INST}-frontend 2>/dev/null || true)
[[ -n "$BPORT" && -n "$FPORT" ]] || { echo "não consegui detectar as portas (backend=$BPORT frontend=$FPORT)"; exit 1; }
OLD_FRONT=$(grep -oP '^FRONTEND_URL=https?://\K[^/ ]+' "$BASE/backend/.env" || echo '?')
OLD_BACK=$(grep -oP '^BACKEND_URL=https?://\K[^/ ]+' "$BASE/backend/.env" || echo '?')
echo "Instância: $INST | frontend :$FPORT ($OLD_FRONT → $FRONT) | backend :$BPORT ($OLD_BACK → $BACK)"

# ---- DNS deve apontar para esta VM -----------------------------------------------------------
MYIP=$(curl -s -H 'Authorization: Bearer Oracle' http://169.254.169.254/opc/v2/vnics/ | grep -oP '"publicIp"\s*:\s*"\K[^"]+' | head -1 || true)
[[ -z "$MYIP" ]] && MYIP=$(curl -s https://api.ipify.org || true)
for H in "$FRONT" "$BACK"; do
  R=$(dig +short "$H" @1.1.1.1 | tail -1 || true)
  if [[ "$R" != "$MYIP" ]]; then
    echo "AVISO: $H resolve para '${R:-nada}' e o IP desta VM é '$MYIP'. Crie/ajuste o registro A no Cloudflare (Proxy OFF) antes do certbot."
    WARN=1
  fi
done

# ---- backup ----------------------------------------------------------------------------------
BK=/root/backup-dominio-$(date +%Y%m%d-%H%M%S); mkdir -p "$BK"
cp -a "$BASE/backend/.env" "$BK/backend.env"; cp -a "$BASE/frontend/.env" "$BK/frontend.env"
cp -a /etc/nginx/sites-available/${INST}-frontend /etc/nginx/sites-available/${INST}-backend "$BK/" 2>/dev/null || true
echo "backup em $BK"

# ---- .env ------------------------------------------------------------------------------------
sed -i -E "s#^REACT_APP_BACKEND_URL=.*#REACT_APP_BACKEND_URL=https://${BACK}#" "$BASE/frontend/.env"
sed -i -E "s#^BACKEND_URL=.*#BACKEND_URL=https://${BACK}#; s#^FRONTEND_URL=.*#FRONTEND_URL=https://${FRONT}#" "$BASE/backend/.env"
grep -q '^REACT_APP_BACKEND_URL=' "$BASE/frontend/.env" || echo "REACT_APP_BACKEND_URL=https://${BACK}" >> "$BASE/frontend/.env"

# ---- rebuild do frontend (a URL do backend é embutida no build) ------------------------------
echo "rebuild do frontend (pode levar alguns minutos)..."
sudo -u deploy -H bash -lc "cd '$BASE/frontend' && npm run build"

# ---- nginx -----------------------------------------------------------------------------------
write_site() { # nome host porta
cat > "/etc/nginx/sites-available/$1" <<END
server {
  server_name $2;
  client_max_body_size 50M;
  location / {
    proxy_pass http://127.0.0.1:$3;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_cache_bypass \$http_upgrade;
  }
}
END
ln -sf "/etc/nginx/sites-available/$1" "/etc/nginx/sites-enabled/$1"
}
write_site "${INST}-backend" "$BACK" "$BPORT"
write_site "${INST}-frontend" "$FRONT" "$FPORT"
nginx -t && systemctl reload nginx

# ---- certificados ----------------------------------------------------------------------------
if [[ -z "${WARN:-}" ]]; then
  certbot --nginx --non-interactive --agree-tos -m "$EMAIL" --redirect -d "$BACK" -d "$FRONT" || echo "certbot falhou — verifique o DNS e rode: certbot --nginx -d $BACK -d $FRONT"
else
  echo "certbot NÃO executado (DNS ainda não aponta para esta VM). Depois de ajustar o DNS: certbot --nginx --redirect -d $BACK -d $FRONT -m $EMAIL --agree-tos -n"
fi

# ---- pm2 -------------------------------------------------------------------------------------
sudo -u deploy -H bash -lc "pm2 restart ${INST}-backend ${INST}-frontend && pm2 save" || sudo -u deploy -H bash -lc "pm2 restart all"

echo
echo "Concluído. Painel: https://$FRONT   API: https://$BACK"
echo "Se algo der errado, os arquivos originais estão em $BK."
