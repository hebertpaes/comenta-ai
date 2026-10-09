# Textos e dados da listagem na Chrome Web Store

Copie e cole no painel do desenvolvedor (<https://chrome.google.com/webstore/devconsole>). Tudo em **português (Brasil)**.

## Produto

| Campo | Valor |
| --- | --- |
| **Nome** (≤ 45 caracteres) | `Comenta AI – Superpoderes para o WhatsApp` (41) |
| **Resumo / descrição curta** (≤ 132) | `CRM Kanban, transmissão em massa, agendamentos, respostas rápidas, funis, chatbot, IA e modo privacidade no WhatsApp Web.` |
| **Categoria** | Produtividade → Comunicação |
| **Idioma** | Português (Brasil) |
| **Site oficial** | `https://github.com/hebertpaes/comenta-ai` (ou a página do GitHub Pages) |
| **URL de suporte** | `https://github.com/hebertpaes/comenta-ai/issues` |
| **Política de privacidade** | URL pública de `docs/PRIVACIDADE.md` (ver `PUBLICACAO.md`) |

## Descrição detalhada

```
Comenta AI adiciona uma barra lateral ao WhatsApp Web com as ferramentas que uma equipe de atendimento e vendas precisa — sem sair da conversa e sem enviar seus dados para servidores de terceiros.

🗂 CRM KANBAN
Organize conversas em colunas (novos leads, em atendimento, proposta, fechado…), arraste cards entre etapas, faça anotações internas, envie mensagem ou funil para toda a coluna e exporte em CSV.

📣 TRANSMISSÃO EM MASSA
Envie uma mensagem ou um funil para listas de contatos (números colados, CSV, conversas, membros de grupo, coluna do CRM ou aba). Variáveis como {nome} e {saudacao}, variações aleatórias de texto, intervalos aleatórios entre envios, pausa por lote, limite diário, simulação de digitação, pausar/retomar e relatório com reenvio das falhas.

📅 AGENDAMENTOS
Programe mensagens, arquivos ou funis para uma conversa, uma única vez ou com repetição diária, semanal ou mensal.

⚡ RESPOSTAS RÁPIDAS
Digite /atalho na caixa de mensagem e escolha a resposta com o teclado. Suporta variáveis e anexos. Importe e exporte em JSON.

🔀 FUNIS
Monte sequências de texto, arquivos, áudios e pausas e reutilize em transmissões, agendamentos, chatbot e CRM.

🤖 CHATBOT
Respostas automáticas por palavra-chave (contém, exato, começa com, regex), horário de atendimento, mensagem de boas-vindas para novos contatos, aviso de fora do expediente, intervalo mínimo por contato e resposta gerada por IA.

✨ ASSISTENTE DE IA
Resuma a conversa aberta, peça sugestões de resposta, reescreva textos (mais formal, mais amigável, mais curto, corrigir, traduzir) e crie mensagens de campanha. Usa os modelos Claude com a sua própria chave de API da Anthropic — você controla o custo e os dados.

⏰ LEMBRETES · 🗃 ABAS E FILTROS · 👥 CONTATOS E GRUPOS · 📝 NOTAS
Lembretes com notificação, filtros (não lidas, grupos, etiquetas) e abas personalizadas, extração de membros de grupos, exportação de contatos, verificação de números com WhatsApp e notas internas por conversa.

👁 MODO PRIVACIDADE
Desfoque mensagens, lista de conversas e fotos para atender em locais públicos ou compartilhar a tela (Alt+Shift+P).

🔒 PRIVACIDADE
Todos os dados ficam no seu navegador. Nenhuma mensagem passa por servidores da extensão. Backup e restauração em JSON. Código aberto: github.com/hebertpaes/comenta-ai

⚠️ Comenta AI é um projeto independente e não é afiliado ao WhatsApp ou à Meta Platforms. Envie mensagens apenas a contatos que autorizaram recebê-las — envios em massa não solicitados violam os termos do WhatsApp e podem causar o bloqueio da conta.
```

## Recursos gráficos

| Item | Arquivo | Especificação |
| --- | --- | --- |
| Ícone da loja | `store/assets/store-icon-128.png` | 128×128 PNG sem transparência |
| Capturas de tela (1 a 5) | `store/assets/screenshot-*.png` | 1280×800 PNG, sem transparência |
| Tile promocional pequeno (obrigatório) | `store/assets/promo-small-440x280.png` | 440×280 PNG |
| Tile marquee (opcional) | `store/assets/promo-marquee-1400x560.png` | 1400×560 PNG |

## Aba "Práticas de privacidade"

**Finalidade única (single purpose):**

```
Adicionar ao WhatsApp Web um conjunto integrado de ferramentas de atendimento e vendas (CRM, envio e agendamento de mensagens, respostas automáticas, assistente de IA e modo privacidade), executado inteiramente no navegador do usuário.
```

**Justificativas de permissões:**

| Permissão | Justificativa |
| --- | --- |
| `storage` | Salvar configurações, respostas rápidas, funis, cards do CRM, agendamentos, lembretes e estatísticas do usuário no próprio navegador. |
| `unlimitedStorage` | Agendamentos e funis podem conter anexos (imagens, PDFs, áudios) escolhidos pelo usuário, armazenados localmente em base64, o que pode exceder a cota padrão. |
| `notifications` | Exibir ao usuário os lembretes que ele próprio criou, no horário programado. |
| Host `https://web.whatsapp.com/*` | A extensão só funciona dentro do WhatsApp Web: injeta a barra lateral e integra-se à sessão já autenticada do usuário para listar conversas e enviar as mensagens que ele solicitar. |
| Host `https://api.anthropic.com/*` | Chamar a API de IA (Claude) a partir do service worker com a chave de API fornecida pelo usuário, quando ele usa o assistente de IA. |
| Código remoto | **Não.** Todo o código está no pacote (a biblioteca WA-JS é empacotada em `vendor/`). |

**Uso de dados (marcar):**

- ☑ Comunicações pessoais — texto de conversas é lido localmente para exibir CRM/filtros e, **somente por ação do usuário**, enviado à API da Anthropic (assistente de IA) ou a um webhook configurado pelo usuário.
- ☑ Informações de identificação pessoal — nomes e números de telefone dos contatos são armazenados localmente (CRM, listas de transmissão, relatórios) e exportáveis pelo usuário.
- ☑ Informações de autenticação — a chave de API da Anthropic informada pelo usuário é armazenada localmente e enviada apenas a `api.anthropic.com`.

**Certificações (marcar as três):** não vendo dados a terceiros; não uso dados para fins não relacionados à finalidade única; não uso dados para determinar capacidade de crédito ou empréstimos.

## Distribuição

- Visibilidade: **Pública** (ou "Não listada" para um lançamento controlado).
- Regiões: todas (ou Brasil).
- Preço: gratuito.
