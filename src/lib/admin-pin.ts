const KEY = "admin_pin_unlocked_v1";
// Unlock for ~6 hours per session
const TTL_MS = 6 * 60 * 60 * 1000;

export function isPinUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!ts || Date.now() - ts > TTL_MS) {
      sessionStorage.removeItem(KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function markPinUnlocked() {
  try { sessionStorage.setItem(KEY, String(Date.now())); } catch {}
  try { window.dispatchEvent(new Event("admin-pin-changed")); } catch {}
}

export function lockPin() {
  try { sessionStorage.removeItem(KEY); } catch {}
  try { window.dispatchEvent(new Event("admin-pin-changed")); } catch {}
}