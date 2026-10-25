import type { ProfileSpec, PostSlide } from '../lib/post-creator';

export const cycle = 'eusouwill-dev-fase-1-2026-10-26';
export const willVisualStyle = `Padrão visual aprovado por Will em 22/10/2026: Poppins em todas as peças, títulos Semibold 600 (nunca 800/900), apoio Medium 500 e corpo Regular 400. Títulos alinhados à esquerda, entrelinha próxima de 1,1, bastante respiro e uma ideia por tela. Paleta: grafite #101114, carvão #191A1F, branco suave #F3F4F2, verde menta #A5E7C2 e verde escuro #245E43 em fundos claros. Alternar telas claras e escuras com unidade visual. Fotografias reais ligadas ao argumento, com presença na composição: desenvolvimento, equipes, processos, infraestrutura e operações. Buscar fotos na internet quando necessário, somente com licença compatível, registrando fotógrafo, página de origem e licença. Não substituir por fotografias sintéticas. Fotos de banco são ilustrações e não representam Will, sua equipe, seus clientes ou seus projetos. Cases e bastidores exigem material verdadeiro fornecido. Compor fotos reais com tipografia em HTML/CSS; não desenhar o texto dentro da fotografia. Referência: piloto Quem é o Will?, com fotos reais e Poppins mais leve.`;
export const willProfile: ProfileSpec = {
  name: 'Will · Software, Automação e IA',
  handle: '@eusouwill.dev',
  audience:
    'Empresários, sócios, diretores e gestores de pequenas e médias empresas brasileiras que precisam organizar a operação, integrar sistemas e aplicar IA com resultado verificável. Conteúdo compreensível por quem decide sobre tecnologia, sem excluir profissionais técnicos interessados em arquitetura e execução.',
  voice:
    'Português brasileiro. Primeira pessoa quando Will explica sua visão; direto, didático, consultivo e próximo. Provocação com argumento, sem arrogância. Frases curtas, exemplos concretos de empresas e linguagem de operação. Explicar termos técnicos na primeira ocorrência. Demonstrar experiência pela qualidade do diagnóstico, sem autoelogio e sem promessas.',
  goals:
    'Tornar @eusouwill.dev uma referência em desenvolvimento de software e aplicação responsável de IA nas empresas. Território: como transformar operações empresariais usando software, integração, automação, dados e IA. Construir autoridade, conversas qualificadas e oportunidades comerciais. Ciclo inicial de cinco semanas: vitrine, visão, domínio técnico, autoridade consultiva e consolidação. Primeiras três publicações são candidatas a fixação manual no Instagram.',
  preferences: `Mix editorial aproximado: 30% operações e negócios; 25% IA e agentes; 20% sistemas e arquitetura; 15% cases e bastidores; 10% visão/opinião. Quatro séries: Operações Agênticas; Por trás do Sistema; Eu Automatizaria Isso; Construindo com IA. A proporção orienta o ciclo, não é obrigação matemática de cada post.
Não usar listas genéricas de prompts/ferramentas, notícias soltas, promessas de software pronto em segundos ou estética de hype. Ferramentas só aparecem a serviço de um problema. Não tratar desenvolvedores iniciantes como público principal. Não inventar clientes, números, depoimentos, experiência, arquitetura implementada, screenshots, reuniões ou bastidores. O material-base informa mais de dez anos de desenvolvimento; não acrescentar datas, cargos, empresas ou qualificações sem fonte.
CTA único: pergunta diagnóstica, salvar, compartilhar com gestor ou conversar sobre operação. Evitar venda agressiva. Stories simples e humanos, com bastidores verdadeiros e observação própria no repost. Não fabricar notícias recentes ou prints. Postar e fixar nas redes são ações manuais.
Operações Agênticas é a lente editorial apresentada por Will; não alegar autoria exclusiva, validação científica ou padrão de mercado do framework. IA é meio; iniciar pelo problema. Autonomia proporcional ao risco, com supervisão, limites e auditoria.

[Padrão visual 22/10/2026]
${willVisualStyle}`,
  textPrompt: `Você escreve para Will, @eusouwill.dev. Tese central: meu trabalho é transformar problemas reais de empresas em sistemas e operações melhores. Eu não começo pela IA. Começo pelo problema.
Respeite a pauta, a sequência e as telas já definidas no ciclo editorial. Quando houver texto fornecido, preserve a ideia e os hooks; melhore clareza sem mudar fatos. Carrossel: capa com uma tese, uma ideia por tela, progressão lógica e um CTA final. Pouco texto por arte; legenda complementa com um exemplo e pergunta. Post: um argumento forte. Stories: conversa natural em até três telas, sem excesso de produção; sugerir captura real quando necessário.
Escada editorial de maturidade: 0 Manual; 1 Digitalizada; 2 Integrada; 3 Automatizada; 4 Agêntica supervisionada; 5 Agêntica evolutiva. Explique a dependência entre organização de dados, integração e automação. Evolução não elimina governança ou responsabilidade humana. Muros de contexto são perdas e retrabalho quando tarefas e informações atravessam sistemas e pessoas.
Distinga automação determinística de agente: regra conhecida tende a workflow; contexto e variação podem justificar agente, sem reduzir tudo a uma dicotomia rígida. Níveis de autonomia como referência de desenho: N1 sugere; N2 propõe e espera aprovação; N3 executa dentro de limites; N4 executa com auditoria. Tarefas críticas podem continuar exigindo aprovação.
Cases: Antes → Problema → O que construímos → Depois → Resultado. Só mencionar resultado, sistema, cliente ou métrica confirmados no material real fornecido. Sem fonte, pedir material; não preencher lacunas com um caso inventado. Exemplo hipotético deve ser explicitamente identificado e nunca apresentado como projeto realizado.
Não confundir a arte estática com Reel gravado. O roteiro falável para vídeo existe no estúdio; a versão em carrossel precisa funcionar sozinha. Conteúdo deve unir visão, conhecimento e execução.`,
  imagePrompt: `${willVisualStyle}
Feed 1080 × 1350 e stories 1080 × 1920. Margens laterais de referência: 72 px no feed; preservar áreas seguras de stories. Corpo de referência 35–42 px e títulos 77–92 px, ajustando ao texto sem comprimir a fonte. Identificação discreta @eusouwill.dev e numeração pequena. Garantir contraste entre texto e fotografia com fundo ou degradê de proteção. Diagramas simples só como complemento quando explicarem o argumento. Evitar robôs decorativos, cérebros neon, hologramas e excesso de ícones. Não gerar foto de Will, logotipo próprio, tela de produto, código de cliente ou screenshot que não tenha sido fornecido. Se faltar material real para comprovar um case, pedir o material. Escrever somente os textos aprovados, com português e acentos corretos.`,
  reviewPrompt: `Revise como editor da marca @eusouwill.dev. Exija: português correto; clareza para empresário; aderência ao problema operacional; uma tese e um CTA; precisão na diferença entre software, integração, automação e agente; governança e limites de autonomia. Reprove alegações absolutas, métricas sem fonte, case inventado, screenshot fictício apresentado como real, garantia de retorno, fatos biográficos acrescentados e ferramentas sem contexto. Framework de maturidade é uma lente editorial, sem alegação de padrão oficial ou autoria exclusiva. Na revisão visual, confira todos os acentos, textos, contraste, margens e consistência da identidade. Nos três fixados, confira apresentação, categoria e atuação. Considere as orientações aprendidas deste perfil; nunca dispense a aprovação humana.`,
  textProvider: 'auto',
  reviewProvider: 'openai',
  imageProvider: 'openai',
  renderMode: 'editorial',
  imageModel: 'gpt-image-2.5-flare',
  approval: 'human',
  enabled: true,
  schedules: [],
};
type Plan = {
  date: string;
  title: string;
  original: string;
  pillar: string;
  slides: PostSlide[];
  caption: string;
  cta: string;
  script?: string;
  needs?: string;
  stories: string;
};
const slide = (heading: string, body = ''): PostSlide => ({
  heading,
  body,
  imagePrompt:
    'Seguir o piloto aprovado: fotografia real relacionada à mensagem, com origem e licença registradas; Poppins Semibold 600 nos títulos, Regular 400 no corpo; grafite, branco suave e verde menta; margens generosas e texto alinhado à esquerda. Não inventar bastidores nem usar fotografia sintética.',
});
export const willPlan: Plan[] = [
  {
    date: '2026-10-26',
    title: 'Quem é o Will? De desenvolvedor a Operações Agênticas',
    original: 'Carrossel · Fixado 01',
    pillar: 'Visão e posicionamento',
    slides: [
      slide(
        'Eu construo tecnologia há mais de 10 anos.',
        'Agora quero falar sobre o que vem depois do software.',
      ),
      slide('Comecei desenvolvendo sistemas.'),
      slide('O problema nem sempre estava no software isoladamente.'),
      slide('Estava na operação.', 'Planilhas → WhatsApp → CRM → ERP → e-mail → pessoas.'),
      slide(
        'Então vieram as integrações.',
        'Conectar sistemas para que a informação não precise ser carregada à mão.',
      ),
      slide(
        'Depois, as automações.',
        'Transformar etapas repetidas em fluxos que podem ser acompanhados.',
      ),
      slide(
        'E agora, os agentes de IA.',
        'Lidar com contexto e variações, com limites e supervisão.',
      ),
      slide('A tecnologia continua sendo o meio.'),
      slide(
        'Meu trabalho é transformar problemas reais de empresas em sistemas e operações melhores.',
      ),
      slide(
        'Sistemas. Automação. IA.',
        'Bem-vindo ao @eusouwill.dev. Que parte da sua operação mais precisa melhorar?',
      ),
    ],
    caption:
      'Comecei construindo sistemas. Com o tempo, ficou claro que o software é uma parte da solução: o trabalho também precisa fluir entre dados, ferramentas e pessoas. Este perfil vai mostrar como penso e construo essas conexões, da organização de um processo à aplicação de IA com supervisão. Meu ponto de partida é o problema da empresa. Que parte da sua operação mais precisa melhorar?',
    cta: 'Que parte da sua operação mais precisa melhorar?',
    stories:
      '1. Apresente a nova fase com uma foto real ou tela tipográfica. 2. Conte um problema operacional que você encontra com frequência. 3. Compartilhe o primeiro fixado com a pergunta do CTA.',
  },
  {
    date: '2026-10-28',
    title: 'O que é uma Operação Agêntica?',
    original: 'Carrossel · Fixado 02',
    pillar: 'Operações Agênticas',
    slides: [
      slide('O futuro não é colocar ChatGPT dentro da sua empresa.'),
      slide(
        'Comece pelo trabalho.',
        'Quais pessoas, dados e sistemas precisam conversar para uma tarefa acontecer?',
      ),
      slide(
        '0 · Manual → 1 · Digitalizada',
        'Do papel e da memória para registros digitais que podem ser consultados.',
      ),
      slide(
        '2 · Integrada → 3 · Automatizada',
        'Sistemas trocam informações; regras conhecidas executam etapas repetitivas.',
      ),
      slide(
        '4 · Agêntica supervisionada',
        'Agentes lidam com contexto, propõem ações e operam com limites e aprovação.',
      ),
      slide(
        '5 · Agêntica evolutiva',
        'A operação usa feedback e avaliação para melhorar, com governança e responsabilidade humana.',
      ),
      slide('Uma operação agêntica conecta pessoas, sistemas, dados, automações e agentes.'),
      slide(
        'Em qual nível sua empresa está?',
        'Use esta escada como uma lente de diagnóstico, não como uma corrida pela autonomia máxima.',
      ),
    ],
    caption:
      'Operações Agênticas é a lente que vou usar aqui para falar da evolução da operação. Não basta adicionar uma interface de conversa a dados desconectados. É preciso entender o processo, organizar a informação, integrar os sistemas e definir onde a automação e os agentes fazem sentido. A escada ajuda a discutir o próximo passo; não substitui um diagnóstico. Em qual nível sua empresa está?',
    cta: 'Em qual nível sua empresa está?',
    stories:
      '1. Pergunte se os sistemas da empresa conversam entre si. 2. Mostre a escada de maturidade. 3. Reposte o fixado comentando um degrau que costuma ser ignorado.',
  },
  {
    date: '2026-10-30',
    title: 'Como eu posso transformar uma operação',
    original: 'Carrossel · Fixado 03',
    pillar: 'Operações e negócios',
    slides: [
      slide('Onde a IA realmente entra dentro de uma empresa?'),
      slide(
        'Eu começo pelo problema.',
        'Atendimento lento? Informação duplicada? Cobrança manual? O diagnóstico vem antes da ferramenta.',
      ),
      slide(
        'Atendimento e comercial',
        'Organizar histórico, integrar canais e apoiar o próximo passo com contexto.',
      ),
      slide(
        'Financeiro, cobrança e contratos',
        'Conectar informações e automatizar regras, com conferência humana no que exige decisão.',
      ),
      slide(
        'Operação, marketing e gestão',
        'Reduzir cópias manuais e tornar o andamento do trabalho visível.',
      ),
      slide(
        'Sistemas + integrações + automação + agentes + dados',
        'A combinação depende do processo, do risco e do que precisa melhorar.',
      ),
      slide(
        'Eu não começo pela IA.',
        'Começo pelo problema. Qual tarefa hoje depende de copiar informação entre sistemas?',
      ),
    ],
    caption:
      'Minha atuação conecta desenvolvimento de software ao funcionamento da empresa. Às vezes o próximo passo é organizar dados. Em outros casos é integrar dois sistemas ou automatizar uma regra conhecida. Um agente pode fazer parte da solução, desde que tenha contexto, limites e supervisão. Qual tarefa hoje depende de copiar informação entre sistemas?',
    cta: 'Qual tarefa hoje depende de copiar informação entre sistemas?',
    stories:
      '1. Mostre os tipos de problema que você ajuda a diagnosticar. 2. Pergunte onde a operação perde mais tempo. 3. Reposte o fixado acrescentando: o primeiro passo é entender o processo.',
  },
  {
    date: '2026-11-02',
    title: 'Sua empresa talvez ainda não precise de IA',
    original: 'Reel',
    pillar: 'Operações e negócios',
    slides: [
      slide('Sua empresa talvez ainda não precise de IA.'),
      slide(
        'Dados bagunçados não viram contexto confiável.',
        'Cadastros duplicados e planilhas sem referência dificultam qualquer decisão.',
      ),
      slide(
        'Um agente por cima disso pode acelerar o erro.',
        'Mais velocidade não corrige a origem da informação.',
      ),
      slide(
        'Primeiro organize. Depois integre.',
        'Defina o que vale como informação correta e conecte o que precisa conversar.',
      ),
      slide(
        'Depois automatize. E avalie onde usar agentes.',
        'A solução precisa acompanhar a maturidade e o risco da tarefa.',
      ),
      slide(
        'O que precisa ser organizado antes da IA?',
        'Salve para usar na próxima conversa sobre tecnologia na sua empresa.',
      ),
    ],
    caption:
      'Trabalho com IA e não parto da ideia de que toda empresa precisa começar por um agente. Informação confiável, processo definido e integração costumam ser parte da base. Onde essa base ainda é frágil, uma nova camada pode aumentar a confusão. O que precisa ser organizado antes da IA na sua empresa?',
    cta: 'O que precisa ser organizado antes da IA?',
    script:
      'Eu trabalho com IA e vou te dizer uma coisa: talvez sua empresa ainda não precise de um agente. Se cada setor usa uma planilha, existem cadastros duplicados e ninguém sabe qual informação está correta, colocar um agente por cima disso não resolve a origem do problema. Pode até acelerar o erro. Primeiro organize. Depois integre. Automatize as regras conhecidas. E então avalie onde um agente pode ajudar, com limites e supervisão. O próximo passo depende do processo, não da ferramenta da moda. O que precisa ser organizado antes da IA na sua empresa?',
    stories:
      '1. Pergunte se existe mais de uma versão do mesmo cadastro. 2. Conte por que isso atrapalha decisões. 3. Reposte o conteúdo com uma observação pessoal.',
  },
  {
    date: '2026-11-04',
    title: 'Os 6 níveis de maturidade de uma empresa',
    original: 'Carrossel',
    pillar: 'Operações Agênticas',
    slides: [
      slide('Em que nível sua operação está?', 'Uma escada para conversar sobre maturidade.'),
      slide('0 · Manual', 'O trabalho depende de papel, memória e execução individual.'),
      slide(
        '1 · Digitalizada',
        'A informação está em ferramentas digitais, mas pode continuar isolada.',
      ),
      slide('2 · Integrada', 'Os sistemas trocam dados e reduzem a necessidade de redigitar.'),
      slide(
        '3 · Automatizada',
        'Regras conhecidas executam etapas repetidas e registram o andamento.',
      ),
      slide(
        '4 · Agêntica supervisionada',
        'Agentes trabalham com contexto e limites claros, com aprovação quando necessário.',
      ),
      slide(
        '5 · Agêntica evolutiva',
        'Feedback e avaliação ajudam a melhorar a operação sob governança.',
      ),
      slide(
        'O próximo degrau começa na base.',
        'Salve e tente identificar onde sua empresa está hoje.',
      ),
    ],
    caption:
      'A escada de maturidade é uma referência editorial para entender o funcionamento da operação. Ela não é uma classificação oficial nem uma obrigação de avançar até o último nível. Uma tarefa simples pode funcionar muito bem com integração e uma regra clara. Salve e tente identificar onde sua empresa está hoje.',
    cta: 'Salve e identifique onde sua empresa está hoje.',
    stories:
      '1. Mostre uma situação manual comum. 2. Pergunte qual seria o próximo degrau útil. 3. Compartilhe a escada com seu diagnóstico, sem expor empresas.',
  },
  {
    date: '2026-11-06',
    title: 'Hoje qualquer pessoa consegue criar um sistema com IA. E isso muda tudo.',
    original: 'Reel',
    pillar: 'Sistemas e arquitetura',
    slides: [
      slide(
        'Criar software ficou mais acessível.',
        'Construir software bom continua exigindo decisões.',
      ),
      slide(
        'Gerar código é uma parte do trabalho.',
        'É preciso entender qual problema estamos resolvendo.',
      ),
      slide(
        'Modelar a operação e os dados',
        'O que precisa acontecer? Que informação é confiável?',
      ),
      slide(
        'Prever exceções e garantir segurança',
        'O que acontece quando uma etapa falha ou um acesso é indevido?',
      ),
      slide(
        'Integrar e manter em produção',
        'O sistema precisa funcionar com o restante da operação ao longo do tempo.',
      ),
      slide(
        'Menos barreira para construir. Mesma responsabilidade para entregar.',
        'Qual dessas decisões você considera mais difícil?',
      ),
    ],
    caption:
      'Hoje muito mais gente consegue começar um sistema usando IA. Isso amplia o acesso à construção de software. A responsabilidade continua em entender o problema, organizar os dados, prever exceções, proteger acessos, integrar e manter a solução funcionando. A qualidade aparece nas decisões que sustentam a operação. Qual dessas decisões você considera mais difícil?',
    cta: 'Qual dessas decisões você considera mais difícil?',
    script:
      'Hoje muito mais gente consegue criar um sistema usando IA. E eu acho isso excelente. Mas gerar código é só uma parte do trabalho. O difícil também é entender o problema, modelar a operação, estruturar dados, prever exceções, garantir segurança, integrar sistemas e manter tudo funcionando em produção. A IA pode reduzir o esforço de construção. Ela não elimina a responsabilidade pelas decisões. É aí que o trabalho de desenvolvimento continua fazendo diferença. Qual dessas partes você acha mais difícil?',
    stories:
      '1. Mostre um trecho real de uma decisão de projeto, sem dados confidenciais. 2. Explique o motivo da decisão. 3. Reposte o conteúdo destacando responsabilidade em produção.',
  },
  {
    date: '2026-11-09',
    title: 'Automação não é agente de IA',
    original: 'Reel',
    pillar: 'IA e agentes',
    slides: [
      slide('Nem toda automação precisa de IA.'),
      slide(
        'Regra conhecida? Comece pelo fluxo.',
        'Quando uma fatura vencer, registrar a pendência e enviar o aviso autorizado.',
      ),
      slide(
        'Isso é automação.',
        'A condição e a ação podem ser definidas de forma determinística.',
      ),
      slide(
        'E quando a tarefa exige contexto?',
        'Analisar o histórico de um cliente e sugerir uma abordagem pode exigir interpretação.',
      ),
      slide(
        'Talvez um agente faça sentido.',
        'Com dados adequados, limites, avaliação e aprovação conforme o risco.',
      ),
      slide(
        'Escolha pela tarefa, não pelo nome.',
        'Que parte do seu processo é regra e que parte exige contexto?',
      ),
    ],
    caption:
      'A diferença entre workflow e agente importa porque muda o desenho, o risco e a forma de verificar o resultado. Uma regra conhecida pode ser resolvida com automação simples. Uma tarefa com contexto e variação pode justificar IA. Essa escolha deve ser avaliada no processo concreto. Que parte do seu processo é regra e que parte exige contexto?',
    cta: 'Que parte do seu processo é regra e que parte exige contexto?',
    script:
      'Nem toda automação precisa de inteligência artificial. Se a regra é: quando uma fatura vencer, registre a pendência e envie um aviso autorizado, podemos desenhar um fluxo determinístico. Agora imagine analisar o histórico daquele cliente e sugerir a abordagem de contato. A tarefa passa a exigir contexto e interpretação. Talvez um agente faça sentido, com dados adequados e limites. Não é uma divisão perfeita: a escolha depende do risco e da possibilidade de verificar o resultado. Que parte do seu processo é regra e que parte exige contexto?',
    stories:
      '1. Traga uma regra simples do dia a dia. 2. Compare com uma tarefa que depende de contexto. 3. Peça exemplos do público.',
  },
  {
    date: '2026-11-11',
    title: 'Por trás de um sistema real que automatizamos',
    original: 'Bastidor / Case',
    pillar: 'Por trás do Sistema',
    slides: [],
    caption: '',
    cta: 'Qual etapa parecida ainda é manual na sua operação?',
    needs:
      'Informe um projeto real: problema, fluxo anterior, solução implementada, telas ou trechos autorizados, mudanças comprovadas e o que pode ser divulgado. Não é necessário identificar o cliente. Números só entram se forem reais e autorizados.',
    stories:
      '1. Grave uma tela real autorizada. 2. Explique o problema operacional. 3. Mostre uma etapa da solução, sem dados de clientes.',
  },
  {
    date: '2026-11-13',
    title: 'Seu problema provavelmente não é falta de IA',
    original: 'Reel',
    pillar: 'Operações e negócios',
    slides: [
      slide('Antes de perguntar onde colocar IA…', 'Pergunte onde sua operação perde contexto.'),
      slide(
        'Informação espalhada',
        'Um histórico no WhatsApp, outro no CRM, uma confirmação por e-mail.',
      ),
      slide(
        'Sistemas que não conversam',
        'A pessoa precisa reconstruir o contexto a cada passagem.',
      ),
      slide(
        'Dependência de quem sabe o caminho',
        'Quando essa pessoa não está, a tarefa para ou volta etapas.',
      ),
      slide(
        'Esses são os muros de contexto.',
        'Mapeie onde a informação se perde, se duplica ou precisa ser refeita.',
      ),
      slide(
        'Onde sua operação perde contexto?',
        'Escolha uma tarefa e acompanhe o caminho da informação.',
      ),
    ],
    caption:
      'Muros de contexto aparecem quando o trabalho atravessa sistemas e pessoas sem carregar a informação necessária. O problema pode parecer falta de IA, mas começar por integração e clareza do processo já muda a conversa. Escolha uma tarefa e acompanhe o caminho da informação: onde alguém precisa procurar, copiar ou perguntar tudo de novo?',
    cta: 'Onde sua operação perde contexto?',
    script:
      'Antes de perguntar onde colocar IA, pergunte onde sua operação perde contexto. Pense em uma tarefa que passa pelo WhatsApp, por uma planilha, pelo CRM e pelo e-mail. Em cada passagem, alguém pode ter de procurar informação, copiar dados ou explicar tudo de novo. Eu chamo esse atrito de muro de contexto. O primeiro passo é acompanhar uma tarefa real e identificar onde a informação se perde. Talvez o próximo investimento seja integração e clareza do processo. Onde sua operação perde contexto hoje?',
    stories:
      '1. Desenhe um fluxo genérico de informação. 2. Marque uma passagem em que o contexto se perde. 3. Abra uma pergunta sobre o processo do público.',
  },
  {
    date: '2026-11-16',
    title: '5 coisas que eu analisaria antes de colocar IA em uma empresa',
    original: 'Carrossel',
    pillar: 'Operações e negócios',
    slides: [
      slide('Antes da IA, eu olharia para estas 5 coisas.'),
      slide(
        '1 · Processo',
        'O que exatamente estamos tentando melhorar e quem responde por essa tarefa?',
      ),
      slide('2 · Dados', 'A informação é confiável, acessível e adequada ao uso?'),
      slide('3 · Sistemas', 'Onde o processo acontece e como as ferramentas trocam contexto?'),
      slide(
        '4 · Risco',
        'O que a IA pode fazer, quando precisa de aprovação e como tratar falhas?',
      ),
      slide(
        '5 · Métrica',
        'Como comparar o funcionamento anterior com o novo, usando dados reais?',
      ),
      slide(
        'IA precisa de processo, dados e verificação.',
        'Qual dessas cinco perguntas ainda está sem resposta na sua empresa?',
      ),
    ],
    caption:
      'Antes de escolher um modelo ou ferramenta, vale esclarecer processo, dados, sistemas, risco e métrica. Esse diagnóstico ajuda a discutir se a tarefa precisa de IA e o que seria necessário para usar a solução com responsabilidade. Qual dessas cinco perguntas ainda está sem resposta na sua empresa?',
    cta: 'Qual dessas cinco perguntas ainda está sem resposta na sua empresa?',
    stories:
      '1. Mostre as cinco perguntas. 2. Escolha uma e dê um exemplo hipotético identificado. 3. Convide o público a responder a mais difícil.',
  },
  {
    date: '2026-11-18',
    title: 'A IA não deveria tomar todas as decisões da sua empresa',
    original: 'Reel',
    pillar: 'IA e governança',
    slides: [
      slide('A IA não deveria tomar todas as decisões da sua empresa.'),
      slide('N1 · Sugere', 'A IA apresenta uma recomendação; uma pessoa decide e executa.'),
      slide(
        'N2 · Propõe e espera aprovação',
        'A ação fica preparada, mas só avança após confirmação.',
      ),
      slide(
        'N3 · Executa dentro de limites',
        'Regras de escopo, valor e permissão delimitam o que pode acontecer.',
      ),
      slide(
        'N4 · Executa e é auditada',
        'Registros e avaliação acompanham a execução; tarefas críticas podem continuar exigindo aprovação.',
      ),
      slide(
        'A autonomia certa para cada tarefa.',
        'Que decisão da sua operação deve continuar exigindo aprovação humana?',
      ),
    ],
    caption:
      'Autonomia é uma decisão de desenho. O nível adequado depende do impacto de um erro, das permissões, da possibilidade de reverter a ação e da qualidade da verificação. Esses quatro níveis ajudam a discutir o desenho, sem pressupor que máxima autonomia seja a melhor escolha. Que decisão da sua operação deve continuar exigindo aprovação humana?',
    cta: 'Que decisão deve continuar exigindo aprovação humana?',
    script:
      'A IA não deveria tomar todas as decisões da sua empresa. Eu gosto de discutir quatro níveis de autonomia. No primeiro, ela sugere. No segundo, prepara a ação e espera aprovação. No terceiro, executa dentro de limites definidos. No quarto, executa com registros e auditoria. Isso não significa liberar qualquer tarefa: decisões críticas podem continuar exigindo uma pessoa. A escolha depende do risco, da possibilidade de reverter o erro e de verificar o resultado. O objetivo é dar a autonomia certa para cada tarefa. Qual decisão você manteria sob aprovação humana?',
    stories:
      '1. Traga uma decisão de baixo risco e outra de alto risco. 2. Compare o nível de autonomia adequado. 3. Pergunte o que nunca deveria avançar sem aprovação.',
  },
  {
    date: '2026-11-20',
    title: 'Antes → Sistema → Automação → Resultado',
    original: 'Case',
    pillar: 'Por trás do Sistema',
    slides: [],
    caption: '',
    cta: 'Que gargalo operacional você gostaria de medir e melhorar?',
    needs:
      'Forneça um caso autorizado com Antes, Problema, O que construímos, Depois e Resultado. Especifique quais indicadores são comprovados e quais imagens podem ser divulgadas. Sem números, descreva apenas mudanças observáveis confirmadas.',
    stories:
      '1. Explique um gargalo real. 2. Mostre a mudança autorizada no fluxo. 3. Comente a forma usada para verificar o resultado.',
  },
  {
    date: '2026-11-23',
    title: 'Seu funcionário abre quantos sistemas para fazer uma única tarefa?',
    original: 'Reel',
    pillar: 'Sistemas e integração',
    slides: [
      slide('Quantos sistemas uma pessoa abre para concluir uma tarefa?'),
      slide(
        'CRM → e-mail → WhatsApp → ERP → planilha → documento',
        'Um exemplo de como uma operação pode espalhar o trabalho.',
      ),
      slide(
        'A pessoa virou a integração manual.',
        'Ela procura, copia, confere e transporta o contexto.',
      ),
      slide(
        'O desenho do processo também importa.',
        'Cobrar mais velocidade não resolve uma passagem mal definida entre sistemas.',
      ),
      slide(
        'Antes de substituir pessoas por IA…',
        'Avalie quais conexões e regras podem eliminar o retrabalho.',
      ),
      slide('Acompanhe uma tarefa do começo ao fim.', 'Em quantas ferramentas ela passa hoje?'),
    ],
    caption:
      'Quando uma pessoa precisa transportar a mesma informação entre várias ferramentas, parte do esforço está no desenho da operação. Integrar dados e automatizar regras pode ser um passo útil antes de adicionar um agente. O exemplo de seis sistemas é ilustrativo: acompanhe uma tarefa real da sua empresa e conte as passagens. Em quantas ferramentas ela passa?',
    cta: 'Em quantas ferramentas uma tarefa passa hoje?',
    script:
      'Seu funcionário abre quantos sistemas para fazer uma única tarefa? Imagine CRM, e-mail, WhatsApp, ERP, planilha e documento. Esse é um exemplo ilustrativo, mas mostra um problema comum: a pessoa precisa atuar como integração manual, copiando dados e remontando contexto. A solução não começa necessariamente com um agente. Pode começar com uma conexão entre sistemas e uma regra clara. Antes de substituir pessoas por IA, avalie o trabalho de integração que elas fazem à mão. Em quantas ferramentas uma tarefa passa hoje?',
    stories:
      '1. Liste as ferramentas de uma tarefa real sem expor dados. 2. Mostre um ponto de redigitação. 3. Pergunte quantas passagens o público contou.',
  },
  {
    date: '2026-11-25',
    title: 'Se eu entrasse hoje em uma empresa tradicional, começaria por aqui',
    original: 'Carrossel',
    pillar: 'Eu Automatizaria Isso',
    slides: [
      slide(
        'Se eu entrasse hoje em uma empresa tradicional…',
        'Procuraria estas oportunidades antes de escolher ferramentas.',
      ),
      slide(
        'Dados digitados duas vezes',
        'A mesma informação aparece em mais de um lugar sem uma origem definida.',
      ),
      slide(
        'Informação copiada entre sistemas',
        'Uma pessoa funciona como a ponte para o processo continuar.',
      ),
      slide(
        'Documentos e mensagens repetidos',
        'Modelos e regras podem reduzir etapas manuais, com conferência adequada.',
      ),
      slide(
        'Cobranças internas por prazo',
        'O andamento fica escondido e alguém precisa perguntar tudo de novo.',
      ),
      slide(
        'Decisões simples com regras conhecidas',
        'Primeiro torne a regra explícita. Depois avalie a automação.',
      ),
      slide(
        'Informação procurada em várias ferramentas',
        'Observe onde falta contexto para concluir a tarefa.',
      ),
      slide(
        'Repetição, contexto e regra apontam oportunidades.',
        'Qual dessas situações aparece na sua empresa?',
      ),
    ],
    caption:
      'Esta é a primeira pauta da série Eu Automatizaria Isso. A ideia é mostrar oportunidades de melhoria pelo funcionamento da operação. Os exemplos são critérios de observação, não um diagnóstico pronto sobre qualquer empresa. Depois podemos aplicar a mesma lente a um escritório contábil, uma imobiliária ou uma indústria. Qual dessas situações aparece na sua empresa?',
    cta: 'Qual dessas situações aparece na sua empresa?',
    stories:
      '1. Escolha uma das oportunidades. 2. Explique como observar o processo antes de agir. 3. Peça um segmento para o próximo episódio.',
  },
  {
    date: '2026-11-27',
    title: 'O que estou construindo com IA na prática',
    original: 'Reel / Bastidor',
    pillar: 'Construindo com IA',
    slides: [],
    caption: '',
    cta: 'Qual parte desse processo você gostaria de entender melhor?',
    needs:
      'Informe a funcionalidade real em desenvolvimento, o problema que resolve, dados que o agente acessa, limites de execução, estágio do projeto e o que está autorizado mostrar. Não inventar tela, arquitetura, cliente ou resultados.',
    stories:
      '1. Use uma gravação real de trabalho autorizada. 2. Explique uma decisão de arquitetura em linguagem simples. 3. Pergunte qual parte o público quer ver no próximo conteúdo.',
  },
];
