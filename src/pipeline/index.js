import pLimit from 'p-limit';
import ora from 'ora';
import { selectRepositories } from '../collectors/repository-selector.js';
import {
  detectDependencyUpdates,
  analyzeDependencyChanges,
  collectDependencySnapshot,
} from '../collectors/dependency-detector.js';
import { collectMaintenanceMetrics } from '../collectors/maintenance-metrics.js';
import { exportDataset, exportJSON } from '../exporters/data-exporter.js';
import { getRateLimit } from '../services/github-client.js';
import config from '../config/index.js';
import logger from '../config/logger.js';

function summarizeUpdates(changes) {
  const summary = { total: 0, major: 0, minor: 0, patch: 0, unknown: 0 };

  for (const change of changes) {
    const allDeps = [...(change.dependencies || []), ...(change.devDependencies || [])];

    for (const dep of allDeps) {
      if (dep.type !== 'updated') continue;

      summary.total++;

      if (dep.updateType === 'major') {
        summary.major++;
      } else if (dep.updateType === 'minor') {
        summary.minor++;
      } else if (dep.updateType === 'patch') {
        summary.patch++;
      } else {
        summary.unknown++;
      }
    }
  }

  return summary;
}

async function collectRepositoryData(repo) {
  const { owner, name, fullName } = repo;

  logger.info(`\n${'='.repeat(60)}\nProcessando: ${fullName}\n${'='.repeat(60)}`);

  const depCommits = await detectDependencyUpdates(owner, name);

  const [dependencyChanges, dependencySnapshot, maintenanceMetrics] = await Promise.all([
    analyzeDependencyChanges(owner, name, depCommits),
    collectDependencySnapshot(owner, name),
    collectMaintenanceMetrics(owner, name, depCommits.length)
  ]);

  const updateSummary = summarizeUpdates(dependencyChanges);

  return {
    ...repo,
    depCommits,
    dependencyChanges,
    dependencySnapshot,
    maintenanceMetrics,
    updateSummary,
    collectedAt: new Date().toISOString(),
  };
}

export async function runPhaseSelect() {
  const { selected, rejected } = await selectRepositories();

  logger.info('=== FASE 1: Seleção de Repositórios ===');

  exportJSON(selected, 'selected-repositories');
  exportJSON(rejected, 'rejected-repositories');

  logger.info(`Repositórios selecionados: ${selected.length}`);

  return selected;
}

export async function runPhaseCollect(repositories) {
  const limit = pLimit(config.concurrency.limit);
  const results = [];
  const errors = [];

  let completed = 0;

  logger.info('=== FASE 2: Coleta de Dados ===');

  const spinner = ora({
    text: `Coletando dados: ${completed}/${repositories.length}`,
    spinner: 'dots',
  }).start();

  const tasks = repositories.map((repo) =>
    limit(async () => {
      try {
        const data = await collectRepositoryData(repo);

        results.push(data);
      } catch (error) {
        logger.error(`Falha ao coletar ${repo.fullName}: ${error.message}`);
        errors.push({ repository: repo.fullName, error: error.message });
      } finally {
        completed++;
        spinner.text = `Coletando dados: ${completed}/${repositories.length} (${results.length} ok, ${errors.length} falhas)`;
      }
    })
  );

  await Promise.all(tasks);

  spinner.succeed(
    `Coleta concluída: ${results.length} repositórios processados, ${errors.length} falhas`
  );

  if (errors.length > 0) {
    exportJSON(errors, 'collection-errors');
  }

  return results;
}

export async function runPhaseExport(collectedData) {
  logger.info('=== FASE 3: Exportação de Dados ===');

  await exportDataset(collectedData);
}

export async function runFullPipeline() {
  const startTime = Date.now();

  logger.info('Iniciando pipeline completo de coleta de dados');

  const rateLimit = await getRateLimit();

  logger.info(
    `Rate limit GitHub: ${rateLimit.remaining}/${rateLimit.limit} ` +
    `(reset em ${new Date(rateLimit.reset * 1000).toLocaleTimeString()})`
  );

  const repositories = await runPhaseSelect();

  if (repositories.length === 0) {
    logger.error('Nenhum repositório selecionado. Abortando.');
    return;
  }

  const collectedData = await runPhaseCollect(repositories);
  await runPhaseExport(collectedData);

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  logger.info(`Pipeline concluído em ${elapsed} minutos`);

  const finalRate = await getRateLimit();
  logger.info(`Rate limit restante: ${finalRate.remaining}/${finalRate.limit}`);
}

export default { runFullPipeline, runPhaseSelect, runPhaseCollect, runPhaseExport };
