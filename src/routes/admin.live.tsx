import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard, EmptyState } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney, formatNumber, t } from "@/lib/i18n";
import { Pencil, Trash2, Radio, Filter } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/live")({
  component: LivePage,
});

type Row = {
  id: string;
  quantity: number;
  unit_price: number;
  total: number;
  work_date: string;
  worker_id: string;
  product_id: string;
  created_at: string;
  workers: { name: string; worker_code: string } | null;
  products: { name: string; categories: { name: string } | null } | null;
};

function LivePage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [workerId, setWorkerId] = useState("__all__");
  const [editing, setEditing] = useState<Row | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  // Joriy davr boshlanish sanasi
  const { data: currentPeriod } = useQuery({
    queryKey: ["current-period"],
    queryFn: async () => {
      const { data } = await supabase
        .from("periods")
        .select("id, start_date")
        .eq("status", "open")
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

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
    enabled: !!currentPeriod,
    queryKey: ["live-entries", currentPeriod?.start_date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_entries")
        .select(
          "id, quantity, unit_price, total, work_date, worker_id, product_id, created_at, workers(name, worker_code), products(name, categories(name))",
        )
        .gte("work_date", currentPeriod!.start_date)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  // Realtime: joriy davrdagi har qanday o'zgarishni eshitish
  useEffect(() => {
    const ch = supabase
      .channel("admin-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "work_entries" },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["live-entries"] });
          if (payload.eventType === "INSERT") {
            const id = (payload.new as any)?.id as string;
            if (id) {
              setFlash(id);
              setTimeout(() => setFlash((cur) => (cur === id ? null : cur)), 2400);
            }
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const filtered = useMemo(() => {
    let list = rows ?? [];
    if (workerId !== "__all__") list = list.filter((r) => r.worker_id === workerId);
    const s = search.trim().toLowerCase();
    if (s) {
      list = list.filter((r) =>
        [r.workers?.name, r.products?.name, r.workers?.worker_code]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(s)),
      );
    }
    return list;
  }, [rows, workerId, search]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRows = filtered.filter((r) => r.work_date === todayStr);
  const totalToday = todayRows.reduce((s, r) => s + Number(r.total), 0);
  const totalQtyToday = todayRows.reduce((s, r) => s + Number(r.quantity), 0);

  const onDelete = async (r: Row) => {
    if (!confirm(`${t.delete}?`)) return;
    const { error } = await supabase.from("work_entries").delete().eq("id", r.id);
    if (error) toast.error(error.message);
    else {
      toast.success(t.deleted);
      qc.invalidateQueries({ queryKey: ["live-entries"] });
    }
  };

  return (
    <>
      <PageHeader
        title={t.liveFeed}
        subtitle={
          <span className="inline-flex items-center gap-1.5">
            <Radio className="size-3 animate-pulse text-success" />
            {t.liveUpdate}
            {currentPeriod && (
              <span className="font-mono text-xs text-muted-foreground">
                • {t.currentPeriod}: {currentPeriod.start_date}
              </span>
            )}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label={t.todaySummary} value={formatMoney(totalToday)} accent="primary" />
        <StatCard
          label={`${t.totalProduction} (${t.date})`}
          value={`${formatNumber(totalQtyToday)} ${t.units}`}
          accent="success"
        />
        <StatCard label={t.totalEntries} value={String(filtered.length)} accent="warning" />
      </div>

      <div className="surface mt-4 mb-4 grid gap-3 rounded-xl border border-border p-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">{t.worker}</Label>
          <Select value={workerId} onValueChange={setWorkerId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t.all}</SelectItem>
              {(workers ?? []).map((w: any) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t.search}</Label>
          <div className="relative">
            <Filter className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-7"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="…"
            />
          </div>
        </div>
      </div>

      <div className="surface rounded-xl border border-border">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div className="font-semibold">{t.liveFeed}</div>
          <div className="text-xs text-muted-foreground">
            {filtered.length} {t.records.toLowerCase()}
          </div>
        </div>

        {isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">{t.loading}</div>
        ) : filtered.length === 0 ? (
          <div className="p-4"><EmptyState title={t.noData} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-accent/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">{t.date}</th>
                  <th className="px-3 py-2">{t.worker}</th>
                  <th className="px-3 py-2">{t.product}</th>
                  <th className="px-3 py-2 text-right">{t.quantity}</th>
                  <th className="px-3 py-2 text-right">{t.price}</th>
                  <th className="px-3 py-2 text-right">{t.total}</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-t border-border/60 transition-colors ${
                      flash === r.id ? "bg-success/15" : ""
                    }`}
                  >
                    <td className="px-3 py-2 font-mono text-xs">{r.work_date}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.workers?.name ?? "—"}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        #{r.workers?.worker_code ?? "—"}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div>{r.products?.name ?? "—"}</div>
                      {r.products?.categories?.name && (
                        <div className="text-xs text-muted-foreground">
                          {r.products.categories.name}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">{formatNumber(r.quantity)}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {formatMoney(Number(r.unit_price))}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-primary">
                      {formatMoney(Number(r.total))}
                    </td>
                    <td className="px-3 py-2">
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
        )}
      </div>

      <EditEntryDialog
        entry={editing}
        products={products ?? []}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          qc.invalidateQueries({ queryKey: ["live-entries"] });
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

  useEffect(() => {
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
          <DialogDescription>{t.edit}</DialogDescription>
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
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t.quantity}</Label>
              <Input
                type="number"
                min="0"
                step="any"
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
            <Button type="button" variant="ghost" onClick={onClose}>{t.cancel}</Button>
            <Button type="submit" disabled={saving}>{t.save}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
