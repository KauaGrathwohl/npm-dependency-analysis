# npm-dependency-analysis

**Ferramenta de coleta de dados para análise do impacto das atualizações de dependências no esforço de manutenção em projetos open-source do ecossistema NPM.**

---

## Contexto Acadêmico

Este projeto é parte de um Trabalho de Conclusão de Curso (TCC) em Engenharia de Software, cuja pesquisa investiga empiricamente como atualizações de dependências (major, minor, patch) afetam o esforço de manutenção em projetos open-source do ecossistema Node.js/NPM.

### Pergunta de Pesquisa

> *Como as atualizações de dependências impactam o esforço de manutenção em projetos open-source do ecossistema NPM?*

### Objetivos Específicos

1. Identificar padrões de atualização de dependências em projetos open-source
2. Mensurar indicadores de esforço de manutenção
3. Analisar correlações entre atualizações de dependências e atividades de manutenção
4. Propor um workflow estruturado para gerenciamento de dependências

---

## Critérios de Seleção do Dataset

Os repositórios analisados devem satisfazer **todos** os critérios abaixo:

| Critério | Valor |
|---|---|
| Hospedagem | GitHub |
| Linguagem | Node.js / JavaScript |
| Arquivo obrigatório | `package.json` |
| Gerenciador de dependências | npm |
| Estrelas mínimas | 500 |
| Commits mínimos | 100 |
| Atividade recente | Último push nos últimos 12 meses |
| Licença | Open-source |

**Tamanho da amostra:** 50 repositórios  
**Período de análise:** últimos 24 meses

---

## Métricas Coletadas

### Métricas de Atualização de Dependências

- Total de atualizações de dependências
- Classificação por tipo (major, minor, patch) via SemVer
- Número de dependências diretas
- Número de dependências transitivas (via `package-lock.json`)

### Métricas de Esforço de Manutenção

- Commits relacionados a atualizações de dependências
- Pull requests envolvendo dependências
- Issues sobre problemas de dependências
- Tempo médio de merge de PRs de dependências

### Detecção de Atualizações

A ferramenta identifica atualizações de dependências por duas estratégias complementares:

1. **Análise de arquivos:** mudanças em `package.json` e `package-lock.json`
2. **Análise de mensagens de commit:** palavras-chave como `chore(deps)`, `update dependency`, `bump`, `dependabot`, `renovate`

---

## Arquitetura

```
npm-dependency-analysis/
├── src/
│   ├── index.js                  # Ponto de entrada CLI
│   ├── config/
│   │   ├── index.js              # Configuração centralizada
│   │   └── logger.js             # Sistema de logging
│   ├── services/
│   │   ├── github-client.js      # Cliente GitHub API (REST + throttling)
│   │   └── cache-manager.js      # Cache em disco para respostas da API
│   ├── collectors/
│   │   ├── repository-selector.js  # Seleção e validação de repositórios
│   │   ├── dependency-detector.js  # Detecção de atualizações de deps
│   │   └── maintenance-metrics.js  # Coleta de métricas de manutenção
│   ├── parsers/
│   │   └── semver-parser.js      # Classificação SemVer e diff de deps
│   ├── exporters/
│   │   └── data-exporter.js      # Exportação JSON e CSV
│   └── pipeline/
│       └── index.js              # Orquestração do pipeline de coleta
├── data/
│   ├── output/                   # Dados coletados (gerado)
│   └── cache/                    # Cache de requisições (gerado)
├── logs/                         # Logs de execução (gerado)
├── .env.example                  # Template de variáveis de ambiente
├── .gitignore
├── package.json
├── AGENTS.md                     # Instruções de pesquisa para IA
└── README.md
```

### Padrões de Projeto Utilizados

| Padrão | Onde | Justificativa |
|---|---|---|
| **Configuration-based** | `src/config/` | Todos os parâmetros da pesquisa (critérios de seleção, keywords, período de análise) ficam centralizados, eliminando valores hardcoded |
| **Singleton + Facade** | `github-client.js` | Uma única instância do cliente com throttling automático. A fachada simplifica chamadas REST complexas |
| **Strategy** | `dependency-detector.js` | Duas estratégias de detecção (keyword + file-change) aplicadas de forma complementar para reduzir falsos negativos |
| **Pipeline** | `pipeline/index.js` | Fases sequenciais e independentes (select → collect → export) que podem ser re-executadas isoladamente |
| **Repository** | `collectors/` | Cada coletor encapsula o acesso a dados de um domínio específico, desacoplando lógica de negócio da API |
| **Cache-Aside** | `cache-manager.js` | Evita requisições duplicadas em re-execuções, preservando rate limit da API |

---

## Como Funciona

O pipeline de coleta opera em três fases sequenciais:

