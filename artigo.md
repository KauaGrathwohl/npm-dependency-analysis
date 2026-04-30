**ANÁLISE DO IMPACTO DAS ATUALIZAÇÕES DE DEPENDÊNCIAS NO ESFORÇO DE MANUTENÇÃO EM PROJETOS OPEN-SOURCE DO ECOSSISTEMA NPM** 

**Kauã Machado Grathwohl[^1]**  
**Augusto Preis Tomasi1**  
**Ramon Venson[^2]**

**Resumo:** Esta pesquisa analisa o impacto das atualizações de dependências no esforço de manutenção em projetos *open-source* integrados ao ecossistema NPM. A gestão de bibliotecas e *frameworks* é abordada como um aspecto crítico do desenvolvimento de software, frequentemente preterido em função da entrega de novas funcionalidades. O estudo investiga a importância técnica e estratégica da atualização contínua, discutindo riscos associados à obsolescência, tais como a exposição a vulnerabilidades de segurança e o acúmulo de débito técnico, além de impactos na performance e na compatibilidade sistêmica. Como contribuição prática, propõe-se um fluxo de trabalho estruturado para a manutenção de dependências, fundamentado em automação, execução de testes e controle de versão semântico. Conclui-se que a atualização regular não se limita a uma boa prática de codificação, mas configura-se como um requisito fundamental para garantir a segurança, a estabilidade e a longevidade do software no ecossistema de código aberto.

**Palavras-chaves:** Dependências, Ecossistema, NPM, Manutenção de Software, *Open-Source*.

**1 INTRODUÇÃO**

O desenvolvimento de software tornou-se essencial para a sociedade contemporânea, estando presente em setores como indústria, serviços, comunicação, saúde e educação. A crescente dependência de sistemas computacionais capazes de evoluir continuamente impõe desafios que vão além da simples implementação de funcionalidades, demandando processos estruturados de manutenção ao longo de todo o ciclo de vida do software. Nesse cenário, a Engenharia de Software destaca a manutenção como uma das etapas mais custosas e críticas do desenvolvimento, especialmente em sistemas de médio e grande porte (WINTERS et al., 2020).

Com a popularização do paradigma de reutilização de código, projetos modernos passaram a incorporar bibliotecas, *frameworks* e pacotes de terceiros como estratégia para acelerar o desenvolvimento e reduzir custos. Segundo Winters et al. (2020), embora essa abordagem traga ganhos significativos de produtividade, ela introduz uma dependência constante de componentes externos, cujas evoluções ocorrem de forma independente do projeto consumidor. Dessa forma, o gerenciamento dessas dependências passa a exercer papel central na sustentabilidade do software ao longo do tempo.  
No contexto do ecossistema JavaScript, o *Node Package Manager (NPM)* destaca-se como um dos maiores repositórios de pacotes de código aberto, sendo amplamente adotado em aplicações web e serviços backend. A facilidade de incorporação de dependências oferecida pelo NPM resulta, contudo, na formação de cadeias complexas de dependências diretas e transitivas. De acordo com práticas discutidas pela *Google Cloud* (2024), pequenas alterações em bibliotecas centrais podem causar impactos expressivos em projetos que delas dependem, exigindo esforços adicionais de adaptação e validação.  
À medida que projetos de software evoluem, suas dependências são frequentemente atualizadas para corrigir falhas, aprimorar desempenho, garantir compatibilidade e mitigar vulnerabilidades de segurança. Entretanto, a atualização sistemática dessas dependências nem sempre é priorizada, muitas vezes sendo postergada em favor da entrega de novas funcionalidades. Estudos apontam que a postergação dessas atualizações contribui para o acúmulo de débito técnico e para o aumento do esforço de manutenção corretiva em estágios posteriores do projeto (MILLER et al., 2025).  
Em projetos *open-source*, essa problemática assume maior relevância, uma vez que a evolução do software depende do engajamento distribuído de mantenedores e colaboradores. A ausência de políticas consistentes de atualização pode levar à obsolescência de pacotes, dificultando a integração contínua e elevando o esforço necessário para manter o projeto funcional e seguro. Assim, compreender a relação entre atualizações de dependências e esforço de manutenção torna-se fundamental para a sustentabilidade desses projetos.

