import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { clearWorkerSession, getWorkerSession, type WorkerSession } from "@/lib/worker-session";

export function useRequireWorker() {
  const navigate = useNavigate();
  const [session, setSession] = useState<WorkerSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = getWorkerSession();
    if (!s) {
      clearWorkerSession();
      navigate({ to: "/worker-login" });
      return;
    }
    setSession(s);
    setReady(true);
  }, [navigate]);

  return { session, ready };
}
