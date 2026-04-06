import githubClient from '../services/github-client.js';
import { withCache } from '../services/cache-manager.js';
import config from '../config/index.js';
import logger from '../config/logger.js';

/**
 * Padrão: Service (coleta de métricas de esforço de manutenção)
 *
 * Coleta os quatro indicadores de esforço de manutenção definidos
 * na metodologia da pesquisa:
 *   1. Commits relacionados a atualizações de dependências
 *   2. Pull requests envolvendo dependências
 *   3. Issues sobre problemas de dependências
 *   4. Tempo médio de merge de PRs de dependências
 */

const DEP_KEYWORDS = config.detection.commitKeywords;
const ISSUE_KEYWORDS = [
  'dependency', 'dependencies', 'dependência', 'dependências',
  'package', 'npm', 'node_modules',
  'vulnerability', 'vulnerabilidade', 'CVE',
  'outdated', 'deprecated', 'breaking change',
  ...DEP_KEYWORDS,
];

function textMatchesKeywords(text, keywords) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

function isDependencyPR(pr) {
  const titleMatch = textMatchesKeywords(pr.title, DEP_KEYWORDS);
  const bodyMatch = textMatchesKeywords(pr.body, DEP_KEYWORDS);

  const labelMatch = (pr.labels || []).some((label) =>
    textMatchesKeywords(label.name, ['dependencies', 'deps', 'dependabot', 'renovate'])
  );

  const authorMatch = ['dependabot[bot]', 'dependabot', 'renovate[bot]', 'renovate'].includes(
    pr.user?.login
  );

  return titleMatch || bodyMatch || labelMatch || authorMatch;
}

function isDependencyIssue(issue) {
  if (issue.pull_request) return false;

  const titleMatch = textMatchesKeywords(issue.title, ISSUE_KEYWORDS);
  const bodyMatch = textMatchesKeywords(issue.body, ISSUE_KEYWORDS);
  const labelMatch = (issue.labels || []).some((label) =>
    textMatchesKeywords(label.name, ['dependencies', 'deps', 'bug', 'security'])
  );

  return titleMatch || (bodyMatch && labelMatch);
}

function calculateMergeTimeHours(createdAt, mergedAt) {
  if (!createdAt || !mergedAt) return null;
  const created = new Date(createdAt);
  const merged = new Date(mergedAt);
  return (merged - created) / (1000 * 60 * 60);
}

export async function collectPullRequestMetrics(owner, repo) {
  logger.info(`Coletando métricas de PRs para ${owner}/${repo}...`);

  const since = new Date();
  since.setMonth(since.getMonth() - config.research.analysisMonths);

  const prs = await withCache('pull-requests', `${owner}_${repo}`, () =>
    githubClient.listPullRequests(owner, repo, 'all')
  );

  const filteredPRs = prs.filter(
    (pr) => new Date(pr.created_at) >= since
  );

  const depPRs = filteredPRs.filter(isDependencyPR);
  const mergedDepPRs = depPRs.filter((pr) => pr.merged_at);

  const mergeTimes = mergedDepPRs
    .map((pr) => calculateMergeTimeHours(pr.created_at, pr.merged_at))
    .filter((t) => t !== null);

  const avgMergeTimeHours =
    mergeTimes.length > 0
      ? mergeTimes.reduce((sum, t) => sum + t, 0) / mergeTimes.length
      : null;

  const medianMergeTimeHours =
    mergeTimes.length > 0
      ? (() => {
          const sorted = [...mergeTimes].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          return sorted.length % 2 !== 0
            ? sorted[mid]
            : (sorted[mid - 1] + sorted[mid]) / 2;
        })()
      : null;

  logger.info(
    `${owner}/${repo}: ${depPRs.length} PRs de dependência ` +
    `(${mergedDepPRs.length} merged, avg merge: ${avgMergeTimeHours?.toFixed(1) ?? 'N/A'}h)`
  );

  return {
    totalPRs: filteredPRs.length,
    dependencyPRs: depPRs.length,
    mergedDependencyPRs: mergedDepPRs.length,
    openDependencyPRs: depPRs.filter((pr) => pr.state === 'open').length,
    avgMergeTimeHours,
    medianMergeTimeHours,
    mergeTimes,
    depPRDetails: depPRs.map((pr) => ({
      number: pr.number,
      title: pr.title.substring(0, 200),
      state: pr.state,
      author: pr.user?.login,
      createdAt: pr.created_at,
      mergedAt: pr.merged_at,
      closedAt: pr.closed_at,
    })),
  };
}

export async function collectIssueMetrics(owner, repo) {
  logger.info(`Coletando métricas de issues para ${owner}/${repo}...`);

  const since = new Date();
  since.setMonth(since.getMonth() - config.research.analysisMonths);

  const issues = await withCache('issues', `${owner}_${repo}`, () =>
    githubClient.listIssues(owner, repo, { state: 'all', since: since.toISOString() })
  );

  const filteredIssues = issues.filter(
    (issue) => !issue.pull_request && new Date(issue.created_at) >= since
  );

  const depIssues = filteredIssues.filter(isDependencyIssue);

  logger.info(
    `${owner}/${repo}: ${depIssues.length} issues de dependência de ${filteredIssues.length} total`
  );

  return {
    totalIssues: filteredIssues.length,
    dependencyIssues: depIssues.length,
    openDepIssues: depIssues.filter((i) => i.state === 'open').length,
    closedDepIssues: depIssues.filter((i) => i.state === 'closed').length,
    depIssueDetails: depIssues.map((issue) => ({
      number: issue.number,
      title: issue.title.substring(0, 200),
      state: issue.state,
      createdAt: issue.created_at,
      closedAt: issue.closed_at,
      labels: (issue.labels || []).map((l) => l.name),
    })),
  };
}

export async function collectMaintenanceMetrics(owner, repo, depCommitCount) {
  const [prMetrics, issueMetrics] = await Promise.all([
    collectPullRequestMetrics(owner, repo),
    collectIssueMetrics(owner, repo),
  ]);

  return {
    depCommits: depCommitCount,
    pullRequests: prMetrics,
    issues: issueMetrics,
  };
}

export default {
  collectPullRequestMetrics,
  collectIssueMetrics,
  collectMaintenanceMetrics,
};
