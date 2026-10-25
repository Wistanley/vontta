# Publicação na Vercel — 18/10/2026

## Composição editorial e correções do criador — 25/10/2026

Deployment `dpl_71oLMTWi5YGgsoA2Pi64teg3QdN9`, https://vontta-31t8xqhex-wills-projects-47c95f14.vercel.app, validado como produção sem domínio e promovido para https://vontta.niinja.com.br. A promoção exigiu indicar explicitamente o time já vinculado na CLI. A primeira versão de staging falhou ao importar JSON no runtime ESM; o catálogo passou a ser um módulo TypeScript e essa versão não foi promovida.

O modo editorial combina fotografias reais do acervo curado com Poppins 600/500/400, usando Satori/SVG e Sharp para PNG exato, sem chamadas de geração de imagem. Fontes e licença são incluídas nas funções; a seleção de fotos registra fotógrafo, origem e licença. Pautas aceitam 30.000 caracteres e mostram excesso sem cortar o texto. Português e Editorial revisam antes das artes; Visual recebe todas as artes e os metadados de procedência. O modo OpenAI permanece disponível para outros perfis.

Validação: typecheck, build, 25 testes de domínio/API e os 11 cenários de navegador, incluindo persistência de pauta longa e bloqueio de excesso sem perda. Dois cenários excederam o tempo inicial; passaram na repetição, e o teste novo passou após usar o locator pelo papel acessível do campo. A API do deployment gerou e armazenou PNG 1080 × 1350 com Poppins e foto real em uma conta temporária, sem chamadas de IA; confirmou metadados e etapa de revisão. Conta, perfil, post e arquivo temporários foram removidos, inclusive o perfil legado exigido pela FK de autenticação.

Perfil @eusouwill.dev atualizado para modo editorial com aprovação humana. A tentativa `652bcc07-85c6-4882-b0da-dc65782fd93e` recebeu versão 2 com oito textos corrigidos, preservando a tentativa anterior em backup e memória do perfil. O briefing originalmente cortado não é recuperável; a nova pauta explicita o objetivo e a direção aprovada com base no roteiro existente. As pautas futuras, datas e credenciais foram preservadas.

A versão 2 concluiu o fluxo real pelo navegador no domínio principal: Português, Editorial e Visual aprovaram, oito artes com fotos reais e Poppins foram persistidas e o estado final é **Aguardando aprovação**. Nenhuma imagem ou legenda foi enviada ao Telegram. A confirmação foi capturada em `artifacts/diagnostics/corrected-carousel/approval-screen.png`.

Relatórios locais ignorados: `artifacts/diagnostics/editorial-stage-check.json`, `artifacts/diagnostics/corrected-carousel/`, `artifacts/deploy/editorial-build.log`.

## Perfil @eusouwill.dev e calendário da fase 1 — 22/10/2026

Configuração de Will salva no perfil `fef72e17-756f-579f-a8d4-095fbe5fb995`: público B2B, objetivos, tom, prompts, restrições, identidade visual inicial, revisão OpenAI e aprovação humana. O modelo de imagem `gpt-image-2.5-flare` foi confirmado no catálogo da conta sem gerar imagens. Quinze pautas individuais de 26/10 a 27/11/2026, segundas/quartas/sextas às 09:00 de Brasília; primeiros três fixados, cinco Stories manuais e sete roteiros de vídeo no estúdio. Os cinco conteúdos anteriores foram preservados. Três pautas de case/bastidor aguardam evidência real.

O criador passou a aceitar dez telas, horários individuais e material real antes da produção. A fila considera somente pautas cujo horário venceu; antecipar depende de comando explícito. As informações editoriais e fontes são preservadas nas revisões. Essas extensões usam o JSON já existente e não exigem migração adicional.

