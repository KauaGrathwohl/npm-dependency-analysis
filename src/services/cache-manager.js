import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import config from '../config/index.js';
import logger from '../config/logger.js';

const CACHE_DIR = config.paths.cache;

function ensureCacheDir() {
  mkdirSync(CACHE_DIR, { recursive: true });
}

function keyToPath(namespace, key) {
  const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  const nsDir = resolve(CACHE_DIR, namespace);

  mkdirSync(nsDir, { recursive: true });

  return resolve(nsDir, `${safeKey}.json`);
}

// TTL por namespace em milissegundos
const NAMESPACE_TTL = {
  commits: 7 * 24 * 60 * 60 * 1000, // 7 dias para commits
  'dep-file-commits': 7 * 24 * 60 * 60 * 1000, // 7 dias
  'commit-detail': 14 * 24 * 60 * 60 * 1000, // 14 dias para detalhes
  'pull-requests': 3 * 24 * 60 * 60 * 1000, // 3 dias para PRs (mudam frequentemente)
  issues: 3 * 24 * 60 * 60 * 1000, // 3 dias para issues
  repository: 30 * 24 * 60 * 60 * 1000, // 30 dias para dados de repo (quase nunca mudam)
  'commit-count': 7 * 24 * 60 * 60 * 1000, // 7 dias
  default: 7 * 24 * 60 * 60 * 1000, // 7 dias padrão
};

export function getCached(namespace, key) {
  const filePath = keyToPath(namespace, key);

  if (!existsSync(filePath)) return null;

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const entry = JSON.parse(raw);

    const ageMs = Date.now() - entry.timestamp;
    const maxAgeMs = NAMESPACE_TTL[namespace] || NAMESPACE_TTL.default;

    if (ageMs > maxAgeMs) {
      logger.debug(
        `Cache expirado para ${namespace}/${key} (${(ageMs / (1000 * 60 * 60)).toFixed(1)}h)`
      );
      return null;
    }

    logger.debug(`Cache hit: ${namespace}/${key} (${(ageMs / (1000 * 60 * 60)).toFixed(1)}h)`);
    return entry.data;
  } catch {
    return null;
  }
}

export function setCache(namespace, key, data) {
  ensureCacheDir();

  const filePath = keyToPath(namespace, key);
  const entry = { timestamp: Date.now(), data };

  writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8');
}

export async function withCache(namespace, key, fetchFn) {
  const cached = getCached(namespace, key);

  if (cached !== null) {
    logger.debug(`Cache hit: ${namespace}/${key}`);
    return cached;
  }

  logger.debug(`Cache miss: ${namespace}/${key}`);

  const data = await fetchFn();
  setCache(namespace, key, data);

  return data;
}

export default { getCached, setCache, withCache };
