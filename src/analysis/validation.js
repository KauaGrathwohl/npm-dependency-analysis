/**
 * Validação de Qualidade de Dados
 *
 * Script para auditoria manual de subamostra de dados coletados.
 * Implementa validação estratificada com análise de concordância.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import logger from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data/output');
const ANALYSIS_DIR = path.join(DATA_DIR, 'analysis');

/**
 * Carrega dados de summary de repositórios
 */
function loadRepositoriesSummary() {
  const filePath = path.join(DATA_DIR, 'repositories-summary.csv');
  const content = fs.readFileSync(filePath, 'utf-8');
  return parse(content, {
    columns: true,
    cast: true,
  });
}

/**
 * Carrega dados de mudanças de dependência
 */
function loadDependencyChanges() {
  const filePath = path.join(DATA_DIR, 'dependency-changes.csv');
  const content = fs.readFileSync(filePath, 'utf-8');
  return parse(content, {
    columns: true,
  });
}

/**
 * Estratifica repositórios por tamanho e atividade
 */
function stratifyRepositories(repos) {
  const strata = {
    small_low: [],
    small_high: [],
    medium_low: [],
    medium_high: [],
    large_low: [],
    large_high: [],
  };

  // Calcular percentis
  const depCounts = repos.map((r) => parseInt(r.direct_dependencies) || 0).sort((a, b) => a - b);
  const updateCounts = repos.map((r) => parseInt(r.total_dep_updates) || 0).sort((a, b) => a - b);

  const depP50 = depCounts[Math.floor(depCounts.length / 2)];
  const updateP50 = updateCounts[Math.floor(updateCounts.length / 2)];

  // Distribuir em strata
  repos.forEach((repo) => {
    const deps = parseInt(repo.direct_dependencies) || 0;
    const updates = parseInt(repo.total_dep_updates) || 0;

    const depSize = deps <= depP50 ? 'small' : 'large';
    const depActivity = updates <= updateP50 ? 'low' : 'high';

    const key = `${depSize}_${depActivity}`;
    strata[key].push(repo);
  });

  return strata;
}

/**
 * Seleciona amostra estratificada (5-10% total)
 */
function selectStratifiedSample(repos, samplePercentage = 0.075) {
  const strata = stratifyRepositories(repos);
  const sample = [];
  const totalSample = Math.ceil(repos.length * samplePercentage);
  const perStrata = Math.ceil(totalSample / 6);

  Object.entries(strata).forEach(([_, items]) => {
    const n = Math.min(perStrata, items.length);
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * items.length);
      sample.push(items.splice(idx, 1)[0]);
    }
  });

  return sample.slice(0, totalSample);
}

/**
 * Extrai commits de mudanças de um repositório
 */
function getRepositoryChanges(changes, repoName) {
  return changes.filter((c) => c.repository === repoName);
}

/**
 * Valida classificação SemVer
 * Retorna [classificação, éCorreto]
 */
function validateSemVerClassification(fromVersion, toVersion, declaredType) {
  try {
    // Parse versões simplificado (remove ^ ~ v)
    const cleanFrom = fromVersion.replace(/^[\^~v]/, '').split('-')[0];
    const cleanTo = toVersion.replace(/^[\^~v]/, '').split('-')[0];

    const [majorFrom, minorFrom, patchFrom] = cleanFrom.split('.').map(Number);
    const [majorTo, minorTo, patchTo] = cleanTo.split('.').map(Number);

    // Validar consistência
    if (majorTo > majorFrom) {
      const isCorrect = declaredType === 'major';
      return { detected: 'major', isCorrect };
    } else if (minorTo > minorFrom) {
      const isCorrect = declaredType === 'minor';
      return { detected: 'minor', isCorrect };
    } else if (patchTo > patchFrom) {
      const isCorrect = declaredType === 'patch';
      return { detected: 'patch', isCorrect };
    } else {
      const isCorrect = declaredType === 'none' || declaredType === 'patch';
      return { detected: 'none', isCorrect };
    }
  } catch (err) {
    return { detected: 'error', isCorrect: false, error: err.message };
  }
}

/**
 * Audita amostra selecionada
 */
function auditSample(repos, changes, sample) {
  const auditResults = [];
  let totalValidations = 0;
  let correctValidations = 0;

  sample.forEach((repo) => {
    const repoChanges = getRepositoryChanges(changes, repo.repository);

    // Selecionar até 10 mudanças por repositório para auditoria
    const samplesToAudit = repoChanges.slice(0, Math.min(10, repoChanges.length));

    samplesToAudit.forEach((change) => {
      const validation = validateSemVerClassification(
        change.from_version,
        change.to_version,
        change.update_type
      );

      totalValidations++;
      if (validation.isCorrect) correctValidations++;

      auditResults.push({
        repository: repo.repository,
        package: change.package_name,
        from: change.from_version,
        to: change.to_version,
        declaredType: change.update_type,
        detectedType: validation.detected,
        concordant: validation.isCorrect ? 'Sim' : 'Não',
        error: validation.error || '',
      });
    });
  });

  return {
    results: auditResults,
    summary: {
      totalAudited: totalValidations,
      correctCount: correctValidations,
      errorCount: totalValidations - correctValidations,
      concordanceRate: ((correctValidations / totalValidations) * 100).toFixed(2),
      sampleSize: sample.length,
    },
  };
}

