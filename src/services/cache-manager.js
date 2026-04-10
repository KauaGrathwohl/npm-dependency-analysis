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

export function getCached(namespace, key) {
  const filePath = keyToPath(namespace, key);

  if (!existsSync(filePath)) return null;

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const entry = JSON.parse(raw);

    const ageMs = Date.now() - entry.timestamp;
    const maxAgeMs = 24 * 60 * 60 * 1000; // 24h

    if (ageMs > maxAgeMs) {
      logger.debug(`Cache expirado para ${namespace}/${key}`);
      return null;
    }

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
