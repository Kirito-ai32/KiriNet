import type { ConfigContext, ExpoConfig } from 'expo/config';

const LOCAL_BACKEND_URL = 'http://127.0.0.1:8000';
const URL_PLACEHOLDER = 'https://YOUR_BACKEND_URL';

const normalizeUrl = (value?: string | null): string | null => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === URL_PLACEHOLDER) {
    return null;
  }

  return trimmed.replace(/\/+$/, '');
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const envBackendUrl = normalizeUrl(process.env.EXPO_PUBLIC_BACKEND_URL);
  const configBackendUrl = normalizeUrl(
    (config.extra as Record<string, unknown> | undefined)?.EXPO_PUBLIC_BACKEND_URL as
      | string
      | undefined
  );
  const isEasBuild = process.env.EAS_BUILD === 'true';

  if (isEasBuild && !envBackendUrl && !configBackendUrl) {
    throw new Error(
      'EXPO_PUBLIC_BACKEND_URL is required for EAS builds. Set a public backend URL.'
    );
  }

  const androidConfig = {
    ...(config.android as Record<string, unknown> | undefined),
    // Keep HTTP support for dev-only endpoints. Production should use HTTPS.
    usesCleartextTraffic: true,
  } as ExpoConfig['android'];

  return {
    ...config,
    extra: {
      ...config.extra,
      EXPO_PUBLIC_BACKEND_URL:
        envBackendUrl || configBackendUrl || LOCAL_BACKEND_URL,
    },
    android: androidConfig,
  } as ExpoConfig;
};
