import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard, EmptyState } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatMoney, formatNumber, t } from "@/lib/i18n";
import { Download, FileText, Filter, Pencil, Trash2 } from "lucide-react";
import { workerMonthlyPdf, productsPdf, salariesPdf } from "@/lib/pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reports")({
  component: ReportsPage,
});

type Row = {
  id: string;
  quantity: number;
  unit_price: number;
  total: number;
  work_date: string;
  worker_id: string;
  product_id: string;
  workers: { name: string; worker_code: string } | null;
  products: { name: string; categories: { name: string } | null } | null;
};

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

function ReportsPage() {
  const qc = useQueryClient();
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [workerId, setWorkerId] = useState("__all__");
  const [productId, setProductId] = useState("__all__");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);

  const { data: workers } = useQuery({
    queryKey: ["workers-min"],
    queryFn: async () =>
      (await supabase.from("workers").select("id, name, worker_code").order("name")).data ?? [],
  });
  const { data: products } = useQuery({
    queryKey: ["products-min"],
    queryFn: async () =>
      (await supabase.from("products").select("id, name").order("name")).data ?? [],
  });

  const { data: rows, isLoading } = useQuery({
    queryKey: ["report", from, to, workerId, productId],
    queryFn: async () => {
      let q = supabase
        .from("work_entries")
        .select(
          "id, quantity, unit_price, total, work_date, worker_id, product_id, workers(name, worker_code), products(name, categories(name))",
        )
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

  // ============ Workers monthly merged section ============
  type WorkerAgg = {
    worker_id: string;
    name: string;
    worker_code: string;
    qty: number;
    total: number;
    entries: Row[];
  };

  const byWorker: WorkerAgg[] = useMemo(() => {
    const m = new Map<string, WorkerAgg>();
    for (const r of filtered) {
      const id = r.worker_id;
      const cur =
        m.get(id) ??
        {
          worker_id: id,
          name: r.workers?.name ?? "—",
          worker_code: r.workers?.worker_code ?? "",
          qty: 0,
          total: 0,
          entries: [],
        };
      cur.qty += Number(r.quantity);
      cur.total += Number(r.total);
      cur.entries.push(r);
      m.set(id, cur);
    }
    return [...m.values()].sort((a, b) => b.total - a.total);
  }, [filtered]);

  const byProduct = useMemo(() => {
    const m = new Map<string, { name: string; category: string | null; total: number; qty: number }>();
    for (const r of filtered) {
      const key = r.products?.name ?? "—";
      const cur =
        m.get(key) ?? { name: key, category: r.products?.categories?.name ?? null, total: 0, qty: 0 };
      cur.total += Number(r.total);
      cur.qty += Number(r.quantity);
      m.set(key, cur);
    }
    return [...m.values()].sort((a, b) => b.total - a.total);
  }, [filtered]);

  const downloadSalariesPdf = () => {
    salariesPdf({
      from,
      to,
      rows: byWorker.map((w) => ({
        worker_name: w.name,
        worker_code: w.worker_code,
        quantity: w.qty,
        total: w.total,
        entries: w.entries.length,
      })),
    });
  };

  const downloadWorkerPdf = (w: WorkerAgg) => {
    workerMonthlyPdf({
      workerName: w.name,
      workerCode: w.worker_code,
      from,
      to,
      entries: w.entries.map((e) => ({
        work_date: e.work_date,
        product_name: e.products?.name ?? "—",
        category_name: e.products?.categories?.name ?? null,
        quantity: Number(e.quantity),
        unit_price: Number(e.unit_price),
        total: Number(e.total),
      })),
    });
  };

  const downloadProductsPdf = () => {
    productsPdf({
      from,
      to,
      rows: byProduct.map((p) => ({
        product_name: p.name,
        category_name: p.category,
        quantity: p.qty,
        total: p.total,
      })),
    });
  };

  const onDelete = async (r: Row) => {
    if (!confirm(`${t.delete}?`)) return;
    const { error } = await supabase.from("work_entries").delete().eq("id", r.id);
    if (error) toast.error(error.message);
    else {
      toast.success(t.deleted);
      qc.invalidateQueries({ queryKey: ["report"] });
    }
  };

  return (
    <>
      <PageHeader
        title={t.reports}
        subtitle={`${from} → ${to}`}
        actions={
          <>
            <Button onClick={downloadSalariesPdf}>
              <Download className="size-4" />
              {t.salaries}
            </Button>
            <Button onClick={downloadProductsPdf} variant="secondary">
              <FileText className="size-4" />
              {t.productsReport}
            </Button>
          </>
        }
      />

      <div className="surface mb-4 grid gap-3 rounded-xl border border-border p-3 md:grid-cols-5">
        <div className="space-y-1">
          <Label className="text-xs">
            {t.from}
          </Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t.to}</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t.worker}</Label>
          <Select value={workerId} onValueChange={setWorkerId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t.all}</SelectItem>
              {(workers ?? []).map((w: any) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t.product}</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t.all}</SelectItem>
              {(products ?? []).map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label={t.overallTotal} value={formatMoney(totalSum)} accent="primary" />
        <StatCard label={t.totalProduction} value={`${formatNumber(totalQty)} ${t.units}`} accent="success" />
        <StatCard label={t.workers} value={String(byWorker.length)} accent="warning" />
      </div>

      {/* ============ Merged: Workers monthly report (earnings + entries per worker) ============ */}
      <div className="mt-6 surface rounded-xl border border-border">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div className="font-semibold">{t.workersMonthlyReport}</div>
          <div className="text-xs text-muted-foreground">
            {from} → {to}
          </div>
        </div>

        {isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">{t.loading}</div>
        ) : byWorker.length === 0 ? (
          <div className="p-4">
            <EmptyState title={t.noData} />
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {byWorker.map((w) => (
              <details key={w.worker_id} className="group">
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-semibold">{w.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">#{w.worker_code}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {w.entries.length} {t.records.toLowerCase()} • {formatNumber(w.qty)} {t.units}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-semibold text-primary">{formatMoney(w.total)}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.preventDefault();
                      downloadWorkerPdf(w);
                    }}
                  >
                    <FileText className="size-4" />
                    PDF
                  </Button>
                </summary>

                <div className="overflow-x-auto bg-muted/20 px-4 pb-4">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-2 py-2">{t.date}</th>
                        <th className="px-2 py-2">{t.product}</th>
                        <th className="px-2 py-2 text-right">{t.quantity}</th>
                        <th className="px-2 py-2 text-right">{t.price}</th>
                        <th className="px-2 py-2 text-right">{t.total}</th>
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {w.entries.map((r) => (
                        <tr key={r.id} className="border-t border-border/50">
                          <td className="px-2 py-2 font-mono text-xs">{r.work_date}</td>
                          <td className="px-2 py-2">
                            <div>{r.products?.name ?? "—"}</div>
                            {r.products?.categories?.name && (
                              <div className="text-xs text-muted-foreground">
                                {r.products.categories.name}
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-2 text-right">{formatNumber(r.quantity)}</td>
                          <td className="px-2 py-2 text-right font-mono">
                            {formatMoney(Number(r.unit_price))}
                          </td>
                          <td className="px-2 py-2 text-right font-mono font-semibold">
                            {formatMoney(Number(r.total))}
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" onClick={() => setEditing(r)}>
                                <Pencil className="size-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => onDelete(r)}>
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>

      {/* ============ Products summary ============ */}
      <div className="mt-6 surface rounded-xl border border-border p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-semibold">{t.productionByProduct}</div>
          <Button size="sm" variant="secondary" onClick={downloadProductsPdf}>
            <FileText className="size-4" />
            PDF
          </Button>
        </div>
        {byProduct.length === 0 ? (
          <EmptyState title={t.noData} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-2">{t.product}</th>
                  <th className="py-2">{t.category}</th>
                  <th className="py-2 text-right">{t.units}</th>
                  <th className="py-2 text-right">{t.total}</th>
                </tr>
              </thead>
              <tbody>
                {byProduct.map((r) => (
                  <tr key={r.name} className="border-t border-border/60">
                    <td className="py-2">{r.name}</td>
                    <td className="py-2 text-xs text-muted-foreground">{r.category ?? "—"}</td>
                    <td className="py-2 text-right">{formatNumber(r.qty)}</td>
                    <td className="py-2 text-right font-mono">{formatMoney(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EditEntryDialog
        entry={editing}
        products={products ?? []}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          qc.invalidateQueries({ queryKey: ["report"] });
        }}
      />
    </>
  );
}

function EditEntryDialog({
  entry,
  products,
  onClose,
  onSaved,
}: {
  entry: Row | null;
  products: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [productId, setProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [workDate, setWorkDate] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Sync state when entry changes
  useMemo(() => {
    if (entry) {
      setProductId(entry.product_id);
      setQuantity(String(entry.quantity));
      setWorkDate(entry.work_date);
    }
  }, [entry]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entry) return;
    const q = Number(quantity);
    if (!productId || !q || q <= 0) {
      toast.error(t.error);
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc("admin_update_entry", {
      _entry_id: entry.id,
      _product_id: productId,
      _quantity: q,
      _work_date: workDate,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success(t.saved);
      onSaved();
    }
  };

  return (
    <Dialog open={!!entry} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.edit}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label>{t.product}</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder={t.selectProduct} />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t.quantity}</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>{t.date}</Label>
              <Input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t.cancel}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t.loading : t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