Apesar da crescente dependência de bibliotecas externas no ecossistema JavaScript, ainda são limitados os estudos empíricos que investigam de forma sistemática como as atualizações de dependências influenciam o esforço de manutenção em projetos open-source. Grande parte das pesquisas concentra-se em aspectos como vulnerabilidades de segurança ou evolução de bibliotecas, havendo menor atenção ao impacto dessas atualizações nas atividades de manutenção realizadas pelos desenvolvedores (KULA et al., 2018).  
Diante desse contexto, estabelece-se o seguinte problema de pesquisa: de que forma as atualizações de dependências impactam o esforço de manutenção em projetos open-source do ecossistema NPM? O objetivo geral deste trabalho é analisar esse impacto, considerando indicadores observáveis de manutenção. Como objetivos específicos, busca-se identificar padrões de atualização de dependências, avaliar métricas relacionadas ao esforço de manutenção, como *issues*, *pull* *requests* e *commits*. A pesquisa adota uma abordagem teórico-prática, aliando fundamentação conceitual a uma análise empírica baseada em dados reais extraídos de repositórios *open-source* por meio da *API* do GitHub. Dessa forma, o estudo contribui academicamente para a área de Engenharia de Software e, sob a perspectiva prática, oferece subsídios para que desenvolvedores e mantenedores adotem estratégias mais eficientes de atualização e manutenção, promovendo a longevidade e a confiabilidade dos sistemas de código aberto.

# **2 MATERIAIS E MÉTODOS**

Esta pesquisa adota abordagem quantitativa, de natureza observacional, com foco na relação entre atualizações de dependências e esforço de manutenção em projetos *open-source* do ecossistema NPM. O protocolo metodológico foi estruturado para garantir rastreabilidade dos dados coletados, reprodutibilidade das etapas analíticas e aderência aos objetivos do estudo.

2.1 MATERIAIS

Como fonte primária de dados, será utilizada a API da plataforma GitHub, amplamente empregada em estudos de mineração de repositórios de software (MOCKUS, 2009; KALLIAMVAKOU et al., 2016). Serão analisados os metadados, histórico de commits, pull requests e issues. Como fonte complementar, será utilizado o histórico dos próprios repositórios selecionados, com ênfase nos arquivos package.json e package-lock.json, por serem artefatos centrais para identificação de alterações de dependências.  
A amostra será composta por 50 repositórios open-source, selecionados conforme os seguintes critérios de inclusão: Hospedagem na plataforma GitHub e utilização do ecossistema Node.js;

* Presença do arquivo de configuração *package.json* e adoção do NPM como gerenciador de dependências;  
* Maturidade e relevância: popularidade mínima de 500 estrelas e histórico superior a 100 *commits*;  
* Atividade recente: evidência de contribuições ou atualizações nos últimos 12 meses.

Para a análise dos dados, definiu-se um recorte temporal correspondente aos últimos 12 meses de atividade de cada repositório selecionado.  
Para instrumentação da coleta, serão empregados scripts em Node.js, devido à compatibilidade com o objeto de estudo e à facilidade de integração com a API do GitHub. Os scripts produzirão artefatos tabulares em formato estruturado (por exemplo, CSV) para posterior análise estatística. Também serão utilizados controle de versão (Git) e documentação do protocolo de coleta para registrar decisões, parâmetros e eventuais exclusões de projetos.  
As variáveis observadas nesta pesquisa foram selecionadas para refletir tanto a dinâmica de evolução do ecossistema quanto a carga de trabalho imposta aos mantenedores. Estas variáveis estão organizadas em dois grupos fundamentais, conforme detalhado nas tabelas abaixo:

#### **Tabela 1: Caracterização das Atualizações de Dependências**

| Variável | Indicador / Descrição |
| :---- | :---- |
| **Volume de Atualizações** | Total de eventos de atualização identificados no repositório. |
| **Classificação SemVer** | Distribuição das atualizações por criticidade (Major, Minor, Patch) e consolidação por tipo analítico: incrementais (Minor) versus manutenção (Patch). |
| **Razão Inc/Man** | Razão entre atualizações incrementais e de manutenção por projeto e por janela temporal. |
| **Estrutura de Dependências** | Relação quantitativa entre dependências diretas e transitivas. |

Fonte: Do autor (2026)

#### **Tabela 2: Métricas de Esforço de Manutenção**

| Variável | Indicador / Descrição |
| :---- | :---- |
| **Atividade de Código** | Quantidade de commits relacionados à manutenção de versões. |
| **Fluxo de Integração** | Volume de Pull Requests gerados pelo processo de atualização. |
| **Suporte e Falhas** | Total de issues/bugs originados por quebras de compatibilidade. |
| **Tempo de Resposta** | Lead time médio para a integração (merge) das atualizações. |

Fonte: Do autor (2026)