Build `dpl_4hxHVT9btp1a2WB1iAwxWZxusBr4`, https://vontta-n0xreosng-wills-projects-47c95f14.vercel.app, validado e promovido para https://vontta.niinja.com.br. Typecheck, build, 20 testes de domínio/API e teste de navegador do criador passaram. A API hospedada confirmou bloqueio de horário futuro e de material pendente sem chamar provedores, alteração de horário e cadastro das fontes. A verificação do banco confirmou vinte registros no criador, quinze datas futuras, três bloqueios de material, sete novos roteiros e nenhum início de produção ou envio antecipado. O navegador na sessão de Will confirmou 15 agendas às 9h e os três fixados; cron com heartbeat recente. Cadastro com IDs estáveis e inserção apenas dos registros ausentes. Fonte e operação: `docs/eusouwill-dev-fase-1.md`.

Relatórios locais: `artifacts/diagnostics/eusouwill-configuration.json`, `eusouwill-seed-verification.json`, backup `eusouwill-before-config.json`, captura `eusouwill-agendas.png` e logs de build `artifacts/deploy/eusouwill-profile-build.log`. Bot/chat continuam pendentes de cadastro pelo titular na interface.

## Criador de posts — 22/10/2026

Publicado em https://vontta.niinja.com.br/#posts, deployment `dpl_4HrpWRBLZh62RJveACihPEvzebdM`, URL de build https://vontta-monhwfbky-wills-projects-47c95f14.vercel.app. O build de produção foi preparado com `--skip-domain`, validado pela API autenticada via `vercel curl` e promovido. A CLI confirmou o projeto vinculado `wills-projects-47c95f14/vontta`; o conector MCP só apresentou outro time e a publicação utilizou a CLI autenticada. Nenhum commit ou push foi criado. Rascunhos manuais só são processados após o comando de iniciar; agendas entram diretamente em produção.

Novo menu com perfis, prompts e identidade próprios; posts/carrosséis/stories; revisão de português, editorial e leitura das imagens finais; memória de correções; aprovação humana ou envio automático por perfil; entrega de PNGs e legenda pelo Telegram. Chaves de texto são reaproveitadas. Imagens usam a chave OpenAI e o modelo escolhido no perfil. As três revisões são obrigatórias e edições invalidam a aprovação da versão anterior.

A migração `20261022_post_creator.sql` foi aplicada ao Supabase existente `xkkppfljodsrudzvxsip`, adicionando tabelas isoladas, RLS, cota, lease e bucket privado. `SUPABASE_SERVICE_ROLE_KEY` e `CRON_SECRET` foram cadastrados como variáveis sensíveis exclusivamente no servidor; a chave mestra existente foi preservada. Supabase Cron e pg_net disparam o worker a cada minuto, com o segredo no Vault e acesso à função de disparo restrito ao papel postgres. O SQL de referência está em `supabase/post-worker-scheduler.sql`. O job de limpeza remove apenas o próprio histórico com mais de sete dias.

Validação: typecheck, build, 19 testes de domínio/API e 10 testes de navegador. Duas contas temporárias no Supabase real confirmaram geração e revisão com provedores simulados, PNGs no bucket privado, criptografia do Telegram, memória de revisões, aprovação humana/automática, RLS entre contas e retomada de entrega incerta. Após a promoção, navegador no domínio público confirmou acesso ao menu, edição/persistência de perfil e layout desktop/mobile sem erros JavaScript. Todos os arquivos, contas e registros temporários foram removidos. Não foram feitas chamadas pagas de IA ou envios a Telegram real; bot/chat são cadastrados pelo titular.

Relatórios locais ignorados pelo Git: `artifacts/diagnostics/post-creator-database.json`, `post-creator-stage.json`, `post-creator-public.json`, `post-creator-public-desktop.png`, `post-creator-public-mobile.png` e `post-worker-health.json`. O cron confirmou execução automática com estado `succeeded` e heartbeat atualizado no worker. Referência anterior: `dpl_6xgH3mrsyK2853MHam6UNJ7HPcEs`. Detalhes operacionais em `docs/CRIADOR-DE-POSTS.md`.

