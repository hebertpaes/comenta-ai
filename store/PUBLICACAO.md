# Guia de publicação na Chrome Web Store

## 0. Pré-requisitos

1. Conta Google e **conta de desenvolvedor da Chrome Web Store** — taxa única de US$ 5: <https://chrome.google.com/webstore/devconsole> → "Pagar taxa de registro".
2. Verificar o e-mail de contato do desenvolvedor no painel (Conta → E-mail de contato → Verificar). Sem isso, não é possível publicar.
3. **Política de privacidade em URL pública.** O arquivo está em `docs/PRIVACIDADE.md`. Opções:
   - Ativar o **GitHub Pages** no repositório (Settings → Pages → Branch `main`, pasta `/docs`). A página fica em `https://hebertpaes.github.io/comenta-ai/` e a política em `https://hebertpaes.github.io/comenta-ai/PRIVACIDADE.md` *(se o repositório for privado, o Pages exige plano pago — nesse caso torne o repositório público ou hospede o texto em outro lugar)*.
   - Ou usar o link direto do GitHub (só funciona com repositório público): `https://github.com/hebertpaes/comenta-ai/blob/main/docs/PRIVACIDADE.md`.
   - Preencha o e-mail de contato no final de `docs/PRIVACIDADE.md` antes de publicar.

## 1. Gerar o pacote

```bash
scripts/package.sh
# → store/comenta-ai-v1.0.0.zip
```

O script valida o manifest (nome ≤ 45, descrição ≤ 132, ícones) e a sintaxe dos arquivos antes de compactar. A cada nova versão, aumente `"version"` em `extension/manifest.json` (ex.: `1.0.1`) — a loja só aceita versões maiores que a publicada.

## 2. Criar o item

1. Painel → **Novo item** → envie `store/comenta-ai-v1.0.0.zip`.
2. Aba **Listagem na loja**: cole os textos de `store/LISTAGEM.md` (nome, resumo, descrição detalhada, categoria, idioma, site, suporte) e envie os arquivos de `store/assets/` (ícone, capturas 1280×800, tile 440×280, marquee 1400×560).
3. Aba **Práticas de privacidade**: finalidade única, justificativa de cada permissão, "Código remoto: Não", uso de dados (3 caixas) e as 3 certificações — tudo em `store/LISTAGEM.md`. Informe a URL da política de privacidade.
4. Aba **Distribuição**: visibilidade (Pública ou Não listada), regiões, gratuito.
5. **Enviar para revisão.** Como a extensão lê/escreve em um site de terceiros e usa permissões de host, a revisão costuma levar de alguns dias a ~2 semanas. Você recebe e-mail com o resultado.

## 3. Reduzir risco de rejeição

- **Finalidade única** clara: já descrita; não adicione recursos sem relação com atendimento no WhatsApp.
- **Marca**: o nome usa "para o WhatsApp" (uso descritivo) e a descrição declara que não há afiliação com WhatsApp/Meta. Não use o logotipo do WhatsApp em ícones ou capturas.
- **Spam**: a descrição e a extensão orientam a enviar apenas a contatos que consentiram; há intervalos aleatórios, pausa por lote e limite diário por padrão. Mantenha esse texto.
- **Dados**: a política e as caixas de "uso de dados" devem bater com o que a extensão faz (envio à Anthropic e webhook apenas por ação do usuário). Se mudar isso no código, atualize ambos.
- **Permissões**: não adicione permissões sem justificativa. `tabs`/`alarms` não são necessárias e não estão no manifest.
- Se a revisão pedir um vídeo ou instruções de teste, descreva: "Instale, abra web.whatsapp.com, faça login por QR, use a barra lateral roxa à esquerda. O assistente de IA exige uma chave de API da Anthropic do próprio usuário."

## 4. Depois de publicado

- O link da loja fica `https://chromewebstore.google.com/detail/<id>`. Adicione-o ao `README.md` e à `docs/index.html`.
- Atualizações: altere a versão no manifest, rode `scripts/package.sh`, envie o novo zip em **Pacote → Enviar novo pacote** e publique. Atualizações também passam por revisão.
- O WhatsApp Web muda com frequência: quando algo quebrar, atualize `extension/vendor/wppconnect-wa.js` com o `dist/wppconnect-wa.js` da versão mais nova de `@wppconnect/wa-js` (`npm pack @wppconnect/wa-js`), teste e publique uma nova versão.

## 5. Publicar no GitHub (release)

A branch/PR já contém o zip em `store/`. Para criar uma release:

1. No GitHub: **Releases → Draft a new release** → Tag `v1.0.0` (já existe) → título "Comenta AI v1.0.0".
2. Anexe `store/comenta-ai-v1.0.0.zip` e cole as notas (recursos + instruções de instalação manual).
3. **Publish release**. O link de download passa a aparecer em `docs/index.html` → "releases".
