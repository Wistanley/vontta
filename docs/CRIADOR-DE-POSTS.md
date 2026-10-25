# Criador de posts

Menu **Criador de posts** (`#posts`), independente do estúdio de roteiros existente. O módulo cria posts de feed e carrosséis em PNG 1080 × 1350 e sequências de stories em PNG 1080 × 1920. Até dez telas por publicação. A legenda é enviada separadamente. A publicação nas redes sociais permanece manual.

Publicado em **22/10/2026** em https://vontta.niinja.com.br/#posts. A migração e os segredos do runtime já foram configurados no projeto atual. O agendador usa **Supabase Cron + pg_net**, com segredo no Vault, e chama o worker a cada minuto. Não depende de cron da Vercel nem do navegador. Bot, chat e os perfis são cadastrados pelo usuário na interface. As instruções de infraestrutura abaixo servem para reproduzir a instalação em outro ambiente.

## Uso

1. Em **Perfis**, cadastre nome, identificação, público, voz, objetivos, preferências e prompts de texto, imagem e revisão. Escolha as conexões de IA para criação e revisão e o identificador de um modelo de imagem OpenAI disponível na sua conta.
2. Escolha por perfil **Aguardar minha aprovação final** ou **Enviar automaticamente após todos os revisores aprovarem**. Perfis começam com aprovação humana. Pausar um perfil suspende produção e envio.
3. Em **Conexões**, informe o token do bot e o chat de destino. O bot precisa ter acesso ao chat; em conversa privada, envie `/start` ao bot. O cadastro valida o acesso com `getChat`, sem enviar uma mensagem de teste.
4. Crie uma publicação com pauta, formato e quantidade de telas. Abra o rascunho e inicie a produção. O rascunho manual só usa APIs depois desse comando; o worker continua as produções já iniciadas. Publicações criadas pelas agendas entram diretamente em produção.
5. Confira as artes e a legenda. Três chamadas independentes revisam português, aderência editorial e as imagens finais. Reprovação interrompe o fluxo e expõe as observações. O modelo dos revisores deve aceitar imagens.
6. Use **Solicitar revisão** ou **Editar textos** para registrar correções. Uma nova versão invalida artes, revisões e aprovação anteriores. As últimas 30 orientações do perfil entram nas próximas gerações e revisões; isso é memória de instruções, sem treinamento dos pesos do modelo. As versões anteriores ficam no snapshot do histórico de revisão.
7. Após aprovação humana ou automática, o Telegram recebe cada PNG em ordem e a legenda em uma mensagem separada. `sendDocument` preserva o arquivo original. O envio não usa Instagram ou outra API de publicação.

## Banco e segredos

Aplique **depois das migrações existentes**:

`supabase/migrations/20261022_post_creator.sql`

Ela cria `post_profiles`, `creator_posts`, `post_feedback`, `post_connections`, `post_usage`, `post_worker_state`, as funções de lease/cota e o bucket privado `post-assets`. RLS separa contas; as relações entre perfil, publicação e revisão exigem o mesmo proprietário. As tabelas do workspace anterior não são alteradas.

O fluxo manual utiliza a sessão autenticada do usuário e a conexão Supabase existente. Chaves de IA continuam em **Preferências → Conexão de IA**. O modelo de imagem usa a chave pessoal OpenAI ou `OPENAI_API_KEY` do servidor. O token do Telegram é cifrado com AES-256-GCM, usando `AI_SETTINGS_ENCRYPTION_KEY` e um contexto exclusivo por conta e integração. O token nunca volta à interface. As novas tabelas e imagens não fazem parte do backup antigo do workspace.

## Agendas com navegador fechado

O worker é uma rota de backend persistida em banco, independente de automações do aplicativo Codex. Configure no runtime do servidor:

```dotenv
SUPABASE_SERVICE_ROLE_KEY=CHAVE_ADMINISTRATIVA_DO_MESMO_PROJETO
CRON_SECRET=SEGREDO_ALEATORIO_FORTE
```

Esses valores não podem ter prefixo `VITE_`. Preserve a chave mestra de criptografia atual. Não copie credenciais para scripts versionados.

Configure um agendador externo para chamar a URL pública **uma vez por minuto**, usando GET ou POST:

```http
POST /api/post-worker
Authorization: Bearer SEU_CRON_SECRET
```