2.2 MÉTODOS

O procedimento metodológico será executado em etapas sequenciais e auditáveis, com definição prévia de critérios para identificação de eventos de atualização de dependências. Para facilitar a compreensão do fluxo de trabalho, a execução da pesquisa está estruturada nas seguintes etapas:

1. **Seleção da Amostra:** Identificação e filtragem de repositórios conforme critérios de elegibilidade.  
2. **Coleta de Dados:** Extração de históricos de 12 meses e detecção de atualizações nos arquivos de configuração e *commits*.  
3. **Classificação:** Categorização das atualizações via *SemVer* e vínculo com indicadores de esforço.  
4. **Tratamento de Dados:** Limpeza, padronização e deduplicação dos registros coletados.  
5. **Análise e Discussão:** Aplicação de testes estatísticos e interpretação dos achados à luz da literatura.

Na etapa de seleção da amostra, os repositórios candidatos serão identificados por consultas automatizadas e filtrados pelos critérios de inclusão definidos na Seção 2.1. Em seguida, será realizada verificação de elegibilidade para confirmar aderência ao ecossistema NPM e atividade recente do projeto.  
Na etapa de coleta, serão extraídos dados referentes ao período de 12 meses para cada repositório aprovado. A identificação de atualizações de dependências será feita por duas estratégias complementares: (i) detecção de alterações nos arquivos *package.json* e *package-lock.json*; e (ii) varredura de *commits* com termos indicativos, tais como “*chore(deps)*”, “*update dependency*”, “*bump*” e “*dependabot*”.  
Na etapa de classificação, cada atualização identificada será categorizada em *major*, *minor* ou *patch* com base nas regras do versionamento semântico (PRESTON-WERNER, 2013). Para responder ao objetivo central do estudo, as atualizações também serão agregadas em dois grupos analíticos: (i) incrementais (*minor*), associadas à evolução funcional incremental; e (ii) de manutenção *(patch)* associadas predominantemente a correções e ajustes de estabilidade. Atualizações *major* serão tratadas em análise complementar, por representarem mudanças potencialmente disruptivas. Em paralelo, os eventos de manutenção serão vinculados aos respectivos *commits*, *pull requests* e *issues* para consolidar os indicadores de esforço de manutenção por projeto.  
Na etapa de tratamento dos dados, serão executadas rotinas de limpeza, padronização e deduplicação de registros. Registros inconsistentes, incompletos ou não rastreáveis serão sinalizados e tratados por regras previamente definidas no protocolo de coleta, preservando-se o histórico de decisões metodológicas.  
A análise dos dados será conduzida em dois níveis. No nível descritivo, serão calculadas medidas de tendência central e distribuição (média, mediana e distribuição) para todas as variáveis coletadas. No nível inferencial, será aplicado o coeficiente de correlação de Spearman para avaliar associações monotônicas entre frequência de atualização de dependências e indicadores de esforço de manutenção, sem pressupor normalidade das distribuições. A escolha por Spearman se justifica por três fatores metodológicos: (i) natureza não paramétrica da técnica, adequada quando não se assume normalidade; (ii) uso de postos, tornando a análise mais robusta a assimetrias e valores extremos; e (iii) aderência ao objetivo de identificar relações monotônicas entre variáveis de contagem e razão por projeto (Hauke; Kossowski, 2011).	  
Para apoiar a interpretação dos resultados, serão produzidas visualizações referentes à distribuição de dependências por projeto, frequência de atualizações e relação entre atualizações e esforço de manutenção. Em particular, serão destacadas: (i) a distribuição de atualizações incrementais (*minor*) versus de manutenção (*patch*); (ii) a razão Inc/Man por projeto; e (iii) o comportamento desses grupos em relação às métricas de esforço de manutenção. A discussão dos achados será conduzida em seção específica, distinguindo-se explicitamente resultados observados, interpretação analítica e limitações do estudo.  
Por fim, visando reprodutibilidade, os scripts de coleta e análise, os parâmetros de execução e os critérios de filtragem serão documentados de forma transparente. Essa estratégia permitirá a replicação do estudo em novas janelas temporais ou em amostras ampliadas do ecossistema NPM.

**REFERÊNCIAS**

