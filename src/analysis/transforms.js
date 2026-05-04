import { parseNumber } from '../parsers/number-parser.js';

export function buildCaseRows(rows) {
  return rows.map((row) => {
    const minorUpdates = parseNumber(row.minor_updates) ?? 0;
    const patchUpdates = parseNumber(row.patch_updates) ?? 0;
    const totalDependencyEvents = parseNumber(row.total_dep_updates) ?? 0;
    const depIssueCount = parseNumber(row.dep_issues) ?? 0;
    const totalPrCount = parseNumber(row.total_prs) ?? 0;
    const mergedDependencyPrs = parseNumber(row.merged_dep_prs) ?? 0;
    const directDependencies = parseNumber(row.direct_dependencies) ?? 0;
    const transitiveDependencies = parseNumber(row.transitive_dependencies) ?? 0;
    const depPullRequests = parseNumber(row.dep_pull_requests) ?? 0;

    return {
      repository: row.repository,
      stars: parseNumber(row.stars),
      direct_dependencies: directDependencies,
      transitive_dependencies: transitiveDependencies,
      dep_update_commits: parseNumber(row.dep_update_commits),
      total_dep_updates: totalDependencyEvents,
      major_updates: parseNumber(row.major_updates),
      minor_updates: minorUpdates,
      patch_updates: patchUpdates,
      inc_man_ratio: patchUpdates > 0 ? minorUpdates / patchUpdates : null,
      dep_pull_requests: depPullRequests,
      merged_dep_prs: mergedDependencyPrs,
      avg_merge_time_hours: parseNumber(row.avg_merge_time_hours),
      median_merge_time_hours: parseNumber(row.median_merge_time_hours),
      dep_issues: depIssueCount,
      total_issues: parseNumber(row.total_issues),
      total_prs: totalPrCount,
      update_pressure: directDependencies > 0 ? totalDependencyEvents / directDependencies : null,
      maintenance_intensity: totalPrCount > 0 ? depIssueCount / totalPrCount : null,
      merge_conversion_rate: depPullRequests > 0 ? mergedDependencyPrs / depPullRequests : null,
      dependency_density:
        directDependencies > 0 ? transitiveDependencies / directDependencies : null,
    };
  });
}

export function buildTopRepositories(rows) {
  return [...rows]
    .sort((a, b) => (b.total_dep_updates ?? 0) - (a.total_dep_updates ?? 0))
    .slice(0, 10)
    .map((row) => ({
      repository: row.repository,
      total_dep_updates: row.total_dep_updates,
      dep_pull_requests: row.dep_pull_requests,
      dep_issues: row.dep_issues,
      inc_man_ratio: row.inc_man_ratio,
      update_pressure: row.update_pressure,
    }));
}

export default { buildCaseRows, buildTopRepositories };
