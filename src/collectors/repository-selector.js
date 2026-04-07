import githubClient from '../services/github-client.js';
import { withCache } from '../services/cache-manager.js';
import config from '../config/index.js';
import logger from '../config/logger.js';

function buildSearchQuery() {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - config.research.maxInactivityMonths);
  const pushed = cutoffDate.toISOString().split('T')[0];

  return [
    `language:${config.research.language}`,
    `stars:>=${config.research.minStars}`,
    `pushed:>=${pushed}`,
    'archived:false',
    'fork:false',
  ].join(' ');
}

async function hasPackageJson(owner, repo) {
  const content = await githubClient.getFileContent(owner, repo, 'package.json');
  return content !== null;
}

function parsePackageJson(content) {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function usesNpm(owner, repo) {
  const content = await githubClient.getFileContent(owner, repo, 'package.json');
  if (!content) return false;

  const pkg = parsePackageJson(content);
  if (!pkg) return false;

  const hasYarnLock = await githubClient.getFileContent(owner, repo, 'yarn.lock');
  const hasPnpmLock = await githubClient.getFileContent(owner, repo, 'pnpm-lock.yaml');

  if (hasYarnLock || hasPnpmLock) {
    const hasPackageLock = await githubClient.getFileContent(owner, repo, 'package-lock.json');
    if (!hasPackageLock) return false;
  }

  return true;
}

async function validateRepository(repoData) {
  const { owner, name, full_name, stargazers_count, pushed_at, archived, fork } = repoData;
  const ownerLogin = owner.login;
  const validationResult = {
    fullName: full_name,
    valid: false,
    reasons: [],
  };

  if (archived) {
    validationResult.reasons.push('repositório arquivado');
    return validationResult;
  }

  if (fork) {
    validationResult.reasons.push('é um fork');
    return validationResult;
  }

  if (stargazers_count < config.research.minStars) {
    validationResult.reasons.push(`estrelas insuficientes: ${stargazers_count}`);
    return validationResult;
  }

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - config.research.maxInactivityMonths);
  if (new Date(pushed_at) < cutoff) {
    validationResult.reasons.push('inativo há mais de 12 meses');
    return validationResult;
  }

  const hasFile = await hasPackageJson(ownerLogin, name);
  if (!hasFile) {
    validationResult.reasons.push('sem package.json');
    return validationResult;
  }

  const npm = await usesNpm(ownerLogin, name);
  if (!npm) {
    validationResult.reasons.push('não usa npm como gerenciador');
    return validationResult;
  }

  validationResult.valid = true;
  return validationResult;
}

export async function selectRepositories(targetCount = config.research.sampleSize) {
  logger.info(`Iniciando seleção de ${targetCount} repositórios...`);
  const query = buildSearchQuery();
  logger.info(`Query de busca: ${query}`);

  const selected = [];
  const rejected = [];
  let page = 1;
  const perPage = 30;
  const maxPages = 20;

  while (selected.length < targetCount && page <= maxPages) {
    logger.info(`Buscando página ${page} (${selected.length}/${targetCount} selecionados)`);

    const results = await withCache('search', `repos_page_${page}`, () =>
      githubClient.searchRepositories(query, perPage, page)
    );

    if (!results.items || results.items.length === 0) {
      logger.warn('Sem mais resultados na busca');
      break;
    }

    for (const repo of results.items) {
      if (selected.length >= targetCount) break;

      try {
        const validation = await validateRepository(repo);
        if (validation.valid) {
          selected.push({
            fullName: repo.full_name,
            owner: repo.owner.login,
            name: repo.name,
            stars: repo.stargazers_count,
            url: repo.html_url,
            pushedAt: repo.pushed_at,
            description: repo.description,
          });
          logger.info(`[${selected.length}/${targetCount}] Selecionado: ${repo.full_name}`);
        } else {
          rejected.push(validation);
          logger.debug(`Rejeitado: ${repo.full_name} — ${validation.reasons.join(', ')}`);
        }
      } catch (error) {
        logger.error(`Erro ao validar ${repo.full_name}: ${error.message}`);
        rejected.push({ fullName: repo.full_name, reasons: [error.message] });
      }
    }

    page++;
  }

  logger.info(
    `Seleção concluída: ${selected.length} repositórios aceitos, ${rejected.length} rejeitados`
  );

  return { selected, rejected };
}

export default { selectRepositories };