## Favicon — 21/10/2026

Deploy `dpl_BGbAS5y8KMnjoAqiwxGEamHrC47r` promovido para https://vontta.niinja.com.br. O favicon SVG reproduz as três barras verdes da marca sobre o fundo escuro da aplicação. O HTML aponta para `/favicon.svg`, e a verificação pública confirmou HTTP 200, `image/svg+xml`, conteúdo idêntico ao arquivo local e referência correta no navegador.

Duas tentativas ficaram na instalação de dependências, inclusive uma sem cache; ambas foram canceladas. O comando de instalação passou a usar `npm ci --no-audit --no-fund --fetch-timeout=30000 --fetch-retries=1 --loglevel=info`. A tentativa seguinte instalou em 5 segundos e concluiu o build. Os logs disponíveis não isolam qual consulta da instalação original causou a espera.

Build local e renderização do SVG também foram validados. Relatório local ignorado pelo Git: `artifacts/diagnostics/favicon-public.json`.

## Subprojetos — 19/10/2026

Deploy `dpl_3XfvvuVWu5xBMRJD1ZbYRxLAE8zW` promovido para https://vontta.niinja.com.br. A estrutura usa `parentProjectId` opcional no JSON de projetos, com criação de subprojetos, navegação por ancestrais, movimentação de projetos existentes e identificação do caminho nos seletores. Cada projeto mantém etapas, prazos, tarefas, documentação e financeiro próprios.

A migração `20261020_subprojects.sql` foi aplicada e o lint remoto não encontrou erros. O banco restringe o pai à mesma conta, rejeita ciclos e bloqueia excluir um projeto que tenha subprojetos. A exclusão em cascata de uma conta continua funcionando. Os projetos existentes permanecem independentes até que sejam vinculados explicitamente.

Typecheck, build, oito testes de domínio/API e sete cenários de navegador foram validados. O cenário de layout foi repetido após uma recarga do ambiente de desenvolvimento interromper sua primeira execução. Testes no banco com duas contas temporárias confirmaram hierarquia de dois níveis, bloqueio de vínculos entre contas, ciclos e exclusão do pai, além da movimentação preservando descendentes.

No domínio público, o navegador criou cliente, projeto, subprojeto e atividade, confirmou os vínculos e a documentação no Supabase, e reabriu os dados após recarregar. Layout desktop/mobile sem erros JavaScript ou overflow. Todas as contas e registros temporários foram removidos. Relatórios locais ignorados pelo Git: `artifacts/diagnostics/subprojects-database.json` e `artifacts/diagnostics/subprojects-public.json`.

## Importação do calendário na agenda — 19/10/2026

Deploy `dpl_68BcqYy8JSUyw37HDAXWUsXoV3xa` promovido para o domínio principal. Atividades agora possuem detalhes/roteiro opcionais e aceitam horário vazio e duração 0 (a definir), preservando os registros anteriores.

Foram importadas 15 atividades do calendário fornecido, de 05/10/2026 a 06/11/2026. Cada publicação conserva formato, objetivo e texto completo; a primeira publicação de cada semana também contém as orientações de Stories. Diretrizes editoriais estão na primeira atividade, e a orientação de avaliação da fase está na última. Nenhuma atividade foi marcada como concluída. A importação inseriu apenas registros novos e verificou a preservação dos 21 registros anteriores da conta. IDs determinísticos previnem duplicação ao repetir o procedimento.

Typecheck, build e seis testes de navegador passaram. Um teste real no domínio público confirmou, em viewport mobile e conta temporária, cadastro de atividade com roteiro, persistência no Supabase e reabertura dos mesmos detalhes após recarregar. A conta temporária e seus registros foram removidos. Relatórios e cópia anterior dos dados permanecem somente em `artifacts/diagnostics/`, ignorado pelo Git.

## Correção de diagnóstico da IA — 19/10/2026

