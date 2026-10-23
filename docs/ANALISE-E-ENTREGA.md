# Análise e evolução do Vontta

## Objetivo

Transformar o planejador em um espaço pessoal de operação de um desenvolvedor que vende B2B: rotina, projetos de clientes, produção de conteúdo para Instagram e finanças. Público de conteúdo: empresários e gestores interessados em sistemas, aplicativos, sites e implantação de IA.

## Diagnóstico da versão anterior

| Área             | Situação encontrada                                                                                                            | Mudança implementada                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Navegação mobile | Layout preso a `h-screen`, cabeçalhos e áreas com rolagens internas concorrentes                                               | Rolagem natural da página, cabeçalho estático e navegação inferior com espaço reservado e safe area                                |
| Projetos         | Apenas nome e setor, dentro de configurações                                                                                   | Área dedicada com cliente, situação, orçamento, prazo, escopo, documentação, etapas e atividades vinculadas                        |
| Clientes         | Sem cadastro próprio                                                                                                           | Contato, empresa, e-mail, telefone e observações; vínculo com projetos e proteção contra exclusão de clientes vinculados           |
| Conteúdo         | Sem fluxo editorial                                                                                                            | Ideia → Roteiro → Gravar → Editar → Agendado → Publicado; formatos, pilares B2B, calendário, legenda e CTA                         |
| Gravação         | Sem apoio para transformar ideia em vídeo                                                                                      | Checklist, roteiro e teleprompter com fonte e velocidade ajustáveis; passagem para edição                                          |
| Financeiro       | Custos e rendimentos sem competência individual, sem distinção de liquidado/previsto; botão para incrementar todas as parcelas | Lançamentos com vencimento, mês, receita/despesa, categoria, situação, recorrência e projeto; saldo realizado separado da previsão |
| IA               | SDK do Gemini no navegador; segredo injetado pela configuração do Vite                                                         | API Node no servidor, sessão Supabase validada, limite compartilhado de uso e saída estruturada validada                           |
| Inicialização    | Uso de `process.env` no navegador e cliente Supabase criado com URL vazia                                                      | Variáveis Vite apropriadas e tela funcional sem credenciais; demonstração explícita e separada da conta real                       |
| Estilos          | Tailwind por CDN e import map concorrendo com o bundler                                                                        | CSS compilado localmente, Tailwind 4, dependências pelo npm e carregamento adiado da versão anterior                               |
| Validação        | Sem scripts de testes ou verificação de tipos                                                                                  | Typecheck, testes de domínio/API e testes de fluxos no navegador                                                                   |

## Funcionamento entregue

- **Visão geral:** prioridades de hoje, entregas próximas, conteúdos em produção e resumo financeiro do mês, calculados a partir dos registros.
- **Agenda:** dia, semana, atrasadas, horários, duração, prioridade, conclusão e vínculo com projeto.
- **Projetos:** cadastro e edição, busca por projeto/empresa, filtros, detalhes, etapas com prazo e conclusão, cliente, documentação e receitas vinculadas.
- **Clientes:** cadastro, edição, busca, contato e contexto comercial.
- **Estúdio:** criação/edição de conteúdo, quadro por etapa, filtro por formato, busca, calendário mensal e itens ainda sem data. Meta de publicações por semana configurável.
- **IA:** sugestões de pautas B2B, roteiro com gancho/corpo/CTA/legenda e prioridades do dia. O usuário revisa e salva cada sugestão. OpenAI, Anthropic ou Google, com modelo/chave definidos pelo próprio usuário nas preferências e opção de padrão administrativo pelo ambiente.
- **Financeiro:** receitas e despesas por mês; confirmação/reabertura de pagamentos; filtros por tipo e situação; busca; exportação CSV; recorrências com identificador determinístico para não duplicar o mês seguinte. O dia 31 é ajustado ao último dia do mês de destino.
- **Preferências:** público, serviços, tom de voz, meta semanal, backup JSON e importação da versão anterior.
- **Busca global:** atividades, projetos, clientes, conteúdo e lançamentos, também por Ctrl/Cmd+K.

