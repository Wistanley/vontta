# Vontta Radar no n8n

Os sete arquivos JSON são workflows importáveis. São entregues desativados para permitir conferir as conexões antes da primeira coleta paga. O worker também mantém as agendas no banco: os identificadores diários impedem uma segunda coleta/roteiro pelo mesmo agendamento.

1. Aplique as migrações `20261025120000_content_radar.sql` e `20261025123000_radar_feedback.sql` no Supabase existente.
2. No servidor, copie `worker/.env.radar.example` para `worker/.env.radar` e preencha as variáveis privadas. A chave de cifragem deve ser a mesma do Vontta. Não gere outra se já existem conexões salvas.
3. Execute `docker compose -f worker/compose.radar.yml up -d --build` na raiz do projeto. O worker expõe apenas `127.0.0.1:8795`; não abra uma porta pública para FFmpeg.
4. Conecte o container n8n existente à rede Docker `vontta-radar`. Preserve essa rede na configuração de implantação do seu n8n caso ele seja recriado. O endereço interno é `http://vontta-radar:8795/internal/radar`.
5. No n8n, crie uma credencial **Header Auth**, ID `vonttaRadarInternal`, nome `Vontta Radar · Worker`, cabeçalho `Authorization`, valor `Bearer <RADAR_INTERNAL_TOKEN>`. Ao importar pela interface, selecione essa credencial em cada nó HTTP.
6. Importe os sete JSONs. Execute `operations` para validar a ligação. Ative as agendas quando desejar; a coleta e as gerações automáticas respeitam também os controles do perfil no Vontta.

| Fluxo | Agenda (São Paulo) | Ação |
|---|---|---|
| collect | diariamente, 08:00 | Enfileira coleta se habilitada; token e Actor são os cadastrados no Vontta |
| rank | diariamente, 08:15 | Recalcula oportunidades e relatório |
| analyze | diariamente, 08:30 | Classifica e enfileira destaques se análise automática habilitada |
| scripts | segunda, quarta e sexta, 09:00 | Gera um roteiro de nova referência analisada, se habilitado |
| daily | diariamente, 09:00 | Resumo das últimas 24 horas |
| weekly | segunda, 09:15 | Resumo dos últimos sete dias |
| operations | diariamente, 03:00 | Retenção de mídia e verificação das agendas |

O horário de coleta configurado no Vontta é seguido pelo agendador nativo do worker. Se utilizar somente o n8n para disparos, ajuste também seu nó de agenda. Nenhum workflow envia uma publicação ao Telegram: a entrega continua passando pelos revisores e pela opção de aprovação do perfil no criador existente.

## Apify

Cadastre o token no app, em **Criador de posts → Radar → Conexões**. Escolha um Actor disponível para sua conta, confira seu contrato de entrada e forneça o JSON correspondente. São aceitos `{{username}}`, `{{url}}` e `{{limit}}`, inclusive em arrays/objetos aninhados. `{{limit}}` sozinho vira um número.

O worker inicia cada Actor de forma assíncrona, grava o run ID, acompanha o estado e lê no máximo o histórico configurado. Envia `maxTotalChargeUsd` como limite solicitado ao Apify; cobrança, limites mínimos e suporte a essa opção dependem do Actor. Valores não informados permanecem desconhecidos. Um início ambíguo exige conferir as execuções no Apify antes de repetir, evitando iniciar cobranças duplicadas automaticamente.

O adaptador reconhece campos usuais de Instagram/TikTok e rejeita autores/plataformas divergentes. Um Actor com outro contrato deve receber um adaptador explícito; retorno vazio não é sucesso de coleta. Mídia privada, expirada ou indisponível produz análise parcial. Não há contorno de login ou de restrições da plataforma.
