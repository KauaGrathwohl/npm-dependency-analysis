import { Octokit } from '@octokit/rest';
import { graphql } from '@octokit/graphql';
import { throttling } from '@octokit/plugin-throttling';
import config from '../config/index.js';
import logger from '../config/logger.js';

const ThrottledOctokit = Octokit.plugin(throttling);

let restClient = null;
let graphqlClient = null;

// Delay entre requisições (ms) para evitar burst
const BASE_DELAY = 100;
let lastRequestTime = 0;

/**
 * Aguarda delay estratégico para não sobrecarregar rate limit
 */
async function applyDelay() {
  const timeSinceLastRequest = Date.now() - lastRequestTime;
  if (timeSinceLastRequest < BASE_DELAY) {
    const delayMs = BASE_DELAY - timeSinceLastRequest;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  lastRequestTime = Date.now();
}

/**
 * Verifica rate limit proativamente
 */
async function checkRateLimitThreshold() {
  try {
    const rate = await getRateLimit();
    if (rate.remaining < 50) {
      const resetDate = new Date(rate.reset * 1000);
      const delayMs = resetDate.getTime() - Date.now();
      logger.warn(
        `Rate limit crítico: ${rate.remaining}/${rate.limit} requisições. ` +
          `Aguardando reset em ${Math.ceil(delayMs / 1000)}s`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs + 1000));
    }
  } catch (error) {
    logger.debug(`Não foi possível verificar rate limit: ${error.message}`);
  }
}

function createRestClient() {
  if (restClient) return restClient;

  restClient = new ThrottledOctokit({
    auth: config.github.token,
    request: { timeout: config.github.requestTimeoutMs },
    throttle: {
      onRateLimit: (retryAfter, options, octokit, retryCount) => {
        logger.warn(
          `Rate limit atingido para ${options.method} ${options.url}. ` +
            `Aguardando ${retryAfter}s (tentativa ${retryCount + 1}/${config.github.maxRetries})`
        );

        return retryCount < config.github.maxRetries;
      },
      onSecondaryRateLimit: (retryAfter, options, octokit, retryCount) => {
        logger.warn(
          `Rate limit secundário para ${options.method} ${options.url}. ` +
            `Aguardando ${retryAfter}s`
        );

        return retryCount < 1;
      },
    },
  });

  return restClient;
}

function createGraphQLClient() {
  if (graphqlClient) return graphqlClient;

  graphqlClient = graphql.defaults({
    headers: {
      authorization: `token ${config.github.token}`,
    },
  });

  return graphqlClient;
}

export async function searchRepositories(query, perPage = 30, page = 1) {
  await applyDelay();
  await checkRateLimitThreshold();

  const client = createRestClient();
  const response = await client.search.repos({
    q: query,
    sort: 'stars',
    order: 'desc',
    per_page: perPage,
    page,
  });

  return response.data;
}

export async function getRepository(owner, repo) {
  await applyDelay();

  const client = createRestClient();
  const response = await client.repos.get({ owner, repo });

  return response.data;
}

export async function getFileContent(owner, repo, path, ref = undefined) {
  await applyDelay();

  const client = createRestClient();

  try {
    const response = await client.repos.getContent({ owner, repo, path, ref });
    const content = Buffer.from(response.data.content, 'base64').toString('utf-8');

    return content;
  } catch (error) {
    if (error.status === 404) return null;

    throw error;
  }
}

export async function listCommits(owner, repo, options = {}) {
  await applyDelay();

  const client = createRestClient();
  const response = await client.repos.listCommits({
    owner,
    repo,
    per_page: options.perPage || 100,
    ...(options.since && { since: options.since }),
    ...(options.until && { until: options.until }),
    ...(options.path && { path: options.path }),
    ...(options.page && { page: options.page }),
  });

  return response.data;
}

/**
 * Paginação automática para endpoints que retornam listas.
 * Coleta todas as páginas respeitando o throttling.
 */
export async function paginateAll(method, params) {
  const client = createRestClient();
  const results = [];

  let page = 1;
  let hasMore = true;

  while (hasMore) {
    await applyDelay();

    const response = await client.request(method, {
      ...params,
      per_page: 100,
      page,
    });

    results.push(...response.data);

    hasMore = response.data.length === 100;
    page++;
  }

  return results;
}

