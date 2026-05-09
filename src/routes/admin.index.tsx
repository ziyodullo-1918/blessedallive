import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard } from "@/components/page-header";
import { formatMoney, formatNumber, t } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export const Route = createFileRoute("/admin/")({
  component: AdminIndex,
});

const palette = ["oklch(0.72 0.18 245)", "oklch(0.7 0.16 155)", "oklch(0.78 0.16 80)", "oklch(0.68 0.2 320)", "oklch(0.65 0.2 25)"];

type Entry = {
  id: string; quantity: number; unit_price: number; total: number; work_date: string;
  worker_id: string; product_id: string;
  workers: { name: string } | null;
  products: { name: string } | null;
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function AdminIndex() {
  const today = todayStr();
  const [pickedDate, setPickedDate] = useState<string>(today);

  const { data: currentPeriod } = useQuery({
    queryKey: ["current-period-dash"],
    queryFn: async () => {
      const { data } = await supabase
        .from("periods")
        .select("id, start_date, end_date, status")
        .eq("status", "open")
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const start = currentPeriod?.start_date ?? today;
  const endInclusive = currentPeriod?.end_date ?? today;
  // exclusive upper bound for lt()
  const end = (() => {
    const d = new Date(endInclusive);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  const { data: monthData } = useQuery({
    queryKey: ["admin-period", start, end],
    enabled: !!currentPeriod,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_entries")
        .select("id, quantity, unit_price, total, work_date, worker_id, product_id, workers(name), products(name)")
        .gte("work_date", start)
        .lt("work_date", end);
      if (error) throw error;
      return (data ?? []) as unknown as Entry[];
    },
  });

  const { data: todayData } = useQuery({
    queryKey: ["admin-today", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_entries")
        .select("id, quantity, total, workers(name), products(name)")
        .eq("work_date", today);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: dayData } = useQuery({
    queryKey: ["admin-day", pickedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_entries")
        .select("id, quantity, total, worker_id, product_id, workers(name, worker_code), products(name)")
        .eq("work_date", pickedDate);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const dayByWorker = useMemo(() => {
    const m = new Map<string, { worker_id: string; name: string; worker_code: string; qty: number; total: number; entries: number; products: Map<string, { name: string; qty: number; total: number }> }>();
    for (const r of dayData ?? []) {
      const id = r.worker_id;
      const cur = m.get(id) ?? {
        worker_id: id,
        name: r.workers?.name ?? "—",
        worker_code: r.workers?.worker_code ?? "",
        qty: 0, total: 0, entries: 0, products: new Map(),
      };
      cur.qty += Number(r.quantity);
      cur.total += Number(r.total);
      cur.entries += 1;
      const pname = r.products?.name ?? "—";
      const pkey = r.product_id;
      const pcur = cur.products.get(pkey) ?? { name: pname, qty: 0, total: 0 };
      pcur.qty += Number(r.quantity);
      pcur.total += Number(r.total);
      cur.products.set(pkey, pcur);
      m.set(id, cur);
    }
    return [...m.values()]
      .map((w) => ({ ...w, productList: [...w.products.values()].sort((a, b) => b.total - a.total) }))
      .sort((a, b) => b.total - a.total);
  }, [dayData]);

  const totalThisMonth = (monthData ?? []).reduce((s, e) => s + Number(e.total), 0);
  const totalToday = (todayData ?? []).reduce((s, e: any) => s + Number(e.total), 0);
  const todayQty = (todayData ?? []).reduce((s, e: any) => s + Number(e.quantity), 0);
  const activeWorkersToday = new Set((todayData ?? []).map((e: any) => e.workers?.name).filter(Boolean)).size;

  const byProduct = Object.values(
    (monthData ?? []).reduce<Record<string, { name: string; qty: number; total: number }>>((acc, e) => {
      const key = e.products?.name ?? "—";
      acc[key] ??= { name: key, qty: 0, total: 0 };
      acc[key].qty += Number(e.quantity);
      acc[key].total += Number(e.total);
      return acc;
    }, {}),
  ).sort((a, b) => b.total - a.total).slice(0, 8);

  const byWorker = Object.values(
    (monthData ?? []).reduce<Record<string, { name: string; total: number }>>((acc, e) => {
      const key = e.workers?.name ?? "—";
      acc[key] ??= { name: key, total: 0 };
      acc[key].total += Number(e.total);
      return acc;
    }, {}),
  ).sort((a, b) => b.total - a.total);

  const periodLabel = currentPeriod
    ? `${currentPeriod.start_date} — ${currentPeriod.end_date ?? today}`
    : "—";

  return (
    <>
      <PageHeader title={t.dashboard} subtitle={periodLabel} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t.overallTotal} value={formatMoney(totalThisMonth)} hint={periodLabel} accent="primary" />
        <StatCard label={t.todaySummary} value={formatMoney(totalToday)} hint={`${todayQty} ${t.units}`} accent="success" />
        <StatCard label={t.totalEntries} value={String(monthData?.length ?? 0)} hint={periodLabel} accent="warning" />
        <StatCard label={t.workers} value={String(activeWorkersToday)} hint="bugun faol" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="surface rounded-xl border border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-semibold">{t.productionByProduct}</div>
            <div className="text-xs text-muted-foreground">{periodLabel}</div>
          </div>
          {byProduct.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{t.noData}</div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byProduct} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                  <XAxis dataKey="name" stroke="oklch(0.68 0.015 240)" fontSize={11} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis stroke="oklch(0.68 0.015 240)" fontSize={11} />
                  <Tooltip
                    contentStyle={{ background: "oklch(0.205 0.013 250)", border: "1px solid oklch(1 0 0 / 8%)", borderRadius: 8, color: "white" }}
                    formatter={(v: any) => [`${v}`, t.quantity]}
                  />
                  <Bar dataKey="qty" fill="oklch(0.72 0.18 245)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="surface rounded-xl border border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-semibold">{t.earningsByWorker}</div>
            <div className="text-xs text-muted-foreground">{periodLabel}</div>
          </div>
          {byWorker.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{t.noData}</div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byWorker} dataKey="total" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {byWorker.map((_, i) => (
                      <Cell key={i} fill={palette[i % palette.length]} stroke="oklch(0.16 0.012 250)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "oklch(0.205 0.013 250)", border: "1px solid oklch(1 0 0 / 8%)", borderRadius: 8, color: "white" }}
                    formatter={(v: any) => [formatMoney(Number(v)), t.totalEarnings]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: "oklch(0.68 0.015 240)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 surface rounded-xl border border-border">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
          <div className="font-semibold">{t.todayTotalsByWorker}</div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">{t.date}</Label>
            <Input
              type="date"
              className="h-8 w-auto"
              value={pickedDate}
              min={currentPeriod?.start_date ?? undefined}
              max={currentPeriod?.end_date ?? today}
              onChange={(e) => setPickedDate(e.target.value)}
            />
          </div>
        </div>
        {dayByWorker.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">{t.noData}</div>
        ) : (
          <ul className="divide-y divide-border/60">
            {dayByWorker.map((w) => (
              <li key={w.worker_id} className="px-4 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-semibold">{w.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">#{w.worker_code}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {w.entries} {t.records.toLowerCase()} • {formatNumber(w.qty)} {t.units}
                    </div>
                  </div>
                  <div className="font-mono font-semibold text-primary">{formatMoney(w.total)}</div>
                </div>
                <ul className="mt-2 space-y-1 border-l-2 border-border/60 pl-3 text-xs">
                  {w.productList.map((p, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 text-muted-foreground">
                      <span className="truncate">{p.name}</span>
                      <span className="font-mono">
                        {formatNumber(p.qty)} {t.units} · <span className="text-foreground">{formatMoney(p.total)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
