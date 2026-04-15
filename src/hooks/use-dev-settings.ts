const DEV_DEBUG_KEY = "savr:showDebugTools";

export function getShowDebugTools(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    return localStorage.getItem(DEV_DEBUG_KEY) === "true";
  } catch {
    return false;
  }
}

export function setShowDebugTools(value: boolean): void {
  try {
    localStorage.setItem(DEV_DEBUG_KEY, value ? "true" : "false");
  } catch {}
}
