import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, formatNumber, t } from "@/lib/i18n";
import { isCurrentUserAdmin } from "@/lib/auth";

export const Route = createFileRoute("/bugun")({
  component: BugunPage,
  head: () => ({
    meta: [
      { title: "Bugun — Blessed Al Live" },
      { name: "description", content: "Bugungi hodimlar yakuni — tezkor ko'rinish" },
    ],
  }),
});

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function BugunPage() {
  const navigate = useNavigate();
  const today = todayStr();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate({ to: "/login" });
        return;
      }
      const ok = await isCurrentUserAdmin();
      if (!ok) {
        navigate({ to: "/" });
        return;
      }
      setReady(true);
    })();
  }, [navigate]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["bugun-day", today],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_entries")
        .select("id, quantity, total, worker_id, product_id, workers(name, worker_code), products(name)")
        .eq("work_date", today);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    refetchInterval: 60_000,
  });

  const byWorker = useMemo(() => {
    const m = new Map<string, { worker_id: string; name: string; worker_code: string; qty: number; total: number; entries: number }>();
    for (const r of data ?? []) {
      const id = r.worker_id;
      const cur = m.get(id) ?? {
        worker_id: id,
        name: r.workers?.name ?? "—",
        worker_code: r.workers?.worker_code ?? "",
        qty: 0, total: 0, entries: 0,
      };
      cur.qty += Number(r.quantity);
      cur.total += Number(r.total);
      cur.entries += 1;
      m.set(id, cur);
    }
    return [...m.values()].sort((a, b) => b.total - a.total);
  }, [data]);

  const total = byWorker.reduce((s, w) => s + w.total, 0);
  const totalQty = byWorker.reduce((s, w) => s + w.qty, 0);

  return (
    <div className="min-h-[100dvh] bg-background bg-grid">
      <div className="mx-auto max-w-xl px-4 py-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{today}</div>
            <div className="text-xl font-bold">Bugungi hodimlar yakuni</div>
          </div>
          <button
            onClick={() => refetch()}
            className="rounded-md border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            {isFetching ? "..." : "Yangilash"}
          </button>
        </div>

        <div className="surface mb-4 grid grid-cols-2 gap-3 rounded-xl border border-border p-4">
          <div>
            <div className="text-xs text-muted-foreground">Umumiy summa</div>
            <div className="font-mono text-2xl font-bold text-primary">{formatMoney(total)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Jami dona</div>
            <div className="font-mono text-2xl font-bold">{formatNumber(totalQty)}</div>
          </div>
        </div>

        <div className="surface rounded-xl border border-border">
          {!ready || isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Yuklanmoqda…</div>
          ) : byWorker.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">{t.noData}</div>
          ) : (
            <ul className="divide-y divide-border/60">
              {byWorker.map((w) => (
                <li key={w.worker_id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-semibold">{w.name}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">#{w.worker_code}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {w.entries} {t.records.toLowerCase()} • {formatNumber(w.qty)} {t.units}
                    </div>
                  </div>
                  <div className="font-mono font-semibold text-primary">{formatMoney(w.total)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-5 text-center">
          <Link to="/admin" className="text-xs text-muted-foreground hover:text-foreground">
            To'liq boshqaruv paneliga →
          </Link>
        </div>
      </div>
    </div>
  );
}