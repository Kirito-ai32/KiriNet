import Constants from 'expo-constants';

const LOCAL_BACKEND_URL = 'http://127.0.0.1:8000';

const extractHost = (hostUri?: string): string | null => {
  if (!hostUri || typeof hostUri !== 'string') {
    return null;
  }

  const [host] = hostUri.split(':');
  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return null;
  }

  return host;
};

const normalizeUrl = (value?: string | null): string | null => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim().replace(/\/+$/, '');
  return trimmed.length > 0 ? trimmed : null;
};

const isLocalNetworkHost = (host: string): boolean =>
  host === 'localhost' ||
  host === '127.0.0.1' ||
  host === '0.0.0.0' ||
  host.startsWith('10.') ||
  host.startsWith('192.168.') ||
  /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);

const isLocalBackendUrl = (url?: string | null): boolean => {
  if (!url) {
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    return isLocalNetworkHost(parsedUrl.hostname);
  } catch {
    return false;
  }
};

const configuredBackendUrl = normalizeUrl(
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
    process.env.EXPO_PUBLIC_BACKEND_URL
);

const expoHost =
  extractHost((Constants.expoConfig as any)?.hostUri) ||
  extractHost((Constants as any)?.manifest2?.extra?.expoClient?.hostUri) ||
  extractHost((Constants as any)?.manifest?.debuggerHost);

const derivedBackendUrl = normalizeUrl(expoHost ? `http://${expoHost}:8000` : null);

export const BACKEND_URL =
  (configuredBackendUrl && !isLocalBackendUrl(configuredBackendUrl)
    ? configuredBackendUrl
    : null) ||
  derivedBackendUrl ||
  configuredBackendUrl ||
  LOCAL_BACKEND_URL;

export const API_URL = `${BACKEND_URL}/api`;

export const buildWebSocketUrl = (userId: string): string => {
  const normalizedBase = BACKEND_URL.replace(/\/+$/, '');
  const wsBase = normalizedBase.replace(/^http/i, 'ws');
  return `${wsBase}/ws/${encodeURIComponent(userId)}`;
};
