import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard, EmptyState } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatMoney, formatNumber, t } from "@/lib/i18n";
import { Download, Filter } from "lucide-react";

export const Route = createFileRoute("/admin/reports")({
  component: ReportsPage,
});

type Row = {
  id: string; quantity: number; unit_price: number; total: number; work_date: string;
  worker_id: string; product_id: string;
  workers: { name: string; worker_code: string } | null;
  products: { name: string; categories: { name: string } | null } | null;
};

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function today() { return new Date().toISOString().slice(0, 10); }

function ReportsPage() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [workerId, setWorkerId] = useState("__all__");
  const [productId, setProductId] = useState("__all__");
  const [search, setSearch] = useState("");

  const { data: workers } = useQuery({
    queryKey: ["workers-min"],
    queryFn: async () => (await supabase.from("workers").select("id, name").order("name")).data ?? [],
  });
  const { data: products } = useQuery({
    queryKey: ["products-min"],
    queryFn: async () => (await supabase.from("products").select("id, name").order("name")).data ?? [],
  });

  const { data: rows, isLoading } = useQuery({
    queryKey: ["report", from, to, workerId, productId],
    queryFn: async () => {
      let q = supabase
        .from("work_entries")
        .select("id, quantity, unit_price, total, work_date, worker_id, product_id, workers(name, worker_code), products(name, categories(name))")
        .gte("work_date", from)
        .lte("work_date", to)
        .order("work_date", { ascending: false });
      if (workerId !== "__all__") q = q.eq("worker_id", workerId);
      if (productId !== "__all__") q = q.eq("product_id", productId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const filtered = useMemo(() => {
    if (!rows) return [];
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      [r.workers?.name, r.products?.name, r.workers?.worker_code]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(s)),
    );
  }, [rows, search]);

  const totalSum = filtered.reduce((s, r) => s + Number(r.total), 0);
  const totalQty = filtered.reduce((s, r) => s + Number(r.quantity), 0);

  const byWorker = useMemo(() => {
    const m = new Map<string, { name: string; total: number; qty: number }>();
    for (const r of filtered) {
      const key = r.workers?.name ?? "—";
      const cur = m.get(key) ?? { name: key, total: 0, qty: 0 };
      cur.total += Number(r.total);
      cur.qty += Number(r.quantity);
      m.set(key, cur);
    }
    return [...m.values()].sort((a, b) => b.total - a.total);
  }, [filtered]);

  const byProduct = useMemo(() => {
    const m = new Map<string, { name: string; total: number; qty: number }>();
    for (const r of filtered) {
      const key = r.products?.name ?? "—";
      const cur = m.get(key) ?? { name: key, total: 0, qty: 0 };
      cur.total += Number(r.total);
      cur.qty += Number(r.quantity);
      m.set(key, cur);
    }
    return [...m.values()].sort((a, b) => b.total - a.total);
  }, [filtered]);

  const exportCsv = () => {
    const head = ["Sana", "Ishchi", "ID", "Mahsulot", "Kategoriya", "Miqdor", "Narx", "Jami"];
    const lines = [head.join(",")];
    for (const r of filtered) {
      const cells = [
        r.work_date,
        r.workers?.name ?? "",
        r.workers?.worker_code ?? "",
        r.products?.name ?? "",
        r.products?.categories?.name ?? "",
        String(r.quantity),
        String(r.unit_price),
        String(r.total),
      ].map((c) => `"${String(c).replace(/"/g, '""')}"`);
      lines.push(cells.join(","));
    }
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hisobot_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title={t.reports}
        subtitle={`${from} → ${to}`}
        actions={
          <Button onClick={exportCsv} variant="secondary"><Download className="size-4" />{t.exportCsv}</Button>
        }
      />

      <div className="surface mb-4 grid gap-3 rounded-xl border border-border p-3 md:grid-cols-5">
        <div className="space-y-1">
          <Label className="text-xs">{t.date} ({t.filter})</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">→</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t.worker}</Label>
          <Select value={workerId} onValueChange={setWorkerId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t.all}</SelectItem>
              {(workers ?? []).map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t.product}</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t.all}</SelectItem>
              {(products ?? []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t.search}</Label>
          <div className="relative">
            <Filter className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-7" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="…" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t.overallTotal} value={formatMoney(totalSum)} accent="primary" />
        <StatCard label={t.totalProduction} value={`${formatNumber(totalQty)} ${t.units}`} accent="success" />
        <StatCard label={t.totalEntries} value={String(filtered.length)} accent="warning" />
        <StatCard label={t.workers} value={String(byWorker.length)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="surface rounded-xl border border-border p-4">
          <div className="mb-3 font-semibold">{t.earningsByWorker}</div>
          {byWorker.length === 0 ? <EmptyState title={t.noData} /> : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="py-1.5">{t.worker}</th><th className="py-1.5 text-right">{t.units}</th><th className="py-1.5 text-right">{t.total}</th></tr>
              </thead>
              <tbody>
                {byWorker.map((r) => (
                  <tr key={r.name} className="border-t border-border/60">
                    <td className="py-2">{r.name}</td>
                    <td className="py-2 text-right">{formatNumber(r.qty)}</td>
                    <td className="py-2 text-right font-mono">{formatMoney(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="surface rounded-xl border border-border p-4">
          <div className="mb-3 font-semibold">{t.productionByProduct}</div>
          {byProduct.length === 0 ? <EmptyState title={t.noData} /> : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="py-1.5">{t.product}</th><th className="py-1.5 text-right">{t.units}</th><th className="py-1.5 text-right">{t.total}</th></tr>
              </thead>
              <tbody>
                {byProduct.map((r) => (
                  <tr key={r.name} className="border-t border-border/60">
                    <td className="py-2">{r.name}</td>
                    <td className="py-2 text-right">{formatNumber(r.qty)}</td>
                    <td className="py-2 text-right font-mono">{formatMoney(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="mt-6 surface rounded-xl border border-border">
        <div className="border-b border-border/60 px-4 py-3 font-semibold">Yozuvlar</div>
        {isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">{t.loading}</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">{t.noData}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">{t.date}</th>
                  <th className="px-3 py-2">{t.worker}</th>
                  <th className="px-3 py-2">{t.product}</th>
                  <th className="px-3 py-2 text-right">{t.quantity}</th>
                  <th className="px-3 py-2 text-right">{t.price}</th>
                  <th className="px-3 py-2 text-right">{t.total}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border/60">
                    <td className="px-3 py-2 font-mono text-xs">{r.work_date}</td>
                    <td className="px-3 py-2">{r.workers?.name ?? "—"}</td>
                    <td className="px-3 py-2">{r.products?.name ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(r.quantity)}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatMoney(Number(r.unit_price))}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold">{formatMoney(Number(r.total))}</td>
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
