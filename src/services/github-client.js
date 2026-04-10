import { Octokit } from '@octokit/rest';
import { graphql } from '@octokit/graphql';
import { throttling } from '@octokit/plugin-throttling';
import config from '../config/index.js';
import logger from '../config/logger.js';

const ThrottledOctokit = Octokit.plugin(throttling);

let restClient = null;
let graphqlClient = null;

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
  const client = createRestClient();
  const response = await client.repos.get({ owner, repo });

  return response.data;
}

export async function getFileContent(owner, repo, path, ref = undefined) {
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

export async function listPullRequests(owner, repo, state = 'all') {
  const client = createRestClient();

  return client.paginate(client.pulls.list, {
    owner,
    repo,
    state,
    per_page: 100,
  });
}

export async function listIssues(owner, repo, options = {}) {
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
};
