# Vontta — seu dia com direção

Workspace em React/TypeScript para agenda pessoal, projetos e clientes, estúdio de conteúdo B2B, finanças e assistência de IA. Layout para desktop e mobile.

O diagnóstico e o escopo detalhado estão em [docs/ANALISE-E-ENTREGA.md](docs/ANALISE-E-ENTREGA.md).

Produção atualizada em 22/10/2026: **https://vontta.niinja.com.br**. O deploy e a validação estão registrados em [docs/DEPLOY-VERCEL.md](docs/DEPLOY-VERCEL.md).

## Executar localmente

Requer Node.js 22.12+ (testado em Node 24) e npm.

```powershell
npm ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm run dev
```

Abra `http://127.0.0.1:3000`. Sem credenciais, use **Explorar demonstração**. Os exemplos são fictícios e as alterações ficam somente no navegador. A demonstração não chama provedores de IA.

Neste checkout, o projeto Supabase **Vontta** (`xkkppfljodsrudzvxsip`) já foi conectado em 18/10/2026: as migrações foram aplicadas e as variáveis públicas estão no `.env.local` local, fora do Git. Entre com sua conta existente e configure a IA nas preferências do app. Os passos abaixo também servem para preparar outro ambiente.

## Conectar dados reais

1. No mesmo projeto Supabase da versão atual, aplique as migrações de `supabase/migrations/` em ordem: `20261018_workspace.sql`, `20261019_user_ai_settings.sql`, `20261020_subprojects.sql` e `20261022_personal_projects_pluggy.sql`, pelo SQL Editor ou pelo fluxo usado pela sua equipe.
2. Configure em `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
```

3. Reinicie o servidor. Entre com a conta existente ou crie uma conta. Se o Supabase exigir confirmação de e-mail, confirme antes de entrar.
4. Na tela inicial ou em Preferências, use **Importar dados da versão anterior**. Leia as regras da importação e confira os registros financeiros. Os dados anteriores permanecem disponíveis.

Nunca use `service_role` no frontend. Revise as políticas RLS das tabelas antigas: suas definições não estão neste repositório. A tabela nova usa uma política por proprietário.

## Projetos e subprojetos

Abra um projeto e use **Novo subprojeto**. O novo cadastro já aponta para o projeto pai e começa com o mesmo cliente selecionado; prazo, etapas, atividades, documentação e valores são próprios. É possível criar outros níveis de subprojetos e navegar pelos projetos acima pelo caminho mostrado no topo.

Para mover um projeto existente, edite o campo **Projeto pai**. Escolha a opção sem projeto pai para torná-lo independente. A lista inicial mostra os projetos principais; busca e filtro de situação também encontram subprojetos. Os seletores de projeto nas atividades e no financeiro mostram o caminho completo.

A migração `20261020_subprojects.sql` valida o vínculo na mesma conta, impede ciclos e bloqueia excluir um projeto enquanto ele possui subprojetos. O progresso e o financeiro de cada projeto continuam próprios; os valores não são somados automaticamente ao projeto pai.

## Projetos pessoais e contas bancárias

Em **Projetos**, use **Meu casamento**, **Minha casa** ou **Outro projeto pessoal**. O cadastro pessoal não exige cliente: o valor é um orçamento de gastos, com etapas e data prevista. Os projetos anteriores continuam profissionais. Ao abrir um projeto pessoal, **Gastos do projeto** mostra todas as suas despesas, independentemente do mês, com total previsto, pago, a pagar, saldo do orçamento e divisão por categoria. Os gastos dos subprojetos continuam próprios e não são somados ao pai.

Use **Adicionar gasto** para lançar uma despesa já vinculada. Em **Financeiro**, qualquer lançamento manual ou importado pode receber um projeto e uma categoria. Os filtros de projeto, origem e **Todo o período** também filtram os indicadores; a exportação inclui projeto, origem, parcela e indicação de exclusão dos totais.

### Conectar o Meu Pluggy