## Dados e transição

A migração `supabase/migrations/20261018_workspace.sql` adiciona `workspace_entries` e `ai_usage`. Não altera nem apaga tabelas anteriores. Cada registro novo tem `owner_id`, com RLS que restringe leitura e escrita ao usuário autenticado. A demonstração usa apenas `localStorage` com chave própria e informações fictícias.

Na conta conectada, os dados são buscados ao entrar e ao voltar à aba/aplicação. Uma gravação só entra na interface depois de confirmada pelo Supabase. A sincronização depende de internet; esta entrega não implementa fila offline nem resolução de conflitos entre duas edições simultâneas do mesmo registro.

O importador copia projetos e atividades visíveis para a conta, além dos custos/receitas do próprio usuário, preservando identificadores. A importação é reaplicável sem duplicar registros existentes. É necessário conferir a política RLS das tabelas antigas antes da implantação: elas não vieram acompanhadas de migrações neste repositório.

O financeiro anterior não possui histórico de pagamentos por competência. A importação cria os valores ativos como **pendentes no mês atual**; não deduz automaticamente parcelas pagas nem inventa quitação. Parcelamentos anteriores devem ser conferidos e lançados com os vencimentos corretos. Chat colaborativo, quadro, setores, equipe e fechamentos continuam acessíveis na versão anterior, carregada sob demanda pelo diálogo de importação. As duas estruturas não mantêm sincronização bidirecional após importar.

Os documentos dos projetos são texto e links, sem upload de anexos nesta entrega. Conteúdos podem ser planejados e marcados como publicados, mas **não há integração de publicação ou métricas com a API do Instagram**. O teleprompter apoia a gravação pela câmera externa; não grava ou armazena mídia.

## Segurança e IA

- Nenhum segredo de provedor usa prefixo `VITE_` ou `define` no Vite.
- A API verifica o token com `supabase.auth.getUser`, valida tamanho e formato, impõe 30 solicitações por usuário/hora no banco e limita a saída e o tempo de geração.
- As chaves digitadas nas preferências são enviadas à API autenticada e cifradas no servidor com AES-256-GCM. Uma chave salva nunca é devolvida ao navegador, incluída no bundle ou exportada pelo backup do workspace.
- Conteúdo e tom de voz vão ao provedor na geração de ideias/roteiros. O planejamento envia títulos, datas, prioridade e duração das atividades e títulos/prazos/situações dos projetos. E-mails de clientes e valores financeiros não entram automaticamente nesses contextos.
- A API não publica no Instagram nem executa ações financeiras. O usuário decide o que salvar.
- Caso uma chave antiga tenha sido publicada em um bundle anterior, ela precisa ser revogada e substituída pelo responsável pela conta. Remover a chave do código não invalida cópias já distribuídas.

## Verificação e limites

Testes automatizados cobrem saldo realizado versus previsão, precisão de centavos, ajuste de vencimentos/ano bissexto, bloqueio da API sem sessão, atividades com persistência, cliente/projeto/etapas, roteiro/teleprompter/edição e geração idempotente de recorrências. O navegador verifica as telas em 360, 390, 768 e 1440 pixels e ausência de erros de execução.

Os testes automatizados de interface usam a demonstração local. Na primeira etapa não havia configuração do Supabase; a conexão real foi concluída em 18/10/2026, após a identificação do projeto pelo proprietário, conforme a atualização abaixo. A geração real com provedor ainda depende da configuração de chave/modelo. O frontend foi posteriormente publicado em produção; consulte docs/DEPLOY-VERCEL.md.

## Conexão real concluída em 18/10/2026

