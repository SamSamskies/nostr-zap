const CACHE_PREFIX = "nostrZap.";
const LIGHTNING_URI_KEY = "lightningUri";

const isLocalStorageAvailable = () => typeof localStorage !== "undefined";

const getCachedValue = (key) => {
  if (!isLocalStorageAvailable()) {
    return;
  }

  return localStorage.getItem(`${CACHE_PREFIX}${key}`);
};

const setCachedValue = (key, value) => {
  if (!isLocalStorageAvailable()) {
    return;
  }

  localStorage.setItem(`${CACHE_PREFIX}${key}`, value);
};

export const getCachedLightningUri = () => getCachedValue(LIGHTNING_URI_KEY);

export const cacheLightningUri = (value) =>
  setCachedValue(LIGHTNING_URI_KEY, value);
