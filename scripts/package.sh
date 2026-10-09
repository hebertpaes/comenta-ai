#!/usr/bin/env bash
# Gera o pacote .zip da extensão para envio à Chrome Web Store.
# Uso: scripts/package.sh  → store/comenta-ai-v<versão>.zip
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION=$(python3 -c "import json;print(json.load(open('extension/manifest.json'))['version'])")
OUT="store/comenta-ai-v${VERSION}.zip"
mkdir -p store
rm -f "$OUT"

# Validações rápidas antes de empacotar
python3 - <<'EOF'
import json, sys
m = json.load(open('extension/manifest.json'))
errs = []
if len(m['name']) > 45: errs.append(f"name tem {len(m['name'])} caracteres (máx. 45)")
if len(m['description']) > 132: errs.append(f"description tem {len(m['description'])} caracteres (máx. 132)")
for size in ('16', '32', '48', '128'):
    import os
    if not os.path.exists(f"extension/{m['icons'][size]}"): errs.append(f"ícone {size} ausente")
if errs:
    print('ERROS:', *errs, sep='\n  '); sys.exit(1)
print(f"manifest ok: {m['name']} v{m['version']}")
EOF
for f in $(find extension -name "*.js" -not -path "*/vendor/*"); do node --check "$f"; done

(cd extension && zip -qr "../$OUT" . -x ".*" -x "*/.*" -x "*.map")
echo "Pacote gerado: $OUT ($(du -h "$OUT" | cut -f1))"
unzip -l "$OUT" | tail -1