export async function listPullRequests(owner, repo, options = {}) {
  await checkRateLimitThreshold();

  const client = createRestClient();
  const state = options.state || 'all';
  const sinceDate = options.since ? new Date(options.since) : null;

  // Paginação manual para interromper cedo quando PRs mais antigos que o recorte
  // temporal são alcançados.
  const prs = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    await applyDelay();

    const response = await client.pulls.list({
      owner,
      repo,
      state,
      sort: 'created',
      direction: 'desc',
      per_page: 100,
      page,
    });

    const batch = response.data || [];

    if (batch.length === 0) {
      break;
    }

    if (!sinceDate) {
      prs.push(...batch);
    } else {
      for (const pr of batch) {
        if (new Date(pr.created_at) >= sinceDate) {
          prs.push(pr);
        }
      }
    }

    if (batch.length < 100) {
      hasMore = false;
      continue;
    }

    if (sinceDate) {
      const oldest = batch[batch.length - 1];
      if (new Date(oldest.created_at) < sinceDate) {
        hasMore = false;
        continue;
      }
    }

    page++;
  }

  return prs;
}

export async function listIssues(owner, repo, options = {}) {
  await checkRateLimitThreshold();

  const client = createRestClient();

  return client.paginate(client.issues.listForRepo, {
    owner,
    repo,
    state: options.state || 'all',
    since: options.since,
    per_page: 100,
  });
}

export async function getCommitDetail(owner, repo, sha) {
  await applyDelay();
  const client = createRestClient();
  const response = await client.repos.getCommit({ owner, repo, ref: sha });

  return response.data;
}

export async function graphqlQuery(query, variables = {}) {
  const client = createGraphQLClient();

  return client(query, variables);
}

export async function getRateLimit() {
  const client = createRestClient();
  const response = await client.rateLimit.get();

  return response.data.rate;
}

/**
 * Query GraphQL consolidada para coletar PRs, Issues e commits em uma única requisição
 * Economiza significativamente no rate limit comparado a 3 requisições separadas
 */
export async function getRepositoryMetricsGraphQL(owner, repo, dateSince = null) {
  await applyDelay();

  const query = `
    query($owner: String!, $repo: String!, $since: DateTime) {
      repository(owner: $owner, name: $repo) {
        pullRequests(first: 100, orderBy: {field: CREATED_AT, direction: DESC}, after: null) {
          totalCount
          nodes {
            number
            title
            state
            createdAt
            mergedAt
            closedAt
            author {
              login
            }
            labels(first: 20) {
              nodes {
                name
              }
            }
          }
        }
        issues(first: 100, orderBy: {field: CREATED_AT, direction: DESC}) {
          totalCount
          nodes {
            number
            title
            state
            createdAt
            closedAt
            labels(first: 20) {
              nodes {
                name
              }
            }
          }
        }
      }
      rateLimit {
        remaining
        resetAt
      }
    }
  `;

  const variables = {
    owner,
    repo,
    ...(dateSince && { since: dateSince }),
  };

  return graphqlQuery(query, variables);
}

/**
 * Query GraphQL para commits de forma mais eficiente
 * Coleta commits com history de arquivo em uma única query
 */
export async function getCommitsGraphQL(owner, repo, dateSince = null, filePath = null) {
  await applyDelay();

  const query = `
    query($owner: String!, $repo: String!, $since: GitTimestamp) {
      repository(owner: $owner, name: $repo) {
        defaultBranchRef {
          target {
            ... on Commit {
              history(first: 100, since: $since${filePath ? `, path: "${filePath}"` : ''}) {
                totalCount
                pageInfo {
                  hasNextPage
                  endCursor
                }
                nodes {
                  oid
                  message
                  committedDate
                  author {
                    name
                  }
                  changedFiles
                  additions
                  deletions
                }
              }
            }
          }
        }
      }
    }
  `;

  const variables = {
    owner,
    repo,
    ...(dateSince && { since: dateSince }),
  };

  return graphqlQuery(query, variables);
}

export default {
  searchRepositories,
  getRepository,
  getFileContent,
  listCommits,
  listPullRequests,
  listIssues,
  getCommitDetail,
  graphqlQuery,
  getRateLimit,
  paginateAll,
  getRepositoryMetricsGraphQL,
  getCommitsGraphQL,
};