Na instalação atual, esse agendador é o Supabase Cron. A estrutura está em `supabase/post-worker-scheduler.sql`; o segredo correspondente foi cadastrado separadamente no Vault, sob `vontta_post_worker_secret`. A função de disparo só pode ser executada pelo papel `postgres`. O job `vontta-posts-worker` roda por minuto e `vontta-posts-history-cleanup` remove apenas o histórico desses dois jobs com mais de sete dias. Para pausar a produção global, desative `vontta-posts-worker` no painel Cron do Supabase. [Guia oficial de agendamento com Vault](https://supabase.com/docs/guides/functions/schedule-functions).

Cada execução enfileira horários vencidos do dia local de cada agenda e processa **uma etapa de uma publicação**. A execução seguinte continua a fila. A criação de um carrossel, revisões e entrega exigem várias execuções; o horário configurado é o início da criação, não um prazo garantido de entrega. A interface mostra a última execução e considera o worker recente por dez minutos.

Alternativamente, em plano Vercel compatível com cron a cada minuto, acrescente ao `vercel.json`:

```json
"crons": [{ "path": "/api/post-worker", "schedule": "* * * * *" }]
```

Essa configuração **não foi adicionada por padrão**: o plano Hobby permite apenas uma execução diária e rejeitaria o deploy com cron por minuto. Use um agendador externo ou configure um plano compatível. [Documentação oficial](https://vercel.com/docs/cron-jobs/usage-and-pricing).

Cada perfil aceita até dez agendas, com dias, hora, fuso IANA, formato, quantidade de telas e pauta próprios. O slot `perfil + agenda + data local` tem unicidade no banco, inclusive com workers concorrentes. Pausas são respeitadas. O worker recupera horários anteriores do mesmo dia, sem acumular dias passados. Remover e recriar uma agenda gera outro ID e permite uma nova publicação naquele dia.

Também é possível agendar uma **pauta individual**, informando data e hora no cadastro ou detalhe do rascunho. O valor é salvo em UTC e exibido em Brasília na lista de Agendas. O campo de edição usa o fuso do dispositivo. Essas pautas são processadas ao vencer o horário, com o mesmo lease e cota; rascunhos sem horário continuam manuais. **Antecipar e produzir agora** exige comando explícito e remove a espera pelo horário. Não há publicação automática nas redes.

Pautas que exigem prova podem carregar uma pendência de material real. Nesse caso a produção é bloqueada antes de chamar provedores. O formulário do detalhe recebe as informações e fontes autorizadas; após salvar, a pauta volta a respeitar o horário agendado. O material informado entra como contexto na geração e permanece registrado quando uma nova revisão é criada.

O ciclo inicial do perfil de Will está documentado em [eusouwill-dev-fase-1.md](eusouwill-dev-fase-1.md).

## Falhas e retomada

- Cada etapa de texto, cada arte e cada revisão é salva antes da próxima chamada. Uma falha não apaga as artes já concluídas. A interface permite retomar a etapa.
- Cota compartilhada: até 60 etapas de produção por conta/hora, também no worker. É uma proteção de frequência; os custos seguem o provedor e o modelo escolhido.
- Um lease de cinco minutos protege contra produção simultânea em duas abas ou no cron. As chamadas externas têm timeout inferior ao lease.
- Somente publicações com todos os revisores aprovados, todas as artes e aprovação final podem chegar ao Telegram. Ao mudar um perfil automático para aprovação humana, publicações ainda sem envio aguardam aprovação.
- Antes de cada envio, o estado `sending` fica persistido. Se a resposta ou persistência for interrompida, o sistema não repete automaticamente: marca **Conferir entrega**. A pessoa confere no Telegram se a arte/legenda incerta chegou, informa o resultado e então retoma. O Telegram não oferece uma chave de idempotência para esses métodos. [Bot API](https://core.telegram.org/bots/api#senddocument).
- Após o início da entrega, a versão não pode ser editada. Crie outra publicação para alterar um material já entregue.
- Imagens usam armazenamento privado, prévias com URL assinada por uma hora e upload sem segredos no frontend. Atualize a fila para renovar prévias expiradas.

## Validação

`tests/post-creator.test.ts` executa o SDK instalado com respostas OpenAI/Telegram simuladas e armazenamento em memória: sequência de etapas, memória de correções, formato real dos PNGs, revisão multimodal, reprovação, aprovação por perfil, retomada de erro, lease, cota, slots e envio incerto sem repetição automática. Nenhuma chamada paga é feita nos testes.

`tests/e2e/post-creator.spec.ts` cobre o menu, cadastro, agenda, modo de aprovação, rascunho, revisão/memória e persistência da demonstração, sem chamadas às APIs. Confere larguras de 360, 390, 768 e 1440 pixels.

Esses testes não substituem a aplicação da migração e a validação com banco, provedores e bot reais no ambiente de destino.

Na instalação atual, também foi concluída uma verificação com **Supabase real** e duas contas temporárias, usando respostas OpenAI e Telegram simuladas: arquivos privados, criptografia, RLS entre contas, geração por etapas, revisão visual, memória, aprovação por perfil e recuperação de entrega incerta. O navegador no domínio público confirmou cadastro/edição e persistência de perfil, fila, autenticação e responsividade. Contas e arquivos temporários foram removidos. Relatórios ignorados pelo Git: `artifacts/diagnostics/post-creator-database.json`, `post-creator-stage.json` e `post-creator-public.json`. Não foram consumidos créditos de provedores nem enviadas mensagens a um bot real.

## Correções de geração — 24/10/2026

- Pautas individuais e recorrentes aceitam até **30.000 caracteres**. O formulário conserva o texto colado mesmo acima do limite, exibe contagem e bloqueia salvar até a correção. A API valida o mesmo limite; não há truncamento silencioso. Textos já cortados pela versão anterior precisam ser reconstituídos ou reenviados: os trechos perdidos não podem ser recuperados do banco.
- O modo de produção fica no perfil. **Editorial** usa Poppins 600/500/400 e fotos do acervo curado, com arquivos de fonte incluídos nas funções e PNGs de exatamente 1080 × 1350 ou 1080 × 1920. Não utiliza a API de geração de imagem. **OpenAI** mantém a geração completa para os demais perfis.
- Fluxo: roteiro → Português → Editorial → artes → Visual → aprovação configurada → Telegram. Roteiros previamente preparados na etapa de imagens também passam pela revisão de texto antes da produção.
- Português recebe apenas os textos finais e a voz. Editorial recebe as referências do perfil, mas avalia conteúdo. Visual recebe todas as artes e os registros de origem das fotos. A ausência de imagens não reprova as etapas anteriores à produção. Notas de revisão aceitam até 8.000 caracteres.
- Uma reprovação continua bloqueando o fluxo. A correção de texto reinicia as revisões e gera outra versão; artes anteriores permanecem nos caminhos da versão anterior. Aprovação humana e entrega não são dispensadas pelas correções.
