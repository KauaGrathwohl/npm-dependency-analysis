import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import logger from '../config/logger.js';
import config from '../config/index.js';
import { parseCsvRecords } from '../parsers/csv-parser.js';
import { exportAnalysisArtifacts } from '../exporters/analysis-exporter.js';
import { buildNumericStats, buildCorrelationRows } from './statistics.js';
import { buildCaseRows, buildTopRepositories } from './transforms.js';
import { buildReport } from './report.js';
import { runValidation } from './validation.js';
import { generateVisualizations } from './visualizations.js';

export async function runAnalysis() {
  const inputFile = resolve(config.paths.output, 'repositories-summary.csv');

  if (!existsSync(inputFile)) {
    throw new Error(`Arquivo de entrada não encontrado: ${inputFile}`);
  }

  const csvContent = readFileSync(inputFile, 'utf-8');
  const rows = parseCsvRecords(csvContent);

  if (rows.length === 0) {
    throw new Error('Nenhum dado encontrado em repositories-summary.csv');
  }

  const caseRows = buildCaseRows(rows);
  const numericStats = buildNumericStats(rows);
  const correlations = buildCorrelationRows(rows);
  const topRepositories = buildTopRepositories(caseRows);

  const summary = {
    generatedAt: new Date().toISOString(),
    inputFile,
    outputDir: config.paths.analysis,
    sampleSize: rows.length,
    analysisMonths: config.research.analysisMonths,
    numericStats,
    correlations,
    topRepositories,
  };

  const report = buildReport(summary);

  const descriptiveRows = config.analysis.numericFields.map((field) => ({
    field,
    count: summary.numericStats[field].count,
    mean: summary.numericStats[field].mean ?? '',
    median: summary.numericStats[field].median ?? '',
    min: summary.numericStats[field].min ?? '',
    max: summary.numericStats[field].max ?? '',
    stdDev: summary.numericStats[field].stdDev ?? '',
    q1: summary.numericStats[field].q1 ?? '',
    q3: summary.numericStats[field].q3 ?? '',
  }));

  const correlationRows = correlations.map((item) => ({
    x_field: item.xField,
    y_field: item.yField,
    n: item.n,
    spearman_rho: item.rho === null ? '' : item.rho.toFixed(4),
    strength: item.strength,
  }));

  exportAnalysisArtifacts({ summary, caseRows, descriptiveRows, correlationRows, report });

  logger.info(`Análise estatística concluída para ${rows.length} repositórios.`);
  logger.info(`Saídas geradas em: ${config.paths.analysis}`);

  // Executar validação de qualidade
  logger.info('Iniciando validação de qualidade de dados...');

  await runValidation();

  // Gerar visualizações
  logger.info('Gerando visualizações...');
  await generateVisualizations();

  logger.info('Pipeline de análise concluído com sucesso!');

  return summary;
}

export default { runAnalysis };
