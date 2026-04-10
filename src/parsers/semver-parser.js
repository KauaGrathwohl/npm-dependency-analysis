import semver from 'semver';
import logger from '../config/logger.js';

export function classifyUpdate(previousVersion, currentVersion) {
  const prev = semver.coerce(previousVersion);
  const curr = semver.coerce(currentVersion);

  if (!prev || !curr) {
    logger.debug(`Versão não parseável: "${previousVersion}" → "${currentVersion}"`);
    return 'unknown';
  }

  if (prev.major !== curr.major) return 'major';
  if (prev.minor !== curr.minor) return 'minor';
  if (prev.patch !== curr.patch) return 'patch';

  return 'none';
}

export function diffDependencies(previous, current) {
  const changes = [];

  if (!previous || !current) return changes;

  const allPackages = new Set([...Object.keys(previous), ...Object.keys(current)]);

  for (const pkg of allPackages) {
    const prevVersion = previous[pkg];
    const currVersion = current[pkg];

    if (!prevVersion && currVersion) {
      changes.push({
        package: pkg,
        type: 'added',
        from: null,
        to: currVersion,
        updateType: null,
      });
    } else if (prevVersion && !currVersion) {
      changes.push({
        package: pkg,
        type: 'removed',
        from: prevVersion,
        to: null,
        updateType: null,
      });
    } else if (prevVersion !== currVersion) {
      changes.push({
        package: pkg,
        type: 'updated',
        from: prevVersion,
        to: currVersion,
        updateType: classifyUpdate(prevVersion, currVersion),
      });
    }
  }

  return changes;
}

export function countDirectDependencies(packageJson) {
  const deps = Object.keys(packageJson.dependencies || {}).length;
  const devDeps = Object.keys(packageJson.devDependencies || {}).length;

  return { dependencies: deps, devDependencies: devDeps, total: deps + devDeps };
}

export function countTransitiveDependencies(lockfileJson, packageJson) {
  let lockfileTotal = 0;

  if (lockfileJson.packages) {
    lockfileTotal = Object.keys(lockfileJson.packages).filter((key) => key !== '').length;
  } else if (lockfileJson.dependencies) {
    lockfileTotal = Object.keys(lockfileJson.dependencies).length;
  }

  const direct = countDirectDependencies(packageJson);
  const transitive = Math.max(0, lockfileTotal - direct.total);

  return { lockfileTotal, directTotal: direct.total, transitive };
}

export default {
  classifyUpdate,
  diffDependencies,
  countDirectDependencies,
  countTransitiveDependencies,
};
