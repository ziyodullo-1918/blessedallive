// Worker auth = opaque session token verified server-side per RPC.
const KEY = "worker_session_v2";

export type WorkerSession = {
  id: string;
  worker_code: string;
  name: string;
  token: string;
  expires_at: string; // ISO
};

export function getWorkerSession(): WorkerSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as WorkerSession;
    if (s.expires_at && new Date(s.expires_at).getTime() < Date.now()) {
      localStorage.removeItem(KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function setWorkerSession(s: WorkerSession) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearWorkerSession() {
  localStorage.removeItem(KEY);
  // legacy cleanup
  localStorage.removeItem("worker_session_v1");
}