O projeto `xkkppfljodsrudzvxsip` (**Vontta**, região `sa-east-1`) foi acessado pelo Supabase CLI já autenticado no computador. URL e chave pública foram configuradas em `.env.local`, ignorado pelo Git. Nenhuma chave administrativa foi gravada nesse arquivo ou incluída no frontend.

Foi salvo um retrato dos tipos do esquema antes da alteração em `artifacts/supabase/schema-before.ts`. A simulação identificou somente a migração `20261018_workspace.sql`; ela foi aplicada e registrada no histórico remoto. A inspeção posterior confirmou as tabelas e a função novas, e o lint remoto retornou `No schema errors found`. Nenhuma tabela anterior foi alterada e nenhum registro existente foi importado automaticamente.

A validação utilizou duas contas temporárias isoladas, criadas para o teste, sem envio de e-mails. Foram confirmados:

- autenticação real;
- gravação e leitura de registros na conta proprietária;
- bloqueio de leitura e alteração por outra conta e de acesso anônimo;
- login pelo navegador, criação de atividade, persistência no banco e recuperação após recarregar a página;
- aceitação da sessão real pela API de IA, seguida da mensagem de configuração pendente do provedor;
- limite de 30 solicitações de IA por hora, com bloqueio da 31ª;
- remoção das contas, perfis, atividades e cotas temporárias ao terminar.

O esquema anterior mantém um vínculo entre perfil e conta que impede a exclusão direta de uma conta com perfil. Para limpar os testes, foram removidos primeiro **somente os perfis temporários criados pela validação** e depois as respectivas contas. Os dados dos usuários existentes foram preservados.

O relatório local está em `artifacts/supabase/verification.json`. A aplicação já pode usar as contas existentes no Supabase. Para trazer registros anteriores ao novo workspace, o próprio usuário deve revisar e executar a importação na interface. Nenhuma chamada paga foi feita nesse teste.

## IA configurável pela interface

Conforme solicitado, **Preferências → Conexão de IA** permite cadastrar provedor, modelo e chave, alterar o modelo mantendo a chave existente, definir o provedor padrão e remover uma chave pessoal. A migração adicional `20261019_user_ai_settings.sql` foi aplicada no mesmo projeto; `20261019` é o identificador sequencial da migração, aplicada em 18/10/2026. Ela cria apenas a tabela nova de configurações, isolada por conta com RLS.

As chaves dos provedores são cifradas com AES-256-GCM, com contexto autenticado que inclui conta e provedor. A chave mestra `AI_SETTINGS_ENCRYPTION_KEY` fica exclusivamente no servidor; neste ambiente, foi gerada e armazenada em `.env.local`, fora do Git. O mesmo segredo precisa ser preservado na hospedagem e entre deploys. Rotação da chave mestra exige migração dos segredos ou novo cadastro das chaves pessoais; não há rotação automática nesta entrega.

Foram testados no banco real: cadastro pela interface, ausência de chave em texto legível no registro, ausência de chave/cifra nas respostas da API, persistência do modelo após recarregar, manutenção da chave ao editar apenas o modelo, isolamento entre duas contas e remoção da chave. Os testes usaram uma chave fictícia, sem chamar o provedor. As contas e os dados temporários foram removidos. A geração real passa a depender apenas do cadastro de credenciais válidas na interface; o teste não comprova disponibilidade ou cobrança de modelos de terceiros.

Fontes usadas na implementação: [AI SDK](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data), [Anthropic no AI SDK](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic), [segurança de produção da OpenAI](https://developers.openai.com/api/docs/guides/production-best-practices) e [Node Functions da Vercel](https://vercel.com/docs/functions/runtimes/node-js).

## Publicação concluída

Em 18/10/2026, a versão foi publicada no projeto Vercel indicado pelo proprietário e promovida para https://vontta.niinja.com.br após validação. O relatório está em [DEPLOY-VERCEL.md](DEPLOY-VERCEL.md). A validação após a promoção confirmou login, persistência e preferências de IA no domínio público, com limpeza dos registros temporários.
