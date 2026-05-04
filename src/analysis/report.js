function formatStatValue(value) {
  return value === null || value === undefined || Number.isNaN(value) ? '' : value;
}

function toMarkdownTable(headers, rows) {
  const headerLine = `| ${headers.join(' | ')} |`;
  const separatorLine = `| ${headers.map(() => '---').join(' | ')} |`;
  const bodyLines = rows.map((row) => `| ${headers.map((header) => row[header]).join(' | ')} |`);

  return [headerLine, separatorLine, ...bodyLines].join('\n');
}

export function buildReport(summary) {
  const topRows = summary.topRepositories
    .map((row) => ({
      repository: row.repository,
      'updates totais': row.total_dep_updates,
      'PRs de dependência': row.dep_pull_requests,
      'issues de dependência': row.dep_issues,
      'razão Inc/Man': row.inc_man_ratio === null ? 'N/A' : row.inc_man_ratio.toFixed(2),
    }))
    .slice(0, 10);

  const correlationRows = summary.correlations.map((item) => ({
    variavel_x: item.xField,
    variavel_y: item.yField,
    n: item.n,
    rho: formatStatValue(item.rho === null ? null : item.rho.toFixed(4)),
    forca: item.strength,
  }));

  return [
    '# Análise Estatística',
    '',
    `- Amostra analisada: ${summary.sampleSize} repositórios`,
    `- Janela temporal: ${summary.analysisMonths} meses`,
    `- Arquivo de entrada: ${summary.inputFile}`,
    '',
    '## Visão Geral',
    '',
    '| Métrica | Valor |',
    '| --- | --- |',
    `| Repositórios | ${summary.sampleSize} |`,
    `| Média de atualizações totais | ${summary.numericStats.total_dep_updates.mean?.toFixed(2) ?? 'N/A'} |`,
    `| Mediana de atualizações totais | ${summary.numericStats.total_dep_updates.median?.toFixed(2) ?? 'N/A'} |`,
    `| Média de PRs de dependência | ${summary.numericStats.dep_pull_requests.mean?.toFixed(2) ?? 'N/A'} |`,
    `| Média de issues de dependência | ${summary.numericStats.dep_issues.mean?.toFixed(2) ?? 'N/A'} |`,
    '',
    '## Top 10 Repositórios por Volume de Atualizações',
    '',
    toMarkdownTable(
      [
        'repository',
        'updates totais',
        'PRs de dependência',
        'issues de dependência',
        'razão Inc/Man',
      ],
      topRows
    ),
    '',
    '## Correlações de Spearman',
    '',
    toMarkdownTable(['variavel_x', 'variavel_y', 'n', 'rho', 'forca'], correlationRows),
    '',
  ].join('\n');
}

export default { buildReport };