1. Aplique `supabase/migrations/20261022_personal_projects_pluggy.sql` depois das migrações anteriores. Ela acrescenta configurações cifradas, contas, cota de consultas e funções de sincronização com RLS. Não altera os projetos existentes.
2. Mantenha `AI_SETTINGS_ENCRYPTION_KEY` no servidor, a mesma chave já utilizada pela IA. Não crie variáveis `VITE_` para credenciais bancárias. Client ID e Client Secret são cadastrados por usuário na interface.
3. Conecte seus bancos e autorize o acesso em [Meu Pluggy](https://meu.pluggy.ai). No [Dashboard Pluggy](https://dashboard.pluggy.ai), habilite **MeuPluggy** na sua aplicação e abra **Aplicações → Demo → Conectar conta → MeuPluggy** para vincular cada banco. Copie o `itemId` de cada conexão. A listagem `/v2/items` não está disponível para esse plano.
4. Abra **Financeiro → Conectar bancos**, informe Client ID, Client Secret e até cinco itemIds. Clique **Validar e salvar conexão**, depois **Buscar contas** e **Sincronizar histórico** em cada conta ou cartão.

O fluxo segue o [guia oficial de uso pessoal](https://docs.pluggy.ai/pt/docs/guides/meu-pluggy-personal-use). O Meu Pluggy atualiza os bancos a cada 24 horas; a sincronização no Vontta importa o que já está disponível. A importação é acionada pelo usuário, sem agendamento ou webhooks nesta versão. O cadastro e cada operação externa consomem uma das 60 consultas permitidas por usuário/hora.

A API `/api/pluggy` exige sessão. Credenciais são cifradas com AES-256-GCM e vinculadas ao proprietário; o Client Secret nunca é devolvido à interface ou incluído no backup. **Desconectar** remove as credenciais do Vontta e mantém o histórico. A revogação da autorização bancária é feita no Meu Pluggy.

O importador usa `/v2/transactions` por cursor, lendo os últimos 12 meses disponíveis e parcelas futuras. Só grava uma conta depois de ler todas as páginas. IDs estáveis evitam duplicação; exclusões do provedor são reconciliadas dentro da janela lida. Histórico vazio, consentimento expirado, paginação inválida ou falha parcial preservam os lançamentos anteriores. Contas em moeda diferente de BRL não são importadas; transações internacionais exigem valor em reais informado pelo Pluggy.

O estado POSTED de uma compra no cartão não comprova pagamento da fatura: a confirmação de pagamento é manual e permanece após sincronizar. Para contas bancárias, o estado de liquidação vem do banco. Valores, datas e descrição dos importados são atualizados pelo provedor; projeto, categoria e exclusão dos totais são preservados. O forecast de parcelas pendentes é exibido no primeiro dia do mês previsto quando não coincide com o mês da transação; isso não representa um vencimento exato. O timestamp original é preservado nos metadados.

Operações explicitamente identificadas como pagamento de fatura são excluídas dos totais. Revise outros pagamentos, créditos, transferências entre contas e lançamentos manuais que já representem a mesma compra; use **Excluir dos totais** quando necessário. Não há conciliação automática entre lançamentos manuais e bancários ou entre bancos diferentes. Se o provedor substituir um ID por outro, a transação antiga é removida e a nova precisa de classificação própria.

### Validação desta integração

`npm test` inclui sinais bancários/cartão, fuso, parcelas, criptografia, paginação, consentimento e bloqueio de acesso anônimo. Os testes de navegador cobrem orçamento pessoal, classificação de importados e responsividade. O relatório local `artifacts/diagnostics/pluggy-database.json` registra o teste da API com respostas Pluggy simuladas e persistência em Supabase real, incluindo isolamento entre duas contas temporárias, reconciliação e preservação de classificações. As contas temporárias foram removidas. A conexão com bancos reais requer as credenciais e autorizações do titular.

## Criador de posts, carrosséis e stories

O [padrão visual de @eusouwill.dev](docs/PADRAO-VISUAL-EUSOUWILL.md) registra a direção escolhida para os próximos conteúdos e os comandos para reproduzir o piloto local: `npm run carousel:prepare`, `npm run carousel:render` e `npm run carousel:preview`.

O menu **Criador de posts** oferece perfis com identidade e prompts próprios, agendas recorrentes, memória das correções e revisores de português, conteúdo e imagens finais. Cada perfil escolhe aprovação humana ou envio automático após os revisores. As artes em PNG e a legenda são entregues ao Telegram para publicação manual.

Na instalação atual, a migração, o worker e o Supabase Cron por minuto já estão configurados. Cadastre os perfis, confira as conexões de IA e informe bot/chat em **Criador de posts → Conexões**. Consulte [docs/CRIADOR-DE-POSTS.md](docs/CRIADOR-DE-POSTS.md) para configuração em outro ambiente, comportamento e retomada de falhas. O backup antigo do workspace não inclui os dados deste módulo.

## Habilitar IA

No aplicativo, abra **Preferências → Conexão de IA**:

1. Escolha OpenAI, Anthropic ou Google.
2. Informe o identificador de um modelo disponível na sua conta com suporte a saída estruturada.
3. Cole a chave de API e clique **Salvar e usar como padrão**.

Cada provedor pode ter sua própria chave/modelo. Ao editar, deixe a chave vazia para manter a existente. Há opção para remover a chave pessoal. As chaves são cifradas no servidor com AES-256-GCM e ficam na tabela `user_ai_settings`, protegida por RLS. A API nunca devolve uma chave salva à interface, e o backup do workspace não inclui credenciais.

Chaves da Anthropic que exigem o cabeçalho `anthropic-workspace-id` precisam também do **ID do workspace** no formulário dessa conexão. Para configuração exclusivamente por ambiente, use `ANTHROPIC_WORKSPACE_ID`. Não é necessária uma migração adicional: o campo é opcional no JSON de configurações existente.

A geração informa separadamente problemas de faturamento/créditos (HTTP 402 ou cota financeira), chave recusada, acesso negado, modelo indisponível, limite de requisições, workspace ausente e tempo esgotado. As mensagens e os logs não incluem o texto bruto de erro do provedor, chaves ou contexto enviado. O cadastro de uma chave confirma seu armazenamento; saldo e disponibilidade são verificados pelo provedor ao gerar.

O servidor exige `AI_SETTINGS_ENCRYPTION_KEY`, com 32 bytes em hexadecimal. Ela **já foi criada neste `.env.local`**, sem impressão no terminal. Para um novo ambiente, gere com um gerenciador de segredos ou `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` e configure como variável **exclusivamente do servidor**. Preserve a mesma chave entre deploys e em todas as instâncias; se for substituída ou perdida, as chaves de provedores precisarão ser cadastradas novamente. Nunca use prefixo `VITE_` para essa variável.

Opcionalmente, o administrador pode oferecer uma configuração padrão pelo ambiente, usada quando o usuário não tem uma conexão pessoal para o provedor solicitado:

```dotenv
AI_PROVIDER=openai
AI_MODEL=IDENTIFICADOR_DO_MODELO
OPENAI_API_KEY=SUA_CHAVE
```

Para usar múltiplos provedores pelo seletor da interface, configure separadamente:

```dotenv
AI_MODEL_OPENAI=IDENTIFICADOR_OPENAI
OPENAI_API_KEY=SUA_CHAVE_OPENAI
AI_MODEL_ANTHROPIC=IDENTIFICADOR_ANTHROPIC
ANTHROPIC_API_KEY=SUA_CHAVE_ANTHROPIC
AI_MODEL_GOOGLE=IDENTIFICADOR_GOOGLE
GOOGLE_GENERATIVE_AI_API_KEY=SUA_CHAVE_GOOGLE
```

`AI_MODEL` é o fallback do ambiente apenas para `AI_PROVIDER`. Os outros provedores exigem sua própria variável de modelo. A configuração pessoal da interface tem prioridade sobre o ambiente. Reinicie o processo após mudar o `.env.local`; alterações feitas pela interface valem imediatamente. A API em `/api/assistant` valida a sessão e usa uma cota de 30 solicitações por usuário/hora, aplicada no Supabase.

Remova configurações antigas `VITE_API_KEY`, `GEMINI_API_KEY` exposta por `define` e equivalentes do frontend. Se já foram distribuídas em produção, substitua as chaves antigas no provedor.

## Testes

```powershell
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm audit
```

Os testes de navegador usam a demonstração e verificam criação/edição, etapas de projeto, conteúdo/gravação, financeiro/recorrência e larguras de 360 a 1440 pixels. Capturas são gravadas em `artifacts/` (ignorado pelo Git). Testes de produção exigem credenciais e uma conta de teste; não rode testes destrutivos sobre dados reais.

## Hospedagem

A estrutura `api/assistant.ts` e `vercel.json` permite frontend Vite e API Node na Vercel. Configure as variáveis no ambiente de destino e aplique a migração antes de usar a conta conectada. O build é `npm run build`, saída `dist`. As variáveis `VITE_` precisam estar presentes na compilação; as demais ficam no runtime do servidor. O frontend pode ser hospedado em outro serviço desde que a API Node também seja disponibilizada no mesmo caminho.

`npm run preview` serve somente os arquivos estáticos de produção; não inicia a API de IA. Para desenvolvimento com API, use `npm run dev`.

## Organização

- `App.tsx`: autenticação, navegação e persistência do workspace.
- `components/WorkspaceViews.tsx`: visão geral, agenda, conteúdo, projetos, clientes, finanças e preferências.
- `components/WorkspaceUI.tsx`: formulários, diálogos e teleprompter.
- `components/AssistantPanel.tsx` e `api/assistant.ts`: cliente e servidor de IA.
- `components/AISettingsPanel.tsx`, `api/ai-settings.ts` e `server/ai-settings.ts`: preferências de IA e criptografia de credenciais por conta.
- `lib/workspace.ts`: tipos, operações, cálculos e demonstração.
- `supabase/migrations/`: estrutura de dados e políticas de acesso.
- `LegacyApp.tsx`: aplicação anterior, preservada e carregada sob demanda.

Agendamento editorial não publica automaticamente no Instagram. O teleprompter não captura vídeo. Dados da demonstração não são enviados à nuvem. Após importar, os registros novos e antigos evoluem separadamente.
