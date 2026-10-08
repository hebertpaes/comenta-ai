# Comenta AI – Superpoderes para o WhatsApp Web

Extensão para Google Chrome (Manifest V3) que adiciona uma barra lateral ao **WhatsApp Web** com ferramentas de atendimento, vendas e produtividade — no estilo do WaSpeed, porém de código aberto e com assistente de IA (Claude).

> Tudo roda no seu navegador. Nenhuma mensagem passa por servidores da extensão. A chave da API de IA fica salva apenas localmente.

## Funcionalidades

| Painel | O que faz |
| --- | --- |
| 📊 **Painel** | Estatísticas de envios, respostas automáticas, não lidas, gráfico dos últimos 7 dias e atalhos. |
| 🗂 **CRM Kanban** | Organize conversas em colunas (leads, em atendimento, proposta, fechado…) com arrastar-e-soltar, anotações, envio em lote por coluna, exportação CSV e inclusão automática de novas conversas. |
| 📣 **Transmissão em massa** | Envie mensagem ou funil para listas (colar números, CSV, conversas, membros de grupo, coluna do CRM, aba) com variáveis `{nome}`, spintax `{Olá\|Oi}`, intervalos aleatórios, pausa por lote, limite diário, simulação de digitação, pausar/parar e relatório exportável. |
| 📅 **Agendamentos** | Mensagens/funis agendados para uma conversa, com repetição diária, semanal ou mensal. |
| ⚡ **Respostas rápidas** | Atalhos `/atalho` direto na caixa de texto do WhatsApp (com navegação por teclado), com variáveis e anexos. Importação/exportação JSON. |
| 🔀 **Funis** | Sequências de passos (texto, arquivo, áudio PTT, espera) reutilizáveis em transmissões, agendamentos, chatbot e CRM. |
| 🤖 **Chatbot** | Gatilhos por palavra-chave (contém, exato, começa com, regex, qualquer), horário de atendimento, mensagem de boas-vindas para novos contatos, aviso de fora do expediente, cooldown por contato, resposta por funil ou por IA. |
| ✨ **Assistente de IA** | Resumir conversa, sugerir resposta, reescrever (formal, amigável, mais curto, corrigir, traduzir…) e criar mensagens/campanhas com Claude. |
| ⏰ **Lembretes** | Lembretes ligados a conversas com notificação do navegador. |
| 🗃 **Abas & filtros** | Filtros (não lidas, grupos, contatos, fixadas, arquivadas, etiquetas do WhatsApp Business) e abas personalizadas de conversas. |
| 👥 **Contatos & grupos** | Extrair membros de grupos, exportar contatos e conversas em CSV, verificar quais números têm WhatsApp. |
| 📝 **Notas** | Anotações internas por conversa (aparecem também nos cards do CRM). |
| 👁 **Modo privacidade** | Desfoca mensagens, lista de conversas e fotos (revela ao passar o mouse). Atalho `Alt+Shift+P`. |
| ⚙️ **Configurações** | Privacidade, intervalos da transmissão, IA (chave, modelo, tom, descrição do negócio), webhook para integrações (n8n, Make, Zapier…), backup/restauração JSON. |

## Instalação (modo desenvolvedor)

1. Baixe/clone este repositório.
2. No Chrome, abra `chrome://extensions`, ative **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e escolha a pasta `extension/`.
4. Abra (ou recarregue) o <https://web.whatsapp.com>. A barra lateral roxa aparece à esquerda.

Requer Chrome 111+ (ou Edge/Brave equivalentes).

### Assistente de IA

1. Crie uma chave em <https://console.anthropic.com/settings/keys>.
2. Na extensão: painel **✨ Assistente de IA** (ou **Configurações › Inteligência artificial**) e cole a chave.
3. Opcional: descreva o seu negócio e o tom de voz para respostas mais alinhadas.

A chave é usada diretamente do navegador para `api.anthropic.com`; o custo é cobrado na sua conta Anthropic.

## Estrutura

```
extension/
├── manifest.json
├── vendor/wppconnect-wa.js        # WPPConnect/WA-JS (Apache-2.0) – acesso às funções do WhatsApp Web
├── src/page/                      # roda no contexto da página (world MAIN)
│   ├── pre.js                     # configura a wa-js antes de carregar
│   └── bridge.js                  # expõe métodos/eventos via postMessage
├── src/content/                   # content script (world isolado)
│   ├── core.js                    # utilitários, armazenamento, cliente da ponte, envio
│   ├── ui.js / ui.css             # barra lateral, gaveta, modais (Shadow DOM)
│   ├── page.css                   # ajustes na página do WhatsApp + modo privacidade
│   ├── features/*.js              # um arquivo por painel
│   └── main.js                    # inicialização
├── src/background/sw.js           # service worker: API de IA, webhook, notificações
├── popup/                         # popup do ícone da extensão
└── options/                       # página de opções
```

Sem etapa de build: é JavaScript puro. Para atualizar a biblioteca do WhatsApp, substitua `vendor/wppconnect-wa.js` pelo `dist/wppconnect-wa.js` de uma versão mais nova do pacote `@wppconnect/wa-js`.

## Variáveis e spintax

Em qualquer mensagem: `{nome}`, `{primeiro_nome}`, `{saudacao}` (Bom dia/Boa tarde/Boa noite), `{numero}`, `{data}`, `{hora}`. Variações aleatórias: `{Olá|Oi|E aí}`.

## Webhook

Com uma URL configurada, a extensão envia `POST` com JSON `{ "event", "data", "at" }` nos eventos `new_message`, `message_sent` (ativáveis) e `broadcast_finished`.

## Aviso

Este projeto não é afiliado ao WhatsApp/Meta. O WhatsApp Web muda com frequência e recursos podem parar de funcionar até a biblioteca ser atualizada. Envios em massa não solicitados violam os termos do WhatsApp e podem causar o bloqueio da sua conta — use com responsabilidade e apenas com contatos que autorizaram receber suas mensagens.

## Licenças

Código da extensão: MIT. `vendor/wppconnect-wa.js` é do projeto [WPPConnect/WA-JS](https://github.com/wppconnect-team/wa-js), licenciado sob Apache-2.0 (ver `extension/vendor/WA-JS-LICENSE`). Ícones da interface baseados no estilo [Lucide](https://lucide.dev) (ISC).
