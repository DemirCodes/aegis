// ═══════════════════════════════════════════════════
// AEGIS — Cascading Failure Prevention
// Bağımlı servislerin domino etkisiyle çökmesini engeller.
// Dependency'ler OPEN ise direkt reddeder.
// ═══════════════════════════════════════════════════

import { getCircuitState } from './circuitBreaker';

// ═══════════════════════════════════════════════════
// WITH CASCADING FAILURE PREVENTION
// ═══════════════════════════════════════════════════

interface CascadingOptions {
  failFast?: boolean;
}

function withCascadingFailure<T>(
  fn: () => Promise<T>,
  dependencies: string[],
  options: CascadingOptions = {}
): Promise<T> {
  const failFast = options.failFast ?? true;

  // Tüm bağımlılıkları kontrol et
  const openDependencies: string[] = [];

  for (const dep of dependencies) {
    const state = getCircuitState(dep);
    if (state === 'OPEN') {
      openDependencies.push(dep);
    }
  }

  // Eğer failFast açıksa ve herhangi bir bağımlılık OPEN ise direkt reddet
  if (failFast && openDependencies.length > 0) {
    return Promise.reject(
      new Error(
        `Cascading failure prevented: dependent service(s) [${openDependencies.join(', ')}] are OPEN`
      )
    );
  }

  // Tüm bağımlılıklar sağlıklı veya failFast kapalı — dene
  return fn();
}

// ═══════════════════════════════════════════════════
// CHECK DEPENDENCIES
// ═══════════════════════════════════════════════════

interface DependencyHealth {
  name: string;
  state: string;
  healthy: boolean;
}

function checkDependencies(dependencies: string[]): DependencyHealth[] {
  return dependencies.map(name => {
    const state = getCircuitState(name);
    return {
      name,
      state,
      healthy: state !== 'OPEN',
    };
  });
}

function areDependenciesHealthy(dependencies: string[]): boolean {
  return dependencies.every(dep => getCircuitState(dep) !== 'OPEN');
}

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════

export {
  withCascadingFailure,
  checkDependencies,
  areDependenciesHealthy,
};

export type { CascadingOptions, DependencyHealth };