\[1\] WINTERS, Titus; MANSHRECK, Tom; WRIGHT, Hyrum. **Software Engineering at Google**: lessons learned from programming over time. Sebastopol: O’Reilly Media, 2020\. Disponível em: [https://abseil.io/resources/swe-book/html/ch21.html](https://abseil.io/resources/swe-book/html/ch21.html). Acesso em: 30 mar. 2026\.

\[2\] MILLER, Courtney et al. Understanding the response to open-source dependency abandonment in the npm ecosystem. In: PROCEEDINGS OF THE INTERNATIONAL CONFERENCE ON SOFTWARE ENGINEERING (ICSE 2025), 2025, Piscataway. **Anais** \[...\]. Piscataway: IEEE, 2025\. Disponível em: [https://courtney-e-miller.github.io/papers/QuantifyingOSSDependencyAbandonmentResponse.pdf](https://courtney-e-miller.github.io/papers/QuantifyingOSSDependencyAbandonmentResponse.pdf). Acesso em: 30 mar. 2026\.

\[3\] WINTERS, Titus; MANSHRECK, Tom; WRIGHT, Hyrum. **Software Engineering at Google**: lessons learned from programming over time. Sebastopol: O’Reilly Media, 2020\. Disponível em: [https://abseil.io/resources/swe-book/html/ch21.html](https://abseil.io/resources/swe-book/html/ch21.html). Acesso em: 11 abr. 2026\.

\[4\] GOOGLE CLOUD. **Software supply chain threats**. \[S. l.\]: Google Cloud Documentation, 2024\. Disponível em: [https://cloud.google.com/software-supply-chain-security/docs/attack-vectors](https://cloud.google.com/software-supply-chain-security/docs/attack-vectors). Acesso em: 11 abr. 2026\.

\[5\] KULA, Raula Gaikovina et al. Do developers update their library dependencies? An empirical study on the impact of security advisories. **Empirical Software Engineering**, \[s. l.\], v. 23, n. 1, p. 384-417, 2018\. Disponível em: [https://link.springer.com/article/10.1007/s10664-017-9521-5](https://link.springer.com/article/10.1007/s10664-017-9521-5). Acesso em: 11 abr. 2026\.

\[6\] PRESTON-WERNER, Tom. **Semantic Versioning 2.0.0.** \[S. l.\], 2013\. Disponível em: [https://semver.org/](https://semver.org/). Acesso em: 11 abr. 2026\.

\[7\] LATENDRESSE, J.; MUJAHID, S.; COSTA, D. E.; SHIHAB, E. **Not All Dependencies are Equal: An Empirical Study on Production Dependencies in NPM**. In: IEEE/ACM INTERNATIONAL CONFERENCE ON AUTOMATED SOFTWARE ENGINEERING (ASE), 37., 2022, Michigan. Proceedings \[...\]. Michigan: IEEE/ACM, 2022\. Disponível em: [Not All Dependencies are Equal: An Empirical Study on Production Dependencies in NPM \- Mozilla Foundation](https://www.mozillafoundation.org/en/research/library/not-all-dependencies-are-equal-an-empirical-study-on-production-dependencies-in-npm/). Acesso em: 12 abr. 2026\.

\[8\] LIU, C.; CHEN, S.; FAN, L.; CHEN, B.; LIU, Y.; PENG, X. **Demystifying the Vulnerability Propagation and Its Evolution via Dependency Trees in the NPM Ecosystem**. arXiv, n. 2201.03981, jan. 2022\. Disponível em: [https://arxiv.org/abs/2201.03981](https://arxiv.org/abs/2201.03981). Acesso em: 12 abr. 2026\.

\[9\] PINCKNEY, D.; CASSANO, F.; GUHA, A.; BELL, J. **A Large Scale Analysis of Semantic Versioning in NPM**. arXiv, n. 2304.00394, abr. 2023\. Disponível em: [https://arxiv.org/abs/2304.00394](https://arxiv.org/abs/2304.00394). Acesso em: 14 abr. 2026\.

\[10\] WEERADDANA, N. R.; ALFADEL, M.; MCINTOSH, S. **Dependency-Induced Waste in Continuous Integration: An Empirical Study of Unused Dependencies in the npm Ecosystem**. Proceedings of the ACM on Software Engineering, v. 1, n. FSE, p. 2632-2655, jul. 2024\. Disponível em: [https://www.researchgate.net/publication/379959778\_Dependency-Induced\_Waste\_in\_Continuous\_Integration\_An\_Empirical\_Study\_of\_Unused\_Dependencies\_in\_the\_npm\_Ecosystem](https://www.researchgate.net/publication/379959778_Dependency-Induced_Waste_in_Continuous_Integration_An_Empirical_Study_of_Unused_Dependencies_in_the_npm_Ecosystem). Acesso em: 14 abr. 2026\.