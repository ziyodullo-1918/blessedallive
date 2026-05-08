import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/page-header";
import { PinGate } from "@/components/pin-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/categories")({
  component: () => (<PinGate><CategoriesPage /></PinGate>),
});

type Cat = { id: string; name: string };

function CategoriesPage() {
  const qc = useQueryClient();
  const { data: cats, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name").order("name");
      if (error) throw error;
      return data as Cat[];
    },
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cat | null>(null);

  const onDelete = async (c: Cat) => {
    if (!confirm(`${t.delete}: ${c.name}?`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) toast.error(error.message);
    else { toast.success(t.deleted); qc.invalidateQueries({ queryKey: ["categories"] }); }
  };

  return (
    <>
      <PageHeader
        title={t.categories}
        subtitle={t.categoryHint}
        actions={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}><Plus className="size-4" /> {t.addCategory}</Button>
            </DialogTrigger>
            <CategoryDialog
              editing={editing}
              onDone={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["categories"] }); }}
            />
          </Dialog>
        }
      />
      {isLoading ? (
        <div className="text-sm text-muted-foreground">{t.loading}</div>
      ) : !cats || cats.length === 0 ? (
        <EmptyState title={t.noData} hint={t.addCategory} />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((c) => (
            <div key={c.id} className="surface flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Tag className="size-4 text-primary" />
                <span className="font-medium">{c.name}</span>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}>
                  <Pencil className="size-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => onDelete(c)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function CategoryDialog({ editing, onDone }: { editing: Cat | null; onDone: () => void }) {
  const [name, setName] = useState(editing?.name ?? "");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const { error } = editing
      ? await supabase.from("categories").update({ name: n }).eq("id", editing.id)
      : await supabase.from("categories").insert({ name: n });
    if (error) toast.error(error.message);
    else { toast.success(t.saved); onDone(); }
  };
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{editing ? t.editCategory : t.addCategory}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label>{t.category}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Qish / Bahor / Yoz / Kuz" />
          <p className="text-xs text-muted-foreground">{t.categoryHint}</p>
        </div>
        <DialogFooter><Button type="submit">{t.save}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}