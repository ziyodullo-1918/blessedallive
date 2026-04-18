import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireWorker } from "@/hooks/use-require-worker";
import { PageHeader, StatCard, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { formatMoney, formatNumber, monthName, t } from "@/lib/i18n";
import { Plus, Trash2, Radio } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/worker/")({
  component: WorkerHome,
});

type Entry = {
  id: string; work_date: string; quantity: number; unit_price: number; total: number;
  product_name: string; category_name: string | null; created_at: string;
};

function WorkerHome() {
  const { session } = useRequireWorker();
  const qc = useQueryClient();

  const { data: entries, isLoading } = useQuery({
    enabled: !!session,
    queryKey: ["my-entries", session?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_entries", {
        _worker_id: session!.id,
        _pin: session!.pin,
      });
      if (error) throw error;
      return (data ?? []) as Entry[];
    },
  });

  const now = new Date();
  const month = now.getMonth(), year = now.getFullYear();
  const monthEntries = (entries ?? []).filter((e) => {
    const d = new Date(e.work_date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const monthTotal = monthEntries.reduce((s, e) => s + Number(e.total), 0);
  const monthQty = monthEntries.reduce((s, e) => s + Number(e.quantity), 0);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayEntries = (entries ?? []).filter((e) => e.work_date === todayStr);
  const todayTotal = todayEntries.reduce((s, e) => s + Number(e.total), 0);

  const onDelete = async (e: Entry) => {
    if (!confirm(t.delete + "?")) return;
    const { error } = await supabase.rpc("delete_my_entry", {
      _worker_id: session!.id, _pin: session!.pin, _entry_id: e.id,
    });
    if (error) toast.error(error.message);
    else { toast.success(t.deleted); qc.invalidateQueries({ queryKey: ["my-entries", session!.id] }); }
  };

  if (!session) return null;

  return (
    <>
      <PageHeader
        title={`${t.hello}, ${session.name}`}
        subtitle={
          <span className="inline-flex items-center gap-1.5">
            <Radio className="size-3 animate-pulse text-success" />
            {monthName(month)} {year} • {t.liveUpdate}
          </span>
        }
        actions={
          <Button asChild><Link to="/worker/new"><Plus className="size-4" />{t.addEntry}</Link></Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard
          label={t.todaySummaryAndCount}
          value={formatMoney(todayTotal)}
          hint={`${todayEntries.length} ${t.records.toLowerCase()} • ${formatNumber(
            todayEntries.reduce((s, e) => s + Number(e.quantity), 0),
          )} ${t.units}`}
          accent="success"
        />
        <StatCard
          label={t.totalEarnings}
          value={formatMoney(monthTotal)}
          hint={`${monthName(month)} • ${monthEntries.length} ${t.records.toLowerCase()}`}
          accent="primary"
        />
        <StatCard
          label={t.yourProduction}
          value={`${formatNumber(monthQty)} ${t.units}`}
          hint={monthName(month)}
          accent="warning"
        />
      </div>

      <div className="mt-6 surface rounded-xl border border-border">
        <div className="border-b border-border/60 px-4 py-3 font-semibold">{t.myWork}</div>
        {isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">{t.loading}</div>
        ) : !entries || entries.length === 0 ? (
          <EmptyState title={t.noData} hint={t.addEntry} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">{t.date}</th>
                  <th className="px-3 py-2">{t.product}</th>
                  <th className="px-3 py-2 text-right">{t.quantity}</th>
                  <th className="px-3 py-2 text-right">{t.price}</th>
                  <th className="px-3 py-2 text-right">{t.total}</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-t border-border/60">
                    <td className="px-3 py-2 font-mono text-xs">{e.work_date}</td>
                    <td className="px-3 py-2">
                      <div>{e.product_name}</div>
                      {e.category_name && <div className="text-xs text-muted-foreground">{e.category_name}</div>}
                    </td>
                    <td className="px-3 py-2 text-right">{formatNumber(e.quantity)}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatMoney(Number(e.unit_price))}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold">{formatMoney(Number(e.total))}</td>
                    <td className="px-3 py-2 text-right">
                      <Button size="icon" variant="ghost" onClick={() => onDelete(e)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </td>
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
