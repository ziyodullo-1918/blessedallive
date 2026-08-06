import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { formatMoney, t } from "@/lib/i18n";
import { Pencil, Plus, Trash2, Tag, Box, X } from "lucide-react";
import { PinGate } from "@/components/pin-gate";

export const Route = createFileRoute("/admin/products")({
  component: () => (<PinGate><ProductsPage /></PinGate>),
});

type Cat = { id: string; name: string };
type Product = { id: string; name: string; price: number; active: boolean; category_id: string | null; categories: { name: string } | null };

function ProductsPage() {
  const qc = useQueryClient();
  const { data: cats } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name").order("name");
      if (error) throw error;
      return data as Cat[];
    },
  });
  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, active, category_id, categories(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Product[];
    },
  });

  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Cat | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);

  const onDelete = async (p: Product) => {
    if (!confirm(`${t.delete}: ${p.name}?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) toast.error(error.message);
    else {
      toast.success(t.deleted);
      qc.invalidateQueries({ queryKey: ["products"] });
    }
  };

  const onToggleActive = async (p: Product, next: boolean) => {
    const { error } = await supabase.from("products").update({ active: next }).eq("id", p.id);
    if (error) toast.error(error.message);
    else {
      toast.success(t.saved);
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["products-active"] });
      qc.invalidateQueries({ queryKey: ["products-min"] });
    }
  };

  const onDeleteCat = async (c: Cat) => {
    if (!confirm(`${t.delete}: ${c.name}?`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) toast.error(error.message);
    else { toast.success(t.deleted); qc.invalidateQueries({ queryKey: ["categories"] }); }
  };

  return (
    <>
      <PageHeader
        title={t.products}
        actions={
          <>
            <Dialog open={catOpen} onOpenChange={(o) => { setCatOpen(o); if (!o) setEditingCat(null); }}>
              <DialogTrigger asChild>
                <Button variant="secondary" onClick={() => setEditingCat(null)}><Tag className="size-4" /> {t.addCategory}</Button>
              </DialogTrigger>
              <CategoryDialog editing={editingCat} onDone={() => { setCatOpen(false); setEditingCat(null); qc.invalidateQueries({ queryKey: ["categories"] }); }} />
            </Dialog>
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditing(null)}><Plus className="size-4" /> {t.addProduct}</Button>
              </DialogTrigger>
              <ProductDialog
                editing={editing}
                cats={cats ?? []}
                onDone={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["products"] }); }}
              />
            </Dialog>
          </>
        }
      />

      {(cats?.length ?? 0) > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {cats!.map((c) => (
            <span key={c.id} className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 py-1 pl-3 pr-1 text-xs">
              <Tag className="size-3 text-primary" />
              <button type="button" className="hover:underline" onClick={() => { setEditingCat(c); setCatOpen(true); }}>{c.name}</button>
              <button type="button" className="ml-1 rounded-full p-0.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive" onClick={() => onDeleteCat(c)} aria-label={t.delete}>
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-muted-foreground">{t.loading}</div>
      ) : !products || products.length === 0 ? (
        <EmptyState title={t.noData} hint={t.addProduct} />
      ) : (
        <div className="surface overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5">{t.productName}</th>
                <th className="px-3 py-2.5">{t.category}</th>
                <th className="px-3 py-2.5 text-right">{t.pricePerUnit}</th>
                <th className="px-3 py-2.5 text-center">{t.active}</th>
                <th className="px-3 py-2.5 text-right">…</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-border/60">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2"><Box className="size-4 text-muted-foreground" />{p.name}</div>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{p.categories?.name ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{formatMoney(Number(p.price))}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center gap-2">
                      <Switch
                        checked={p.active}
                        onCheckedChange={(v) => onToggleActive(p, v)}
                        aria-label={p.active ? t.active : t.inactive}
                      />
                      <span className={`text-xs ${p.active ? "text-primary" : "text-muted-foreground"}`}>
                        {p.active ? t.active : t.inactive}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="size-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => onDelete(p)}><Trash2 className="size-4 text-destructive" /></Button>
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

function CategoryDialog({ editing, onDone }: { editing: Cat | null; onDone: () => void }) {
  const [name, setName] = useState(editing?.name ?? "");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    let error;
    if (editing) {
      ({ error } = await supabase.from("categories").update({ name: n }).eq("id", editing.id));
    } else {
      const orgId = await getMyOrgId();
      if (!orgId) { toast.error("Korxona topilmadi"); return; }
      ({ error } = await supabase.from("categories").insert({ name: n, org_id: orgId }));
    }
    if (error) toast.error(error.message);
    else { toast.success(t.saved); onDone(); }
  };
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{editing ? (t.editCategory ?? t.edit) : t.addCategory}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label>{t.category}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <DialogFooter><Button type="submit">{t.save}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

function ProductDialog({
  editing, cats, onDone,
}: { editing: Product | null; cats: Cat[]; onDone: () => void }) {
  const [name, setName] = useState(editing?.name ?? "");
  const [price, setPrice] = useState<string>(editing ? String(editing.price) : "");
  const [categoryId, setCategoryId] = useState<string>(editing?.category_id ?? "__none__");
  const [active, setActive] = useState<boolean>(editing?.active ?? true);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: name.trim(),
      price: Number(price),
      category_id: categoryId === "__none__" ? null : categoryId,
      active,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from("products").update(payload).eq("id", editing.id));
    } else {
      const orgId = await getMyOrgId();
      if (!orgId) { toast.error("Korxona topilmadi"); return; }
      ({ error } = await supabase.from("products").insert({ ...payload, org_id: orgId }));
    }
    if (error) toast.error(error.message);
    else { toast.success(t.saved); onDone(); }
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{editing ? t.edit : t.addProduct}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label>{t.productName}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="YTM-7788" />
        </div>
        <div className="space-y-1.5">
          <Label>{t.category}</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger><SelectValue placeholder={t.selectCategory} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t.noCategory}</SelectItem>
              {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t.pricePerUnit}</Label>
          <Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="1000" />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 px-3 py-2">
          <div>
            <Label className="text-sm">{t.active}</Label>
            <p className="text-xs text-muted-foreground">
              {active ? t.active : t.inactive}
            </p>
          </div>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>
        <DialogFooter><Button type="submit">{t.save}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
