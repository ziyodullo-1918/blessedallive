import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard } from "@/components/page-header";
import { formatMoney, monthName, t } from "@/lib/i18n";
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

function monthRange(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function AdminIndex() {
  const { start, end } = monthRange();
  const today = todayStr();

  const { data: monthData } = useQuery({
    queryKey: ["admin-month", start, end],
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

  const m = new Date();
  const monthLabel = `${monthName(m.getMonth())} ${m.getFullYear()}`;

  return (
    <>
      <PageHeader title={t.dashboard} subtitle={monthLabel} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t.overallTotal} value={formatMoney(totalThisMonth)} hint={monthLabel} accent="primary" />
        <StatCard label={t.todaySummary} value={formatMoney(totalToday)} hint={`${todayQty} ${t.units}`} accent="success" />
        <StatCard label={t.totalEntries} value={String(monthData?.length ?? 0)} hint={monthLabel} accent="warning" />
        <StatCard label={t.workers} value={String(activeWorkersToday)} hint="bugun faol" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="surface rounded-xl border border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-semibold">{t.productionByProduct}</div>
            <div className="text-xs text-muted-foreground">{monthLabel}</div>
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
            <div className="text-xs text-muted-foreground">{monthLabel}</div>
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

      <div className="mt-6 surface rounded-xl border border-border p-4">
        <div className="mb-3 font-semibold">{t.todaySummary}</div>
        {(todayData ?? []).length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">{t.noData}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-2 py-2">{t.worker}</th>
                  <th className="px-2 py-2">{t.product}</th>
                  <th className="px-2 py-2 text-right">{t.quantity}</th>
                  <th className="px-2 py-2 text-right">{t.total}</th>
                </tr>
              </thead>
              <tbody>
                {(todayData ?? []).map((e: any) => (
                  <tr key={e.id} className="border-t border-border/60">
                    <td className="px-2 py-2">{e.workers?.name ?? "—"}</td>
                    <td className="px-2 py-2">{e.products?.name ?? "—"}</td>
                    <td className="px-2 py-2 text-right">{e.quantity}</td>
                    <td className="px-2 py-2 text-right font-mono">{formatMoney(Number(e.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
