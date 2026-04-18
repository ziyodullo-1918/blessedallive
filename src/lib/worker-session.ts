// Worker auth = PIN verified per-RPC. Session is just stored locally.
const KEY = "worker_session_v1";

export type WorkerSession = {
  id: string;
  worker_code: string;
  name: string;
  pin: string; // kept locally so RPCs can re-verify on every call
};

export function getWorkerSession(): WorkerSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WorkerSession) : null;
  } catch {
    return null;
  }
}

export function setWorkerSession(s: WorkerSession) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearWorkerSession() {
  localStorage.removeItem(KEY);
}