Foi reproduzida a falha de geração: o Google selecionado como padrão respondeu HTTP 402 por esgotamento de créditos pré-pagos. A consulta de modelos aceitava a chave, mas a geração era bloqueada pelo faturamento. A OpenAI cadastrada gerou cinco ideias no teste real. A chave da Anthropic exigiu o cabeçalho `anthropic-workspace-id`.

O assistente agora retorna mensagens específicas e códigos estáveis de erro, sem repassar respostas brutas dos provedores. Os logs registram somente tipo, provedor, código e status de origem. O formulário da Anthropic permite salvar o ID do workspace e o servidor envia o cabeçalho correspondente. A alteração utiliza o JSON de configurações existente, sem nova migração. A escolha padrão e as credenciais originais do usuário foram preservadas.

Typecheck, sete testes de domínio/API e cinco testes de navegador passaram. A validação de deploy usa uma conta temporária com credenciais cifradas e vinculadas a esse proprietário, removida ao concluir. Esta correção inclui testes reais de geração, diferentemente da publicação inicial documentada abaixo.

Deploy da correção: `dpl_S5ZTFx3eMTtZeypE7KSbiw5orxH2`, https://vontta-hbxs1rs77-wills-projects-47c95f14.vercel.app. Relatório local ignorado pelo Git: `artifacts/diagnostics/verified-deployment.json`.

Deploy promovido e confirmado em https://vontta.niinja.com.br. O navegador mobile confirmou login, cadastro e persistência do workspace da Anthropic sem reapresentar a chave e sem overflow ou erros JavaScript. As contas e os registros temporários foram removidos. Relatório local: `artifacts/diagnostics/public-verification.json`.

## Publicação inicial

- Projeto: `wills-projects-47c95f14/vontta`.
- ID do projeto: `prj_eyoYRgUqv3ZbME8QTSiYGimk2nXl`.
- Ambiente: **Production**, estado **Ready**.
- Aplicação: https://vontta.niinja.com.br.
- Deploy validado e promovido: `dpl_4E77znf4Ho4rQDLdt7PjNrRVTqfY`.
- URL específica: https://vontta-qvioh4ma3-wills-projects-47c95f14.vercel.app.
- Painel: https://vercel.com/wills-projects-47c95f14/vontta/4E77znf4Ho4rQDLdt7PjNrRVTqfY.
- Fonte: conteúdo atual do diretório de trabalho, incluindo as alterações locais sobre o commit base `26733e9`. O deploy não criou commit nem enviou alterações ao Git.
- Runtime: Node 24; frontend Vite; APIs em `gru1`, próximas ao Supabase em São Paulo.

## Configuração aplicada

O `vercel.json` define o build `npm run build`, instalação `npm ci` e saída `dist`. As importações locais dos módulos do servidor usam extensão `.js`, compatível com a saída ESM executada pelo Node na Vercel.

