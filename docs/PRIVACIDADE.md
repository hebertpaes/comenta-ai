# Política de Privacidade – Comenta AI

**Última atualização:** 9 de outubro de 2026

O **Comenta AI** é uma extensão para o navegador Google Chrome que adiciona ferramentas de produtividade ao WhatsApp Web (CRM, transmissões, agendamentos, respostas rápidas, chatbot, assistente de IA, lembretes, modo privacidade). Esta política explica quais dados a extensão trata e como.

## Resumo

- **Não coletamos, não armazenamos em servidores e não vendemos dados.** O desenvolvedor da extensão não recebe nenhuma informação sua.
- Todos os dados ficam **no seu navegador**, no armazenamento local da extensão (`chrome.storage.local`).
- Conteúdo de conversas só sai do seu computador **quando você usa um recurso que exige isso** — o assistente de IA (enviado diretamente à API da Anthropic com a **sua** chave) ou um webhook que **você** configurou.

## Dados tratados localmente

A extensão guarda no seu navegador, exclusivamente para o funcionamento dos recursos:

- Configurações e preferências;
- Respostas rápidas, funis, gatilhos do chatbot, lembretes, abas e notas que você cria;
- Cards do CRM (nome e número do contato, coluna, datas) e notas por conversa;
- Agendamentos e seus anexos (arquivos escolhidos por você, armazenados em formato base64);
- Relatórios de transmissões (nome/número do destinatário e status do envio);
- Estatísticas de uso (contadores de mensagens enviadas por dia);
- Sua chave de API da Anthropic e a URL de webhook, se você as informar.

Esses dados **nunca** são transmitidos ao desenvolvedor. Você pode exportá-los (Configurações › Backup) ou apagá-los a qualquer momento (Configurações › Backup › Apagar todos os dados, ou removendo a extensão).

## Dados enviados a terceiros (somente por sua ação)

### Anthropic (assistente de IA)

Quando você usa o assistente de IA (resumir conversa, sugerir resposta, reescrever texto, criar mensagem) ou ativa um gatilho de chatbot do tipo "resposta por IA", a extensão envia **diretamente do seu navegador para `https://api.anthropic.com`**:

- o texto necessário para a tarefa (por exemplo, as últimas mensagens da conversa aberta ou o texto que você digitou);
- a descrição do seu negócio e o tom de voz que você configurou;
- a sua chave de API, no cabeçalho de autenticação.

O uso é faturado na sua conta Anthropic e regido pelos [termos](https://www.anthropic.com/legal/consumer-terms) e pela [política de privacidade](https://www.anthropic.com/legal/privacy) da Anthropic. O desenvolvedor da extensão não tem acesso a esses dados nem à sua chave. Se você não configurar uma chave, nada é enviado.

### Webhook (opcional)

Se você informar uma URL de webhook em Configurações › Webhook, a extensão enviará requisições HTTP `POST` **para a URL que você escolheu** com os eventos que você ativar (mensagem recebida, mensagem enviada pela extensão, transmissão concluída). O conteúdo pode incluir texto de mensagens e números de telefone. Você é responsável pelo destino configurado. Por padrão, nenhum webhook está ativo.

### WhatsApp

A extensão funciona dentro do WhatsApp Web (`https://web.whatsapp.com`) e usa a sessão já autenticada no seu navegador para ler conversas e enviar mensagens **em seu nome, quando você aciona um recurso** (envio, transmissão, agendamento, resposta automática). Nenhum dado é enviado a servidores da extensão. O WhatsApp é um serviço da Meta Platforms, com termos e políticas próprios.

## Permissões solicitadas

| Permissão | Para quê |
| --- | --- |
| `storage`, `unlimitedStorage` | Guardar suas configurações, CRM, funis, agendamentos e anexos no navegador. |
| `notifications` | Exibir lembretes no horário programado. |
| Acesso a `web.whatsapp.com` | Exibir a barra lateral e integrar-se ao WhatsApp Web. |
| Acesso a `api.anthropic.com` | Chamar a API de IA com a sua chave, quando você usar o assistente. |

A extensão não contém código remoto: todo o código é empacotado e revisado pela Chrome Web Store.

## Uso limitado

O uso de dados do usuário pela extensão segue a [Política de Dados do Usuário da Chrome Web Store](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), incluindo os requisitos de uso limitado: os dados são usados apenas para fornecer os recursos descritos, não são vendidos, não são usados para publicidade nem para avaliação de crédito, e não são transferidos a terceiros exceto conforme descrito acima (por sua ação).

## Segurança

Os dados ficam no perfil do seu navegador e estão protegidos pelas proteções do próprio Chrome. A chave de API é armazenada localmente e enviada apenas para `api.anthropic.com` por HTTPS. Recomendamos criar uma chave exclusiva para a extensão e revogá-la em caso de suspeita de uso indevido.

## Responsabilidade de uso

Envios em massa e respostas automáticas devem respeitar os Termos de Serviço do WhatsApp e a legislação aplicável (incluindo a LGPD). Envie mensagens apenas a contatos que consentiram em recebê-las.

## Crianças

A extensão não se destina a menores de 13 anos e não coleta intencionalmente dados de crianças.

## Alterações

Esta política pode ser atualizada. A versão vigente é sempre publicada neste endereço, com a data de atualização.

## Contato

Dúvidas sobre privacidade: abra uma *issue* em <https://github.com/hebertpaes/comenta-ai/issues> ou escreva para **[preencha seu e-mail de contato]**.
