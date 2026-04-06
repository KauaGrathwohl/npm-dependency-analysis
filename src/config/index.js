import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, '..', '..');

dotenvConfig({ path: resolve(ROOT_DIR, '.env') });

/**
 * Configuração central do projeto.
 *
 * Padrão: Configuration-based behavior — todos os parâmetros
 * ajustáveis da pesquisa ficam centralizados aqui, evitando
 * valores "mágicos" espalhados pelo código.
 */
const config = Object.freeze({
  github: {
    token: process.env.GITHUB_TOKEN,
    apiVersion: '2022-11-28',
    maxRetries: 3,
    requestTimeoutMs: 30_000,
  },

  research: {
    sampleSize: 50,
    analysisMonths: 24,
    minStars: 500,
    minCommits: 100,
    maxInactivityMonths: 12,
    language: 'JavaScript',
    requiredFiles: ['package.json'],
  },

  detection: {
    targetFiles: ['package.json', 'package-lock.json'],
    commitKeywords: [
      'chore(deps)',
      'update dependency',
      'bump',
      'dependabot',
      'renovate',
      'upgrade',
    ],
  },

  concurrency: {
    limit: parseInt(process.env.CONCURRENCY_LIMIT, 10) || 3,
  },

  paths: {
    root: ROOT_DIR,
    output: resolve(ROOT_DIR, process.env.OUTPUT_DIR || 'data/output'),
    cache: resolve(ROOT_DIR, 'data/cache'),
    logs: resolve(ROOT_DIR, 'logs'),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

export function validateConfig() {
  if (!config.github.token) {
    throw new Error(
      'GITHUB_TOKEN não definido. Crie um arquivo .env baseado em .env.example.'
    );
  }
}

export default config;