Foram configuradas em produção as variáveis `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `AI_SETTINGS_ENCRYPTION_KEY`. A chave mestra foi mantida igual à do ambiente local e armazenada como variável sensível, sem exposição de seu valor. Chaves e modelos dos provedores continuam configuráveis por conta na interface.

O envio exclui `.env*`, arquivos de autenticação locais, artefatos de teste, dependências e metadados de ferramentas. Nenhuma chave administrativa do Supabase faz parte do frontend ou da configuração de runtime da aplicação.

## Validação

O build foi criado com as variáveis de produção e testado antes da promoção do domínio. Foram confirmados frontend e JavaScript, inicialização das duas APIs, bloqueio de requisições sem sessão, cadastro/remoção de chave temporária e compatibilidade da criptografia com o ambiente local.

Após promover, o domínio público retornou HTTP 200 e o mesmo asset JavaScript do build validado. Testes pelo navegador confirmaram login, criação de atividade, persistência após recarregar, isolamento entre contas e preferências de IA (salvar, manter a chave ao trocar o modelo, remover), também em viewport mobile. Todas as contas, perfis e registros temporários usados foram removidos. Nenhuma geração paga foi executada com provedor de IA.

Typecheck e seis testes de domínio/API passaram. A compilação remota passou e a instalação retornou zero vulnerabilidades conhecidas. A consulta de logs da versão publicada não retornou registros no nível `error` durante a verificação; isso é uma inspeção pontual, não monitoramento contínuo.

Relatórios locais, ignorados pelo Git: `artifacts/deploy/stage-verification.json`, `artifacts/deploy/production-verification.json` e capturas em `artifacts/deploy/`.

## Referência para rollback

A versão anterior à atualização era `dpl_9mrBCvqK2Eyx7RfZpMRC6WdHEHx5` (`https://vontta-138pzk09r-wills-projects-47c95f14.vercel.app`). As novas tabelas foram adicionadas sem alterar tabelas antigas. Retornar o frontend anterior não remove os dados do novo workspace. O rollback deve ser executado apenas quando solicitado.

## Projetos pessoais e integração Pluggy — 22/10/2026

Publicado e validado em https://vontta.niinja.com.br. Deployment `dpl_6xgH3mrsyK2853MHam6UNJ7HPcEs`, URL de build https://vontta-6nh7yasx6-wills-projects-47c95f14.vercel.app. O build foi preparado com as variáveis de produção e `--skip-domain`; após verificar frontend e API autenticada via `vercel curl`, o mesmo deployment foi promovido. A CLI utilizou o projeto já vinculado `wills-projects-47c95f14/vontta`; o conector MCP não tinha autorização para este time. Nenhum commit ou push foi criado.

Projetos pessoais oferecem modelos para casamento e casa, orçamento de gastos, etapas e despesas de todo o período. O Financeiro ganhou filtros de projeto, origem e todo o período, além de dados de origem e exclusão dos totais no CSV. Projetos anteriores permanecem profissionais; custos dos subprojetos continuam próprios.

A migração `20261022_personal_projects_pluggy.sql` foi aplicada ao projeto Supabase existente `xkkppfljodsrudzvxsip`. Foram acrescentados configurações Pluggy cifradas, contas, cota de consultas e funções para sincronizar snapshots e editar classificações com RLS. Não foi necessário alterar variáveis de produção: a integração reutiliza a chave mestra de criptografia já configurada no servidor. Não foram cadastradas credenciais bancárias do usuário.

A API `/api/pluggy` foi publicada em Node/gru1, com limite de 300 segundos. A importação por conta lê `/v2/transactions` por cursor e só persiste após concluir todas as páginas. A gravação é atômica; preserva categoria, projeto, exclusão dos totais e confirmação manual de pagamento no cartão. Valores bancários permanecem autoritativos quando a interface edita as classificações. A conexão ao Meu Pluggy usa itemIds explícitos, conforme a limitação de listagem do plano pessoal.

Validação concluída: typecheck, build, 15 testes de domínio/API e 9 testes de navegador. A integração da API com Supabase real usou respostas Pluggy simuladas e duas contas temporárias para conferir criptografia, isolamento, paginação, repetição sem duplicação, atualização, exclusão e preservação de classificações. No domínio público, uma conta temporária confirmou cadastro de projeto pessoal/gasto, persistência após recarregar, classificação de um lançamento importado pela RPC e configuração Pluggy em desktop/mobile sem erros JavaScript ou overflow. Todas as contas e registros temporários foram removidos.

Relatórios e capturas locais ignorados pelo Git: `artifacts/diagnostics/pluggy-database.json`, `personal-pluggy-stage.json`, `personal-pluggy-public.json`, `personal-project-public-desktop.png` e `pluggy-public-mobile.png`. A leitura de bancos reais depende das credenciais e dos consentimentos do titular, ainda não fornecidos. A sincronização desta versão é manual; não há webhooks ou agendamento.