/**
 * Gera relatório de validação
 */
function generateValidationReport(auditData, repos) {
  const report = {
    timestamp: new Date().toISOString(),
    validationScope: 'Auditoria Manual de Subamostra Estratificada',
    sampleSize: auditData.summary.sampleSize,
    totalRepositories: repos.length,
    samplingPercentage: `${((auditData.summary.sampleSize / repos.length) * 100).toFixed(1)}%`,
    semverValidation: {
      totalValidated: auditData.summary.totalAudited,
      correct: auditData.summary.correctCount,
      incorrect: auditData.summary.errorCount,
      concordanceRate: `${auditData.summary.concordanceRate}%`,
      interpretation:
        auditData.summary.concordanceRate > 95
          ? 'Excelente - Taxa de concordância muito alta'
          : auditData.summary.concordanceRate > 85
            ? 'Bom - Taxa de concordância aceitável'
            : 'Atenção - Possíveis problemas de classificação',
    },
    dataQualityMetrics: {
      completenessRate: calculateCompleteness(auditData.results),
      nullValueRate: calculateNullRate(auditData.results),
      errorRate: `${((auditData.summary.errorCount / auditData.summary.totalAudited) * 100).toFixed(2)}%`,
    },
    detailedResults: auditData.results,
  };

  return report;
}

/**
 * Calcula taxa de completude
 */
function calculateCompleteness(results) {
  const requiredFields = ['repository', 'package', 'from', 'to', 'declaredType'];
  const total = results.length * requiredFields.length;
  let filled = 0;

  results.forEach((r) => {
    requiredFields.forEach((field) => {
      if (r[field] && r[field].toString().trim() !== '') filled++;
    });
  });

  return `${((filled / total) * 100).toFixed(2)}%`;
}

/**
 * Calcula taxa de valores nulos
 */
function calculateNullRate(results) {
  let nullCount = 0;
  let totalFields = 0;

  results.forEach((r) => {
    Object.values(r).forEach((v) => {
      totalFields++;
      if (!v || v.toString().trim() === '') nullCount++;
    });
  });

  return `${((nullCount / totalFields) * 100).toFixed(2)}%`;
}

/**
 * Executa validação completa
 */
async function runValidation() {
  logger.info('Iniciando validação de qualidade de dados...');

  try {
    logger.info('Carregando dados...');
    const repos = loadRepositoriesSummary();
    const changes = loadDependencyChanges();
    logger.info(
      `Carregados: ${repos.length} repositórios, ${changes.length} mudanças de dependência\n`
    );

    logger.info('Selecionando amostra estratificada...');
    const sample = selectStratifiedSample(repos);
    logger.info(
      `Amostra selecionada: ${sample.length} repositórios (${((sample.length / repos.length) * 100).toFixed(1)}%)\n`
    );

    logger.info('Auditando concordância de classificações SemVer...');
    const auditData = auditSample(repos, changes, sample);
    logger.info(`Validadas ${auditData.summary.totalAudited} mudanças\n`);

    logger.info('Gerando relatório...');
    const report = generateValidationReport(auditData, repos);

    const csvPath = path.join(ANALYSIS_DIR, 'validation-audit-details.csv');
    if (auditData.results.length > 0) {
      fs.writeFileSync(
        csvPath,
        'repository,package,from,to,declaredType,detectedType,concordant,error\n'.concat(
          auditData.results
            .map(
              (r) =>
                `"${r.repository}","${r.package}","${r.from}","${r.to}","${r.declaredType}","${r.detectedType}","${r.concordant}","${r.error}"`
            )
            .join('\n')
        )
      );
      logger.info(`Detalhes salvos em: validation-audit-details.csv\n`);
    }

    const reportPath = path.join(ANALYSIS_DIR, 'validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    logger.info(`Relatório salvo em: ${path.relative('.', reportPath)}\n`);

    logger.info('═══════════════════════════════════════════════════');
    logger.info('RESUMO DE VALIDAÇÃO');
    logger.info('═══════════════════════════════════════════════════');
    logger.info(`Amostra auditada: ${report.sampleSize}/${report.totalRepositories} repositórios`);
    logger.info(`Mudanças validadas: ${report.semverValidation.totalValidated}`);
    logger.info(`Taxa de concordância SemVer: ${report.semverValidation.concordanceRate}`);
    logger.info(`Completude de dados: ${report.dataQualityMetrics.completenessRate}`);
    logger.info(`Taxa de erro: ${report.dataQualityMetrics.errorRate}`);
    logger.info(`Status: ${report.semverValidation.interpretation}`);
    logger.info('═══════════════════════════════════════════════════\n');

    return report;
  } catch (err) {
    logger.error('Erro durante validação:', err.message);
    throw err;
  }
}

export {
  runValidation,
  loadRepositoriesSummary,
  loadDependencyChanges,
  stratifyRepositories,
  selectStratifiedSample,
  validateSemVerClassification,
  auditSample,
  generateValidationReport,
};
