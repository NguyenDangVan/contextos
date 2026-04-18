export const DEMO_API_KEY = 'ctx_demo_key_2026_hackathon_testsprite';
export const API_KEY_STORAGE_KEY = 'contextos_api_key';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getBrowserStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function getStoredApiKey(storage: Pick<StorageLike, 'getItem'> | null = getBrowserStorage()): string {
  const stored = storage?.getItem(API_KEY_STORAGE_KEY)?.trim();
  return stored || DEMO_API_KEY;
}

export function persistApiKey(apiKey: string, storage: StorageLike | null = getBrowserStorage()): string {
  const normalized = apiKey.trim();
  if (!storage || !normalized || normalized === DEMO_API_KEY) {
    storage?.removeItem(API_KEY_STORAGE_KEY);
    return DEMO_API_KEY;
  }

  storage.setItem(API_KEY_STORAGE_KEY, normalized);
  return normalized;
}

export function clearStoredApiKey(storage: StorageLike | null = getBrowserStorage()): string {
  storage?.removeItem(API_KEY_STORAGE_KEY);
  return DEMO_API_KEY;
}

export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 12) return apiKey;
  return `${apiKey.slice(0, 8)}...${apiKey.slice(-6)}`;
}

