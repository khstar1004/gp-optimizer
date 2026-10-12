const FALLBACK_BASE_URL = "http://localhost/";

function getDocumentBaseUrl() {
  if (typeof document !== "undefined" && typeof document.baseURI === "string") {
    return document.baseURI;
  }

  if (
    typeof window !== "undefined" &&
    typeof window.location?.href === "string"
  ) {
    return window.location.href;
  }

  return FALLBACK_BASE_URL;
}

export function getPublicAssetBaseUrl() {
  return new URL(import.meta.env.BASE_URL, getDocumentBaseUrl());
}

export function resolvePublicAssetPath(path: string) {
  const rawPath = `${path ?? ""}`.trim();
  if (!rawPath || /^[a-z]+:/i.test(rawPath)) {
    return rawPath;
  }

  const baseUrl = getPublicAssetBaseUrl();
  const basePath = baseUrl.pathname.endsWith("/")
    ? baseUrl.pathname
    : `${baseUrl.pathname}/`;
  const absolutePath = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;

  if (basePath !== "/" && absolutePath.startsWith(basePath)) {
    return absolutePath;
  }

  const resolvedUrl = new URL(rawPath.replace(/^\/+/, ""), baseUrl);
  return `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`;
}

export function buildPublicAssetPath(
  path: string,
  searchParams?: URLSearchParams
) {
  const resolvedPath = resolvePublicAssetPath(path);
  if (!searchParams || searchParams.size === 0) {
    return resolvedPath;
  }

  const resolvedUrl = new URL(resolvedPath, FALLBACK_BASE_URL);
  resolvedUrl.search = searchParams.toString();
  return `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`;
}
