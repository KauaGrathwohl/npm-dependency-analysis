import githubClient from '../services/github-client.js';
import { withCache } from '../services/cache-manager.js';
import {
  diffDependencies,
  countDirectDependencies,
  countTransitiveDependencies,
} from '../parsers/semver-parser.js';
import config from '../config/index.js';
import logger from '../config/logger.js';

function matchesKeyword(message) {
  const lower = message.toLowerCase();

  return config.detection.commitKeywords.some((kw) => lower.includes(kw.toLowerCase()));
}

function isDepFileChanged(files) {
  return files.some((f) =>
    config.detection.targetFiles.some(
      (target) => f.filename === target || f.filename.endsWith(`/${target}`)
    )
  );
}

async function listCommitsByPath(owner, repo, path, sinceISO) {
  const allCommits = [];

  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const batch = await githubClient.listCommits(owner, repo, {
      since: sinceISO,
      path,
      perPage: 100,
      page,
    });

    allCommits.push(...batch);

    hasMore = batch.length === 100;
    page++;

    if (page > 50) {
      logger.warn(`${owner}/${repo}: limite de 5000 commits por arquivo atingido para ${path}`);
      break;
    }
  }

  return allCommits;
}

async function getPackageJsonAtCommit(owner, repo, sha) {
  try {
    const content = await githubClient.getFileContent(owner, repo, 'package.json', sha);

    return content ? JSON.parse(content) : null;
  } catch {
    return null;
  }
}

export async function detectDependencyUpdates(owner, repo) {
  const since = new Date();
  since.setMonth(since.getMonth() - config.research.analysisMonths);

  logger.info(`Detectando atualizações de dependências em ${owner}/${repo}...`);

  const cacheKey = `${owner}_${repo}_dep_commits`;
  const commits = await withCache('commits', cacheKey, async () => {
    const allCommits = [];

    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const batch = await githubClient.listCommits(owner, repo, {
        since: since.toISOString(),
        perPage: 100,
        page,
      });

      allCommits.push(...batch);

      hasMore = batch.length === 100;
      page++;

      if (page > 50) {
        logger.warn(`${owner}/${repo}: limite de 5000 commits atingido`);
        break;
      }
    }

    return allCommits;
  });

  logger.info(`${owner}/${repo}: ${commits.length} commits no período de análise`);

  const depFileCommitShas = new Set();

  for (const targetFile of config.detection.targetFiles) {
    const pathCacheKey = `${owner}_${repo}_${targetFile}_commits`;

    const commitsByPath = await withCache('dep-file-commits', pathCacheKey, () =>
      listCommitsByPath(owner, repo, targetFile, since.toISOString())
    );

    for (const commit of commitsByPath) {
      depFileCommitShas.add(commit.sha);
    }
  }

  const depUpdateCommits = [];

  for (const commit of commits) {
    const message = commit.commit?.message || '';
    const isKeywordMatch = matchesKeyword(message);

    let touchesDepFile = depFileCommitShas.has(commit.sha);
    let filesChanged = [];

    if (!isKeywordMatch && !touchesDepFile) continue;

    // Para commits capturados apenas por keyword, consulta detalhes para reduzir
    // falsos positivos e preservar suporte a package.json em subpastas.
    if (isKeywordMatch && !touchesDepFile) {
      try {
        const detail = await withCache('commit-detail', `${owner}_${repo}_${commit.sha}`, () =>
          githubClient.getCommitDetail(owner, repo, commit.sha)
        );

        const files = detail.files || [];

        touchesDepFile = isDepFileChanged(files);
        filesChanged = files.map((f) => f.filename);
      } catch (error) {
        logger.debug(`Erro ao obter detalhes do commit ${commit.sha}: ${error.message}`);
      }
    }

    depUpdateCommits.push({
      sha: commit.sha,
      message: message.split('\n')[0].substring(0, 200),
      date: commit.commit.author?.date || commit.commit.committer?.date,
      author: commit.commit.author?.name || 'unknown',
      matchedBy: isKeywordMatch ? 'keyword' : 'file-change',
      touchesDepFile,
      filesChanged,
    });
  }

  logger.info(`${owner}/${repo}: ${depUpdateCommits.length} commits de dependência detectados`);

  return depUpdateCommits;
}

export async function analyzeDependencyChanges(owner, repo, depCommits) {
  logger.info(`Analisando mudanças de dependência em ${owner}/${repo}...`);

  const changes = [];
  const packageJsonCache = new Map();
  const sortedCommits = [...depCommits]
    .filter((c) => c.touchesDepFile)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  async function getCachedPackageJson(sha) {
    if (packageJsonCache.has(sha)) {
      return packageJsonCache.get(sha);
    }

    const pkg = await getPackageJsonAtCommit(owner, repo, sha);
    packageJsonCache.set(sha, pkg);

    return pkg;
  }

  for (let i = 0; i < sortedCommits.length; i++) {
    const commit = sortedCommits[i];
    const currentPkg = await getCachedPackageJson(commit.sha);

    if (!currentPkg) continue;

    if (i > 0) {
      const prevCommit = sortedCommits[i - 1];
      const prevPkg = await getCachedPackageJson(prevCommit.sha);

      if (prevPkg) {
        const depDiff = diffDependencies(prevPkg.dependencies, currentPkg.dependencies);
        const devDepDiff = diffDependencies(prevPkg.devDependencies, currentPkg.devDependencies);

        if (depDiff.length > 0 || devDepDiff.length > 0) {
          changes.push({
            commitSha: commit.sha,
            date: commit.date,
            dependencies: depDiff,
            devDependencies: devDepDiff,
          });
        }
      }
    }
  }

  return changes;
}

export async function collectDependencySnapshot(owner, repo) {
  const pkg = await withCache('package-json', `${owner}_${repo}`, () =>
    githubClient.getFileContent(owner, repo, 'package.json').then(JSON.parse)
  );

  const lockfile = await withCache('lockfile', `${owner}_${repo}`, () =>
    githubClient
      .getFileContent(owner, repo, 'package-lock.json')
      .then((c) => (c ? JSON.parse(c) : null))
  );

  const directCounts = countDirectDependencies(pkg);
  const transitiveCounts = lockfile
    ? countTransitiveDependencies(lockfile, pkg)
    : { lockfileTotal: 0, directTotal: directCounts.total, transitive: 0 };

  return {
    directDependencies: directCounts.dependencies,
    directDevDependencies: directCounts.devDependencies,
    totalDirect: directCounts.total,
    transitiveDependencies: transitiveCounts.transitive,
    lockfileTotal: transitiveCounts.lockfileTotal,
  };
}

export default {
  detectDependencyUpdates,
  analyzeDependencyChanges,
  collectDependencySnapshot,
};