### Fase 1: Seleção de Repositórios
1. Consulta a GitHub Search API com filtros (linguagem, estrelas, atividade)
2. Para cada candidato, valida: presença de `package.json`, uso de npm, contagem de commits
3. Seleciona os primeiros 50 repositórios que atendem a todos os critérios

### Fase 2: Coleta de Dados (por repositório)
1. **Detecta commits de dependência** — filtra por keywords e por mudanças em `package.json`/`package-lock.json`
2. **Analisa mudanças de versão** — compara `package.json` entre commits e classifica updates (major/minor/patch)
3. **Captura snapshot de dependências** — conta diretas e transitivas
4. **Coleta métricas de manutenção** — PRs, issues e tempos de merge relacionados a dependências

### Fase 3: Exportação
1. `full-dataset.json` — dataset completo com todos os detalhes
2. `repositories-summary.csv` — visão tabular para análise estatística
3. `dependency-changes.csv` — cada mudança individual de dependência
4. `collection-metadata.json` — metadados da coleta (data, critérios, configuração)

---

## Configuração do Ambiente

### Pré-requisitos

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Token de acesso pessoal do GitHub** com permissão `public_repo`

### Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/npm-dependency-analysis.git
cd npm-dependency-analysis

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite .env e adicione seu GITHUB_TOKEN
```

### Criação do Token GitHub

1. Acesse [github.com/settings/tokens](https://github.com/settings/tokens)
2. Clique em "Generate new token (classic)"
3. Selecione o escopo `public_repo`
4. Copie o token gerado e cole no arquivo `.env`

---

## Execução

### Pipeline Completo
```bash
npm start collect
```

### Executar Apenas Seleção de Repositórios
```bash
npm start select
```

### Retomar Coleta de Repositórios Já Selecionados
```bash
npm start resume
# ou especificando um arquivo
npm start resume -- -f data/output/selected-repositories.json
```

### Validar Configuração
```bash
npm start validate
```

---

## Saída Esperada

Após a execução completa, o diretório `data/output/` conterá:

| Arquivo | Formato | Descrição |
|---|---|---|
| `full-dataset.json` | JSON | Dataset completo com todas as métricas e detalhes |
| `repositories-summary.csv` | CSV | Uma linha por repositório com métricas consolidadas |
| `dependency-changes.csv` | CSV | Uma linha por mudança de dependência individual |
| `collection-metadata.json` | JSON | Parâmetros da coleta para reprodutibilidade |
| `selected-repositories.json` | JSON | Lista de repositórios selecionados |

O CSV `repositories-summary.csv` contém as colunas:

```
repository, stars, direct_dependencies, transitive_dependencies,
dep_update_commits, total_dep_updates, major_updates, minor_updates,
patch_updates, dep_pull_requests, merged_dep_prs, avg_merge_time_hours,
median_merge_time_hours, dep_issues, total_issues, total_prs
```

---

## Considerações Éticas e Acadêmicas

- **Dados públicos:** a ferramenta acessa exclusivamente repositórios públicos via API oficial do GitHub
- **Rate limiting:** respeita os limites da API com throttling automático
- **Reprodutibilidade:** a configuração centralizada e os metadados de coleta permitem reprodução exata do experimento
- **Sem fabricação de dados:** a ferramenta coleta dados reais; nenhuma métrica é estimada ou inventada
- **Cache:** requisições são cacheadas localmente por 24h para permitir re-execuções sem consumo adicional de rate limit

---

## Limitações

1. **Rate limit da API:** com 5.000 req/hora (token autenticado), a coleta completa de 50 repositórios com históricos extensos pode levar várias horas
2. **Detecção por keywords:** commits de dependência sem mensagens padronizadas podem não ser capturados pela estratégia de keywords
3. **Dependências transitivas:** a precisão depende da presença e versão do `package-lock.json` no repositório
4. **Monorepos:** repositórios com múltiplos `package.json` (workspaces) podem ter contagem parcial de dependências
5. **Contexto temporal:** a análise é limitada ao período de 24 meses, não capturando padrões de longo prazo
6. **Falsos positivos:** issues/PRs classificados por keywords podem incluir menções incidentais a dependências

---

## Trabalhos Futuros

- Suporte a monorepos (npm workspaces, lerna)
- Análise de segurança (CVEs em dependências desatualizadas)
- Módulo de análise estatística integrado (Spearman, regressão)
- Módulo de visualização (gráficos de distribuição e correlação)
- Suporte a outros gerenciadores (yarn, pnpm)
- Detecção de breaking changes via changelogs

---

## Licença

MIT

---

## Referências

Este projeto está alinhado com a pesquisa descrita em `AGENTS.md` e com o artigo acadêmico em desenvolvimento. As referências bibliográficas completas estão no manuscrito do TCC.
