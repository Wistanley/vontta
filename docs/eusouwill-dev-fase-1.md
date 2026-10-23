# @eusouwill.dev — Fase 1

Configuração criada a pedido de Will em 22/10/2026, com base no calendário de cinco semanas enviado na conversa. O período original de 05/10 a 06/11 foi deslocado para **26/10 a 27/11/2026**, preservando a ordem dos 15 temas. Criação às **09:00 de segunda, quarta e sexta**, em `America/Sao_Paulo`. O horário inicia a produção das artes; a publicação no Instagram continua manual.

O perfil usa a conexão de texto padrão existente e a conexão OpenAI para os revisores e imagens (`gpt-image-2.5-flare`, presente no catálogo da conta durante a configuração). Aprovação final **humana**. Bot/chat ainda precisam ser cadastrados na interface. O sistema não publicará ou fixará conteúdo na rede social.

## Posicionamento

Os próximos posts, carrosséis e stories seguem o [padrão visual escolhido no piloto](PADRAO-VISUAL-EUSOUWILL.md): Poppins Semibold 600 nos títulos, Medium 500 no apoio e Regular 400 no corpo; fotografias reais com origem e licença registradas; paleta grafite, branco suave e verde menta; texto alinhado à esquerda e margens generosas. Não usar títulos em 800/900 nem fotografias sintéticas.

Transformar operações empresariais usando software, integração, automação, dados e IA. Público principal: empresários e gestores que decidem sobre tecnologia. Voz direta, didática e consultiva. Os quatro territórios são **Operações Agênticas**, **Por trás do Sistema**, **Eu Automatizaria Isso** e **Construindo com IA**.

Mix de referência do material: 30% operações e negócios, 25% IA e agentes, 20% sistemas e arquitetura, 15% cases e bastidores, 10% visão/opinião. Essas proporções são orientação editorial, não uma cota matemática de cada postagem.

O framework de maturidade e os níveis de autonomia são apresentados como lentes editoriais de Will, sem alegações de padrão oficial, validação científica ou autoria exclusiva. Nada de listas genéricas de ferramentas, notícias sem contexto, números inventados, promessas de retorno ou cases sem fonte.

Identidade visual inicial: grafite, branco suave e verde menta, tipografia sans-serif legível, composição editorial e diagramas simples. Essa direção foi proposta para dar unidade ao início; não representa um manual de marca anterior fornecido pelo usuário. Sem retratos, telas de cliente ou bastidores sintéticos apresentados como reais.

## Calendário de criação

| Data, 09:00 | Pauta                                                                    | Referência original                  |
| ----------- | ------------------------------------------------------------------------ | ------------------------------------ |
| 26/10       | Quem é o Will? De desenvolvedor a Operações Agênticas                    | Fixado 01, 10 telas                  |
| 28/10       | O que é uma Operação Agêntica?                                           | Fixado 02                            |
| 30/10       | Como eu posso transformar uma operação                                   | Fixado 03                            |
| 02/11       | Sua empresa talvez ainda não precise de IA                               | Reel                                 |
| 04/11       | Os 6 níveis de maturidade de uma empresa                                 | Carrossel                            |
| 06/11       | Hoje qualquer pessoa consegue criar um sistema com IA. E isso muda tudo. | Reel                                 |
| 09/11       | Automação não é agente de IA                                             | Reel                                 |
| 11/11       | Por trás de um sistema real que automatizamos                            | Bastidor/case, aguarda material real |
| 13/11       | Seu problema provavelmente não é falta de IA                             | Reel                                 |
| 16/11       | 5 coisas que eu analisaria antes de colocar IA em uma empresa            | Carrossel                            |
| 18/11       | A IA não deveria tomar todas as decisões da sua empresa                  | Reel                                 |
| 20/11       | Antes → Sistema → Automação → Resultado                                  | Case, aguarda material real          |
| 23/11       | Seu funcionário abre quantos sistemas para fazer uma única tarefa?       | Reel                                 |
| 25/11       | Se eu entrasse hoje em uma empresa tradicional, começaria por aqui       | Carrossel                            |
| 27/11       | O que estou construindo com IA na prática                                | Reel/bastidor, aguarda material real |

As **15 pautas estão no Criador de posts**, com criação individual agendada e metadados de semana, pilar, formato de origem, fixação e Stories de apoio. Doze possuem roteiro de telas e legenda preparados; começam na etapa de imagens. Os três cases/bastidores aguardam informações reais antes de usar APIs. Em cada um, o formulário **Informações e fontes reais do projeto** libera a produção após o envio do material.

As versões estáticas dos Reels são adaptações em carrossel. Os **7 roteiros originais de vídeo** também foram cadastrados no **Estúdio de conteúdo**, nas datas correspondentes. É preciso gravar esses vídeos: o criador não gera Reels. O último é uma pauta de gravação condicionada ao material real. A pessoa escolhe qual formato publicar naquela data; os dois registros não significam duas postagens obrigatórias.

Há **5 rascunhos adicionais de Stories**, um por semana, sem produção automática: são apoio opcional para uso manual e não aumentam as três criações automáticas por semana. Stories devem ser simples, com fotos/trechos verdadeiros quando necessários.

## Operação

- **Agendas** lista as pautas com data definida. Alterar o horário no detalhe do rascunho não muda o restante do ciclo.
- **Antecipar e produzir agora** inicia uma pauta antes do horário, por comando explícito. Rascunhos comuns continuam manuais.
- A referência de até 10 telas foi preservada; as revisões e a entrega continuam por etapas persistidas.
- O cron existente processa a pauta quando vence o horário, mesmo com o navegador fechado. Material pendente bloqueia uma pauta sem consumir cota, e o worker pode continuar as outras.
- Depois de todos os revisores, Will aprova antes de receber no Telegram. As primeiras três pautas precisam ser fixadas manualmente no Instagram.
- O ciclo é finito. Depois de 27/11, usar resultados reais de retenção, compartilhamentos e conversas para planejar a fase seguinte. Não foram criadas repetições indefinidas nem publicações retroativas.

Definições editoriais: `content/eusouwill-dev.ts`. Cadastro idempotente, com IDs estáveis e preservação de registros existentes: `scripts/configure-will-profile.ts`. A execução sem `--apply` apenas confere a configuração; com `--apply`, insere os registros ainda ausentes na conta de Will confirmada pelo script. O script usa a CLI autenticada do Supabase, não inclui segredos no código e não é parte do frontend.

Relatório local: `artifacts/diagnostics/eusouwill-configuration.json`. Backup dos registros anteriores à inserção: `artifacts/diagnostics/eusouwill-before-config.json`.
