export const SUDO_MAIN_HASH = "#/sudo_main";
export const SUDO_SUB_HASH = "#/sudo_sub";
export const SUDO_ARTAS_HASH = "#/sudo_artas";
export const SUDO_MAIN_PATH = "/sudo_main";
export const SUDO_SUB_PATH = "/sudo_sub";
export const SUDO_ARTAS_PATH = "/sudo_artas";
export const SUDO_SCENARIO_COUNT = 14;
export const SUDO_DEFAULT_SUB_SCENARIO_ID = 2;

export type SudoScenarioLevel = "battalion" | "corps";

function normalizePathname(pathname: string) {
  return pathname.replace(/\/+$/, "") || "/";
}

function isPathRoute(pathname: string, routePath: string) {
  const normalizedPathname = normalizePathname(pathname);
  return (
    normalizedPathname === routePath || normalizedPathname.endsWith(routePath)
  );
}

function getSudoHashRoute(hash: string) {
  if (hash.startsWith(SUDO_MAIN_HASH)) {
    return "main" as const;
  }

  if (hash.startsWith(SUDO_SUB_HASH)) {
    return "sub" as const;
  }

  if (hash.startsWith(SUDO_ARTAS_HASH)) {
    return "artas" as const;
  }

  return undefined;
}

export function isSudoMainRoute(hash: string, pathname = "") {
  if (isPathRoute(pathname, SUDO_MAIN_PATH)) {
    return true;
  }

  const hashRoute = getSudoHashRoute(hash);
  return hashRoute === "main";
}

export function isSudoSubRoute(hash: string, pathname = "") {
  if (isPathRoute(pathname, SUDO_SUB_PATH)) {
    return true;
  }

  const hashRoute = getSudoHashRoute(hash);
  return hashRoute === "sub";
}

export function isSudoArtasRoute(hash: string, pathname = "") {
  if (isPathRoute(pathname, SUDO_ARTAS_PATH)) {
    return true;
  }

  const hashRoute = getSudoHashRoute(hash);
  return hashRoute === "artas";
}

export function isSudoPathRoute(pathname: string) {
  return (
    isPathRoute(pathname, SUDO_MAIN_PATH) ||
    isPathRoute(pathname, SUDO_SUB_PATH) ||
    isPathRoute(pathname, SUDO_ARTAS_PATH)
  );
}

export function getSudoRouteQueryParams(
  hash: string,
  search = "",
  pathname = ""
) {
  const hashQuery = hash.includes("?") ? hash.split("?")[1] : "";
  const pathQuery = search.startsWith("?") ? search.slice(1) : search;
  const pathRoute = isSudoPathRoute(pathname);
  return new URLSearchParams(pathRoute && pathQuery ? pathQuery : hashQuery || pathQuery);
}

export function parseSudoScenarioId(
  value: string | null,
  fallback = SUDO_DEFAULT_SUB_SCENARIO_ID
) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > SUDO_SCENARIO_COUNT) {
    return fallback;
  }

  return parsed;
}

export function parseSudoScenarioLevel(
  value: string | null | undefined,
  fallback: SudoScenarioLevel = "corps"
): SudoScenarioLevel {
  return value === "battalion" || value === "corps" ? value : fallback;
}

export function buildSudoSubHash(scenarioId = SUDO_DEFAULT_SUB_SCENARIO_ID) {
  const params = new URLSearchParams();
  params.set("scenario", String(parseSudoScenarioId(String(scenarioId))));
  return `${SUDO_SUB_HASH}?${params.toString()}`;
}

export function buildSudoMainPath() {
  return SUDO_MAIN_PATH;
}

export function buildSudoSubPath(
  scenarioId = SUDO_DEFAULT_SUB_SCENARIO_ID,
  options: { scenarioLevel?: SudoScenarioLevel } = {}
) {
  const params = new URLSearchParams();
  params.set("scenario", String(parseSudoScenarioId(String(scenarioId))));
  if (options.scenarioLevel === "battalion") {
    params.set("level", options.scenarioLevel);
  }
  return `${SUDO_SUB_PATH}?${params.toString()}`;
}

export function buildSudoArtasPath() {
  return SUDO_ARTAS_PATH;
}
