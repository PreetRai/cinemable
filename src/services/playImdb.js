const PLAY_IMDB_BASE_URL = 'https://www.playimdb.com/title/';
const PLAY_IMDB_PROXY_BASE_URL = 'https://r.jina.ai/http://www.playimdb.com/title/';
const STORAGE_KEY_PREFIX = 'cinemable:playimdb:availability:';
const inFlightProbes = new Map();

const normalizeImdbId = (imdbId) => {
  if (typeof imdbId !== 'string') return '';
  return imdbId.trim();
};

const getStorageKey = (imdbId) => `${STORAGE_KEY_PREFIX}${imdbId}`;

const isBoolean = (value) => typeof value === 'boolean';

const readLocalStorage = (key) => {
  if (typeof window === 'undefined' || !window.localStorage) return null;

  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
};

const writeLocalStorage = (key, value) => {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    // Ignore storage failures.
  }
};

const looksLike404 = (text) => {
  if (!text) return false;

  const normalizedText = text.toLowerCase();
  return (
    normalizedText.includes('404 not found') ||
    normalizedText.includes('page not found') ||
    normalizedText.includes('not found') ||
    normalizedText.includes('does not exist') ||
    normalizedText.includes('no such page') ||
    normalizedText.includes('unable to find') ||
    normalizedText.includes('title not found')
  );
};

export const getPlayImdbUrl = (imdbId) => {
  const normalizedImdbId = normalizeImdbId(imdbId);
  if (!normalizedImdbId) return PLAY_IMDB_BASE_URL;

  return `${PLAY_IMDB_BASE_URL}${encodeURIComponent(normalizedImdbId)}/`;
};

export const getCachedPlayAvailability = (imdbId) => {
  const normalizedImdbId = normalizeImdbId(imdbId);
  if (!normalizedImdbId) return null;

  const rawValue = readLocalStorage(getStorageKey(normalizedImdbId));
  if (rawValue === null) return null;

  try {
    const parsedValue = JSON.parse(rawValue);
    return isBoolean(parsedValue) ? parsedValue : null;
  } catch (error) {
    return null;
  }
};

export const setCachedPlayAvailability = (imdbId, value) => {
  const normalizedImdbId = normalizeImdbId(imdbId);
  if (!normalizedImdbId || !isBoolean(value)) return;

  writeLocalStorage(getStorageKey(normalizedImdbId), JSON.stringify(value));
};

export const probePlayImdbAvailability = async (imdbId, options = {}) => {
  const normalizedImdbId = normalizeImdbId(imdbId);
  if (!normalizedImdbId) return null;

  const cachedValue = getCachedPlayAvailability(normalizedImdbId);
  if (isBoolean(cachedValue)) return cachedValue;

  if (inFlightProbes.has(normalizedImdbId)) {
    return inFlightProbes.get(normalizedImdbId);
  }

  const probePromise = (async () => {
    if (typeof fetch !== 'function' || typeof AbortController !== 'function' || typeof window === 'undefined') {
      return null;
    }

    const timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : 4500;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${PLAY_IMDB_PROXY_BASE_URL}${encodeURIComponent(normalizedImdbId)}/`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
        redirect: 'follow',
      });

      const responseText = await response.text();
      const has404Signals = response.status === 404 || looksLike404(responseText);

      if (has404Signals) {
        return false;
      }

      if (response.ok && typeof responseText === 'string' && responseText.trim().length > 0) {
        return true;
      }

      return null;
    } catch (error) {
      return null;
    } finally {
      window.clearTimeout(timeoutId);
    }
  })();

  inFlightProbes.set(normalizedImdbId, probePromise);

  try {
    const result = await probePromise;
    if (isBoolean(result)) {
      setCachedPlayAvailability(normalizedImdbId, result);
    }
    return result;
  } finally {
    inFlightProbes.delete(normalizedImdbId);
  }
};