import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { stringify } from 'csv-stringify/sync';
import config from '../config/index.js';

const CASE_HEADERS = [
  'repository',
  'stars',
  'direct_dependencies',
  'transitive_dependencies',
  'dep_update_commits',
  'total_dep_updates',
  'major_updates',
  'minor_updates',
  'patch_updates',
  'inc_man_ratio',
  'dep_pull_requests',
  'merged_dep_prs',
  'avg_merge_time_hours',
  'median_merge_time_hours',
  'dep_issues',
  'total_issues',
  'total_prs',
  'update_pressure',
  'maintenance_intensity',
  'merge_conversion_rate',
  'dependency_density',
];

function ensureOutputDir() {
  mkdirSync(config.paths.analysis, { recursive: true });
}

export function exportAnalysisArtifacts({
  summary,
  caseRows,
  descriptiveRows,
  correlationRows,
  report,
}) {
  ensureOutputDir();

  writeFileSync(
    resolve(config.paths.analysis, 'analysis-summary.json'),
    JSON.stringify(summary, null, 2),
    'utf-8'
  );
  writeFileSync(
    resolve(config.paths.analysis, 'analysis-cases.csv'),
    stringify(caseRows, { header: true, columns: CASE_HEADERS }),
    'utf-8'
  );
  writeFileSync(
    resolve(config.paths.analysis, 'analysis-descriptive.csv'),
    stringify(descriptiveRows, {
      header: true,
      columns: ['field', 'count', 'mean', 'median', 'min', 'max', 'stdDev', 'q1', 'q3'],
    }),
    'utf-8'
  );
  writeFileSync(
    resolve(config.paths.analysis, 'analysis-correlations.csv'),
    stringify(correlationRows, {
      header: true,
      columns: ['x_field', 'y_field', 'n', 'spearman_rho', 'strength'],
    }),
    'utf-8'
  );
  writeFileSync(resolve(config.paths.analysis, 'analysis-report.md'), report, 'utf-8');
}

export default { exportAnalysisArtifacts };
