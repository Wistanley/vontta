# Radar de referências

O Radar integra o criador existente (Vite/React, API autenticada e Supabase), sem migrar os dados do Vontta. A análise pesada acontece em um worker separado com FFmpeg/FFprobe na VPS, independentemente do navegador.

## Uso

Em **Criador de posts → Radar**, cadastre referências públicas do Instagram/TikTok, envie um arquivo autorizado ou salve um link com legenda/contexto. Um link sozinho não dá acesso ao áudio/imagens. O modo exibido (`FULL`, `AUDIO_ONLY`, `VISUAL_ONLY`, `METADATA_ONLY`, `UNAVAILABLE`) é determinado no servidor pelo material efetivamente recebido.

Uma análise concluída permite gerar um roteiro original de 30, 45 ou 60 segundos para um perfil do criador. O editor oferece três ganchos, fala, cenas cronometradas, texto de tela, direção visual, edição, CTA, legenda e capa. Há revisão parcial, histórico, favoritos, exportação Markdown e passagem para o Estúdio ou um carrossel em rascunho. Correções dadas na revisão de roteiros ficam vinculadas ao perfil e entram como preferências nas próximas gerações; não há treinamento de um modelo.

As cenas são sugestões para o seu vídeo. Na análise da referência, observações e hipóteses são separadas e vinculadas a transcrição, frame, legenda ou métrica. Não são calculadas retenção real, causalidade ou tendências de toda a plataforma.

## Ranking e relatórios

A razão de visualizações usa a mediana de no mínimo cinco outras publicações do mesmo perfil, plataforma, tipo e faixa de idade (<7 dias, <30 dias, mais antigas). O próprio vídeo não entra. Destaques começam em 3×. Sem base suficiente, a razão fica indisponível.

Velocidade exige dois snapshots com visualizações e crescimento não negativo. Engajamento é uma aproximação sobre visualizações e informa os campos disponíveis. O escore redistribui os pesos apenas entre indicadores disponíveis; sua confiança é a soma dos pesos observáveis. As hashtags recorrentes exigem dois perfis distintos e se referem somente ao conjunto monitorado. Resumos diário/semanal respeitam suas janelas de 24h/7d.

## Consumo e segurança

O orçamento padrão é **US$ 5/mês em estimativas**, não uma garantia de fatura. Cada etapa reserva consumo de forma atômica no PostgreSQL antes da chamada paga. Quando o provedor informa o custo, ele substitui a reserva; sem custo informado, a reserva continua comprometida. Não se considera custo desconhecido igual a zero. Revise as reservas conforme os preços e o modelo da sua conta. Retries pagos exigem uma ação explícita quando há falha.

As credenciais Apify usam a mesma cifragem autenticada das conexões de IA. Os registros têm RLS por conta, vínculos compostos entre proprietários e endpoints internos autenticados. Jobs usam idempotência, fila persistente e leases com heartbeat. Somente a credencial de serviço reivindica tarefas e reserva o orçamento.

Uploads vão diretamente ao bucket privado `radar-media`, por URL assinada, e são verificados antes da criação da tarefa. Downloads externos exigem HTTPS, DNS público com endereço fixado, redirecionamentos limitados e limite de bytes/tempo. FFmpeg recebe argumentos separados, protocolos e demuxers restritos, sem shell. O container tem limites de CPU/memória, usuário sem privilégios e disco somente leitura. Áudio temporário fica em tmpfs e é removido; originais e frames expiram conforme a retenção (24h por padrão), com varredura de órfãos. As evidências textuais e os roteiros continuam salvos.

## Verificação

`npm test` inclui normalização, métricas nulas, mediana mínima, isolamento de coortes, snapshots, modos parciais e endereços privados. A validação de implantação também percorre envio autenticado → bucket → fila → worker/FFmpeg → transcrição e análise reais → roteiro → histórico → Estúdio/carrossel. Material sintético usado nesse teste é identificado como tal e removido da conta temporária após a verificação.

Consulte [a instalação do n8n](../integrations/n8n/README.md) para o worker e os workflows.
