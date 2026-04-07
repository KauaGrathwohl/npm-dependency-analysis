import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { writeToPath } from 'fast-csv';
import config from '../config/index.js';
import logger from '../config/logger.js';

function ensureOutputDir() {
  mkdirSync(config.paths.output, { recursive: true });
}

export function exportJSON(data, filename) {
  ensureOutputDir();
  const filePath = resolve(config.paths.output, `${filename}.json`);
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  logger.info(`Exportado JSON: ${filePath}`);
  return filePath;
}

export function exportCSV(rows, filename, headers) {
  return new Promise((resolvePromise, reject) => {
    ensureOutputDir();
    const filePath = resolve(config.paths.output, `${filename}.csv`);

    writeToPath(filePath, rows, { headers: headers || true })
      .on('finish', () => {
        logger.info(`Exportado CSV: ${filePath}`);
        resolvePromise(filePath);
      })
      .on('error', (error) => {
        logger.error(`Erro ao exportar CSV ${filename}: ${error.message}`);
        reject(error);
      });
  });
}

export async function exportDataset(collectedData) {
  ensureOutputDir();

  exportJSON(collectedData, 'full-dataset');

  const summaryRows = collectedData.map((repo) => ({
    repository: repo.fullName,
    stars: repo.stars,
    direct_dependencies: repo.dependencySnapshot?.totalDirect ?? 0,
    transitive_dependencies: repo.dependencySnapshot?.transitiveDependencies ?? 0,
    dep_update_commits: repo.maintenanceMetrics?.depCommits ?? 0,
    total_dep_updates: repo.updateSummary?.total ?? 0,
    major_updates: repo.updateSummary?.major ?? 0,
    minor_updates: repo.updateSummary?.minor ?? 0,
    patch_updates: repo.updateSummary?.patch ?? 0,
    dep_pull_requests: repo.maintenanceMetrics?.pullRequests?.dependencyPRs ?? 0,
    merged_dep_prs: repo.maintenanceMetrics?.pullRequests?.mergedDependencyPRs ?? 0,
    avg_merge_time_hours:
      repo.maintenanceMetrics?.pullRequests?.avgMergeTimeHours?.toFixed(2) ?? '',
    median_merge_time_hours:
      repo.maintenanceMetrics?.pullRequests?.medianMergeTimeHours?.toFixed(2) ?? '',
    dep_issues: repo.maintenanceMetrics?.issues?.dependencyIssues ?? 0,
    total_issues: repo.maintenanceMetrics?.issues?.totalIssues ?? 0,
    total_prs: repo.maintenanceMetrics?.pullRequests?.totalPRs ?? 0,
  }));

  await exportCSV(summaryRows, 'repositories-summary', [
    'repository',
    'stars',
    'direct_dependencies',
    'transitive_dependencies',
    'dep_update_commits',
    'total_dep_updates',
    'major_updates',
    'minor_updates',
    'patch_updates',
    'dep_pull_requests',
    'merged_dep_prs',
    'avg_merge_time_hours',
    'median_merge_time_hours',
    'dep_issues',
    'total_issues',
    'total_prs',
  ]);

  const changeRows = [];
  for (const repo of collectedData) {
    for (const change of repo.dependencyChanges || []) {
      for (const dep of [...(change.dependencies || []), ...(change.devDependencies || [])]) {
        if (dep.type === 'updated') {
          changeRows.push({
            repository: repo.fullName,
            commit_sha: change.commitSha,
            date: change.date,
            package_name: dep.package,
            from_version: dep.from,
            to_version: dep.to,
            update_type: dep.updateType,
          });
        }
      }
    }
  }

  if (changeRows.length > 0) {
    await exportCSV(changeRows, 'dependency-changes', [
      'repository',
      'commit_sha',
      'date',
      'package_name',
      'from_version',
      'to_version',
      'update_type',
    ]);
  }

  const metadata = {
    collectionDate: new Date().toISOString(),
    analysisMonths: config.research.analysisMonths,
    sampleSize: collectedData.length,
    selectionCriteria: config.research,
    detectionConfig: config.detection,
  };
  exportJSON(metadata, 'collection-metadata');

  logger.info(`Dataset exportado com sucesso para ${config.paths.output}`);
}

export default { exportJSON, exportCSV, exportDataset };
