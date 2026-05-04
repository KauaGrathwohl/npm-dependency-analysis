import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, '..', '..');

dotenvConfig({ path: resolve(ROOT_DIR, '.env') });

const config = Object.freeze({
  github: {
    token: process.env.GITHUB_TOKEN,
    apiVersion: '2022-11-28',
    maxRetries: 3,
    requestTimeoutMs: 30_000,
  },

  research: {
    sampleSize: 50,
    analysisMonths: 12,
    minStars: 500,
    minCommits: 100,
    maxInactivityMonths: 12,
    language: 'JavaScript',
    requiredFiles: ['package.json'],
  },

  detection: {
    targetFiles: ['package.json', 'package-lock.json'],
    commitKeywords: ['chore(deps)', 'update dependency', 'bump', 'dependabot'],
  },

  analysis: {
    numericFields: [
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
    ],
    correlationPairs: [
      ['total_dep_updates', 'dep_update_commits'],
      ['total_dep_updates', 'dep_pull_requests'],
      ['total_dep_updates', 'merged_dep_prs'],
      ['total_dep_updates', 'dep_issues'],
      ['total_dep_updates', 'total_prs'],
      ['total_dep_updates', 'avg_merge_time_hours'],
      ['total_dep_updates', 'median_merge_time_hours'],
      ['total_dep_updates', 'direct_dependencies'],
      ['total_dep_updates', 'transitive_dependencies'],
      ['minor_updates', 'patch_updates'],
      ['minor_updates', 'dep_pull_requests'],
      ['minor_updates', 'avg_merge_time_hours'],
    ],
  },

  concurrency: {
    limit: parseInt(process.env.CONCURRENCY_LIMIT, 10) || 3,
  },

  paths: {
    root: ROOT_DIR,
    output: resolve(ROOT_DIR, process.env.OUTPUT_DIR || 'data/output'),
    analysis: resolve(ROOT_DIR, process.env.OUTPUT_DIR || 'data/output', 'analysis'),
    cache: resolve(ROOT_DIR, 'data/cache'),
    logs: resolve(ROOT_DIR, 'logs'),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

export function validateConfig() {
  if (!config.github.token) {
    throw new Error('GITHUB_TOKEN não definido no arquivo .env');
  }
}

export default config;
