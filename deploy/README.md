# Runbook – VM Oracle + comenta.com.br

Objetivo: na VM Oracle (São Paulo) que hoje serve o app do `intsoft-app` em `intsoft.com.br`, passar o app para **app.comenta.com.br** (painel) e **api.comenta.com.br** (API), e publicar na raiz **comenta.com.br** o site da extensão Comenta AI (página, política de privacidade e download do .zip).

Feito para ser executado por uma sessão do Claude com **Claude in Chrome** logado em `cloud.oracle.com` e `dash.cloudflare.com` (ou por você, manualmente). Nada aqui exige a OCI CLI.

## Arquivos

| Arquivo | Função |
| --- | --- |
| `deploy/alterar-dominio.sh` | Troca o domínio de uma instância do instalador (.env, rebuild do frontend, nginx, certbot, pm2). |
| `deploy/instalar-site.sh` | **Autocontido**: instala nginx/certbot (se faltarem), libera 80/443 no iptables, grava o site e emite o certificado. Gerado por `scripts/build-deploy.sh`. |
| `deploy/site/` | HTML do site (referência; já embutido no script acima). |

## Passo 1 – Descobrir o estado atual da VM (console OCI)

1. Abrir a instância: Compute → Instances → `…fkt2houqrctxob6yxeuf66mgzxmqja4xca6pwq` (região `sa-saopaulo-1`). Anotar o **Public IPv4**.
2. Abrir um terminal na VM. Opções, da mais simples para a menos:
   - **Console Connection → Cloud Shell**: o console abre um shell em `ubuntu@<vm>` (precisa de uma chave SSH: a aba *Console connection* permite criar uma e usar o Cloud Shell em um clique).
   - **Run command** (Compute → Instances → instância → *Run command*, requer o plugin "Run Command" do Oracle Cloud Agent ativo em *Oracle Cloud Agent*): roda um script como root sem SSH — útil para colar `alterar-dominio.sh` e `instalar-site.sh`.
   - SSH do seu computador com a chave da VM.
3. No terminal, levantar o que existe:
   ```bash
   ls /home/deploy                                   # nome da(s) instância(s) do instalador
   grep -H URL /home/deploy/*/backend/.env           # domínios atuais (intsoft.com.br) 
   ls /etc/nginx/sites-enabled                       # sites do nginx
   sudo -u deploy pm2 ls                             # processos
   ```
   Anotar `<instancia>`, o host atual do frontend e do backend.

## Passo 2 – DNS no Cloudflare (`dash.cloudflare.com/52e0…/comenta.com.br` → DNS → Records)

Criar **4 registros A**, todos para o IP público da VM, **Proxy status: DNS only (nuvem cinza)** — necessário para o certbot validar:

| Tipo | Nome | Conteúdo | Proxy |
| --- | --- | --- | --- |
| A | `@` (comenta.com.br) | IP da VM | DNS only |
| A | `www` | IP da VM | DNS only |
| A | `app` | IP da VM | DNS only |
| A | `api` | IP da VM | DNS only |

Se já existir A/CNAME em `@` ou `www` apontando para outro site, **confirmar com o usuário** antes de trocar. Depois dos certificados emitidos, pode ligar o proxy (nuvem laranja) em `@`/`www` com SSL/TLS = *Full (strict)*; para `app`/`api` recomendo manter DNS only (WebSocket/uploads grandes).

Enquanto isso, em **intsoft.com.br** nada precisa mudar imediatamente; quando o app estiver respondendo em `app.comenta.com.br`, remova ou redirecione os registros antigos.

## Passo 3 – Trocar o domínio do app

Na VM (root), colar `deploy/alterar-dominio.sh` e rodar:

```bash
sudo bash alterar-dominio.sh <instancia> app.comenta.com.br api.comenta.com.br <seu-email>
```

O script faz backup em `/root/backup-dominio-<data>/`, só roda o certbot se o DNS já apontar para a VM (senão imprime o comando para rodar depois) e reinicia o pm2. O rebuild do frontend leva alguns minutos.

Verificar pelo navegador: `https://app.comenta.com.br` (tela de login do painel) e `https://api.comenta.com.br` (resposta JSON/“Cannot GET /” é normal).

## Passo 4 – Publicar o site da extensão na raiz

Na VM (root), colar `deploy/instalar-site.sh` (≈20 KB, já contém o HTML) e rodar:

```bash
sudo bash instalar-site.sh comenta.com.br <seu-email> https://github.com/hebertpaes/comenta-ai/releases/download/v1.0.0/comenta-ai-v1.0.0.zip
```

O 3º argumento é opcional: se o repositório/release for privado o download falha e o zip pode ser enviado depois para `/var/www/comenta/download/`.

Verificar: `https://comenta.com.br`, `https://comenta.com.br/privacidade.html` (URL para a Chrome Web Store) e `https://comenta.com.br/download/`.

## Passo 5 – Security List da VCN

Se o site não responder de fora mesmo com o nginx rodando: Networking → VCN da instância → Security Lists → *Default Security List* → Ingress Rules: `0.0.0.0/0` TCP portas `80,443` (o instalador original já deve ter liberado; o script também libera no iptables da VM).

## Depois

- Atualizar a URL da política de privacidade na listagem da loja para `https://comenta.com.br/privacidade.html` e o site para `https://comenta.com.br`.
- Atualizar `README.md`/`docs/index.html` do repositório com os novos endereços.

## Observação de segurança

`instala-app-intsoft/lib/_system.sh` (linha 42) contém um token do GitHub (`ghp_…`) do fornecedor do instalador, em texto puro. Ele está versionado no seu repositório; vale revogar/pedir ao fornecedor e remover do histórico.
