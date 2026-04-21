import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { Pencil, Plus, Trash2, UserCog } from "lucide-react";

export const Route = createFileRoute("/admin/workers")({
  component: WorkersPage,
});

type Worker = { id: string; worker_code: string; name: string; active: boolean; created_at: string };

function WorkersPage() {
  const qc = useQueryClient();
  const { data: workers, isLoading } = useQuery({
    queryKey: ["workers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("workers_safe").select("id, worker_code, name, active, created_at").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Worker[];
    },
  });

  const [editing, setEditing] = useState<Worker | null>(null);
  const [open, setOpen] = useState(false);

  const onDelete = async (w: Worker) => {
    if (!confirm(`${t.deleteWorker}: ${w.name}?`)) return;
    const { error } = await supabase.from("workers").delete().eq("id", w.id);
    if (error) toast.error(error.message);
    else {
      toast.success(t.deleted);
      qc.invalidateQueries({ queryKey: ["workers"] });
    }
  };

  return (
    <>
      <PageHeader
        title={t.workers}
        subtitle="PIN-kod orqali kirish"
        actions={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}>
                <Plus className="size-4" /> {t.addWorker}
              </Button>
            </DialogTrigger>
            <WorkerDialog
              editing={editing}
              onDone={() => {
                setOpen(false);
                setEditing(null);
                qc.invalidateQueries({ queryKey: ["workers"] });
              }}
            />
          </Dialog>
        }
      />

      {isLoading ? (
        <div className="text-sm text-muted-foreground">{t.loading}</div>
      ) : !workers || workers.length === 0 ? (
        <EmptyState title={t.noData} hint={t.addWorker} />
      ) : (
        <div className="surface overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5">ID</th>
                <th className="px-3 py-2.5">{t.workerName}</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">…</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => (
                <tr key={w.id} className="border-t border-border/60">
                  <td className="px-3 py-2.5 font-mono text-xs">{w.worker_code}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <UserCog className="size-4 text-muted-foreground" /> {w.name}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${w.active ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                      {w.active ? t.active : t.inactive}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(w); setOpen(true); }}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => onDelete(w)}>
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
    </>
  );
}

function WorkerDialog({ editing, onDone }: { editing: Worker | null; onDone: () => void }) {
  const [code, setCode] = useState(editing?.worker_code ?? "");
  const [name, setName] = useState(editing?.name ?? "");
  const [pin, setPin] = useState("");
  const [active, setActive] = useState(editing?.active ?? true);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing && pin.length < 4) {
      toast.error("PIN kamida 4 raqam bo‘lishi kerak");
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc("admin_upsert_worker", {
      _id: (editing?.id ?? null) as any,
      _code: code.trim(),
      _name: name.trim(),
      _pin: (pin.trim() || null) as any,
      _active: active,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success(t.saved);
      onDone();
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editing ? t.editWorker : t.addWorker}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label>{t.workerCode}</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="W-001" required />
        </div>
        <div className="space-y-1.5">
          <Label>{t.workerName}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>{editing ? t.newPin : t.pin}</Label>
          <Input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder={editing ? "—" : "1234"}
            maxLength={12}
          />
        </div>
        <div className="flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2">
          <Label>{t.active}</Label>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={loading}>{loading ? t.loading : t.save}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
