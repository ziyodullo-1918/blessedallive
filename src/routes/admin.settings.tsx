import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { PinGate } from "@/components/pin-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { lockPin } from "@/lib/admin-pin";
import { Lock, KeyRound } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({
  component: () => (<PinGate><SettingsPage /></PinGate>),
});

function SettingsPage() {
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPin2, setNewPin2] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length < 4) { toast.error(t.pinTooShort); return; }
    if (newPin !== newPin2) { toast.error(t.pinMismatch); return; }
    setBusy(true);
    const { error } = await supabase.rpc("set_admin_pin", { _old_pin: oldPin, _new_pin: newPin });
    setBusy(false);
    if (error) {
      if (error.message.includes("invalid_old_pin")) toast.error(t.invalidOldPin);
      else if (error.message.includes("pin_too_short")) toast.error(t.pinTooShort);
      else toast.error(error.message);
      return;
    }
    toast.success(t.pinChanged);
    setOldPin(""); setNewPin(""); setNewPin2("");
  };

  return (
    <>
      <PageHeader
        title={t.settings}
        actions={
          <Button variant="secondary" onClick={() => { lockPin(); toast.success(t.lock); }}>
            <Lock className="size-4" /> {t.lock}
          </Button>
        }
      />
      <div className="surface mx-auto max-w-md rounded-xl border border-border p-5">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="size-5 text-primary" />
          <h2 className="text-base font-semibold">{t.changePin}</h2>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">{t.oldPin}</Label>
            <Input type="password" inputMode="numeric" value={oldPin} onChange={(e) => setOldPin(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t.newPin2}</Label>
            <Input type="password" inputMode="numeric" value={newPin} onChange={(e) => setNewPin(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t.confirmNewPin}</Label>
            <Input type="password" inputMode="numeric" value={newPin2} onChange={(e) => setNewPin2(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>{t.save}</Button>
        </form>
      </div>
    </>
  );
}