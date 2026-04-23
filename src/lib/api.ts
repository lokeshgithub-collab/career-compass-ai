const LOCAL_API_BASE_URL = 'http://localhost:4000';

let hasWarnedAboutMissingApiBase = false;

function normalizeBaseUrl(value?: string) {
  return value?.trim().replace(/\/+$/, '') || '';
}

export function getApiBaseUrl() {
  const configuredBaseUrl = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

    if (isLocalHost) {
      return LOCAL_API_BASE_URL;
    }

    if (!hasWarnedAboutMissingApiBase) {
      console.warn('VITE_API_BASE_URL is not set. API requests will use the current origin.');
      hasWarnedAboutMissingApiBase = true;
    }
  }

  return '';
}

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = getApiBaseUrl();

  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
}
