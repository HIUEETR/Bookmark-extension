const hasChromeStorage =
  typeof chrome !== "undefined" && !!chrome.storage?.local;

export async function readStorage<T>(key: string, fallback: T): Promise<T> {
  if (hasChromeStorage) {
    const result = await chrome.storage.local.get(key);
    return (result[key] as T | undefined) ?? fallback;
  }
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function writeStorage<T>(key: string, value: T): Promise<void> {
  if (hasChromeStorage) {
    await chrome.storage.local.set({ [key]: value });
    return;
  }
  localStorage.setItem(key, JSON.stringify(value));
}

export async function removeStorage(key: string): Promise<void> {
  if (hasChromeStorage) {
    await chrome.storage.local.remove(key);
    return;
  }
  localStorage.removeItem(key);
}
