import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireWorker } from "@/hooks/use-require-worker";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney, t } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/worker/new")({
  component: NewEntry,
});

type Product = { id: string; name: string; price: number; category_name: string | null };

function NewEntry() {
  const { session } = useRequireWorker();
  const navigate = useNavigate();
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const { data: currentPeriod } = useQuery({
    queryKey: ["worker-period", session?.token],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_worker_period", { _token: session!.token });
      if (error) throw error;
      const row = (data ?? [])[0];
      return (row ?? null) as { start_date: string; end_date: string | null } | null;
    },
  });

  const minDate = currentPeriod?.start_date ?? undefined;
  const maxDate = today;

  const { data: products } = useQuery({
    queryKey: ["worker-products", session?.token],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_worker_products", { _token: session!.token });
      if (error) throw error;
      return (data ?? []) as unknown as Product[];
    },
  });

  const selected = useMemo(() => products?.find((p) => p.id === productId), [products, productId]);
  const total = selected ? Number(selected.price) * Number(quantity || 0) : 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    if (!productId) { toast.error(t.selectProduct); return; }
    if (date > today) {
      toast.error("Kelajakdagi sana kiritib bo'lmaydi");
      return;
    }
    if (minDate && date < minDate) {
      toast.error(`Sana joriy davr boshlanishidan (${minDate}) oldin bo'lishi mumkin emas`);
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc("submit_work_entry", {
      _token: session.token,
      _product_id: productId,
      _quantity: Number(quantity),
      _work_date: date,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success(t.saved);
      navigate({ to: "/worker" });
    }
  };

  if (!session) return null;

  return (
    <>
      <PageHeader title={t.addEntry} subtitle={t.myWork} />
      <div className="surface mx-auto max-w-xl rounded-xl border border-border p-5">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t.product}</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger><SelectValue placeholder={t.selectProduct} /></SelectTrigger>
              <SelectContent>
                {(products ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}{p.category_name ? ` · ${p.category_name}` : ""} — {formatMoney(Number(p.price))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t.quantity}</Label>
              <Input type="number" inputMode="decimal" min="0.01" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>{t.date}</Label>
              <Input
                type="date"
                value={date}
                min={minDate}
                max={maxDate}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              {currentPeriod && (
                <p className="text-xs text-muted-foreground">
                  Joriy davr: {currentPeriod.start_date} → bugun ({today})
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card/60 p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{t.total}</div>
            <div className="mt-1 text-3xl font-bold text-gradient">{formatMoney(total)}</div>
            {selected && (
              <div className="mt-1 text-xs text-muted-foreground">
                {quantity || 0} × {formatMoney(Number(selected.price))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => navigate({ to: "/worker" })}>{t.cancel}</Button>
            <Button type="submit" className="flex-1" disabled={loading || !productId}>{loading ? t.loading : t.submit}</Button>
          </div>
        </form>
      </div>
    </>
  );
}
