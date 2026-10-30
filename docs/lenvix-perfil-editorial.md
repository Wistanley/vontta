# Lenvix — perfil editorial e plano inicial

Pesquisa e cadastro: 29/10/2026. Perfil: @lenvix.ia.

## Base confirmada e alcance da pesquisa

O [site oficial](https://www.lenvix.com.br/) apresenta uma plataforma de atendimento no WhatsApp com agente de IA e equipe: conhecimento do negócio, agenda, filas por setor, responsáveis, transferência com contexto, permissões, múltiplos números e acompanhamento comercial. Recursos e limites dependem do plano e da configuração. As conversas e números demonstrativos da página não comprovam resultados de clientes.

O nome e a bio públicos do [Instagram](https://www.instagram.com/lenvix.ia/) confirmam o foco em atendimento inteligente, centralização, equipe, automação e IA. O conteúdo completo das publicações não ficou acessível nesta pesquisa. A busca aberta trouxe homônimas; elas foram descartadas, inclusive a Linvix, de ERP. Não foram confirmados clientes, depoimentos ou resultados nos segmentos propostos.

O site usa Manrope e Inter; sua identidade visual combina azul escuro, índigo, branco suave e lavanda. As artes sociais adaptam essa identidade à preferência já definida por Poppins 600/500/400 e fotos reais ilustrativas. A assinatura usada é tipográfica, sem reproduzir um logotipo inventado.

## Posicionamento proposto

Atendimento no WhatsApp com contexto e continuidade para pequenas e médias empresas: a IA ajuda na rotina e a equipe mantém o controle dos próximos passos.

A linguagem é institucional, clara e próxima, voltada a quem decide sobre a operação. Apresentar situações reconhecíveis antes de funcionalidades. Um segmento, uma ideia principal e uma chamada por peça.

| Segmento | Situação editorial inicial | Limite de afirmação |
| --- | --- | --- |
| Contabilidades | Direcionar dúvidas para o setor e responsável corretos | Não prometer cálculos fiscais ou integração com sistema contábil |
| Cartórios | Informação administrativa validada e encaminhamento | Não prometer atos, certidões ou validação jurídica automática |
| Engenharia | Organizar contato e demanda inicial de orçamento | Avaliação e responsabilidade técnica permanecem com o profissional |
| Clínicas | Agenda e continuidade da recepção | Sem diagnóstico, prescrição ou triagem clínica |
| Lojas | Responsável por conversa e acompanhamento comercial | Estoque, checkout e preços em tempo real exigem confirmação |

Os exemplos são hipotéticos, nunca apresentados como clientes existentes. Preços e condições comerciais devem ser reconferidos quando forem assunto de uma publicação.

## Operação cadastrada

- Texto e revisões: Anthropic, usando a conexão existente da conta.
- Formato inicial: carrossel de sete telas; prompts também orientam posts e stories.
- Artes editoriais: fotografias reais com procedência, Poppins leve, nome Lenvix e @lenvix.ia.
- Paleta: azul escuro #0B1020, índigo #4F46E5, claro #F7F8FC e lavanda #E4E2FF.
- Produção: segunda, quarta e sexta, às 9h de Brasília.
- Envio: automático ao Telegram cadastrado após os três revisores aprovarem.
- As 9h marcam o início da produção; não garantem entrega nesse instante. Uma reprovação ainda exige correção e nova revisão.

Foram cadastradas três agendas semanais recorrentes. As primeiras 12 pautas são rascunhos com horário e ocupam os mesmos slots das agendas para evitar duplicação. Após essas pautas, as agendas continuam com temas de aplicações por segmento, organização/produto e adoção/controle humano.

## Calendário inicial

| Data | Tema |
| --- | --- |
| 30/10/2026 | Conheça a Lenvix: IA e equipe no mesmo atendimento |
| 02/11/2026 | Seu cliente precisa repetir tudo quando troca de atendente? |
| 04/11/2026 | O que organizar antes de colocar IA no seu WhatsApp |
| 06/11/2026 | Contabilidade: cada assunto precisa chegar à pessoa certa |
| 09/11/2026 | Cartório: informação inicial clara, atendimento responsável |
| 11/11/2026 | Engenharia: o pedido de orçamento chegou. Qual é o próximo passo? |
| 13/11/2026 | Clínica: agendar sem perder o contexto da conversa |
| 16/11/2026 | Loja: quem está cuidando de cada conversa? |
| 18/11/2026 | Quando a IA deve passar o atendimento para uma pessoa? |
| 20/11/2026 | Mais de um número de WhatsApp, uma equipe organizada |
| 23/11/2026 | Seu cliente já pediu um orçamento. Como acompanhar a conversa? |
| 25/11/2026 | Como escolher um primeiro fluxo para automatizar |

## Implementação

A identidade editorial pode ser editada em Criador de posts → Perfis → Editar perfil e agendas: nome nas artes, assinatura e paleta. Perfis anteriores sem identidade explícita mantêm o comportamento anterior. A identidade é validada no servidor e passada ao renderizador tanto na produção manual quanto no worker.

Validação local: typecheck, build, 33 testes e 2 testes de navegador do criador. Renderização da nova paleta testada em feed e stories e prévia real inspecionada. Arte de exemplo: artifacts/lenvix/preview-editorial.png (não publicada nem enviada).
