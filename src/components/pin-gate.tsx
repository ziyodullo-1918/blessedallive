import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { isPinUnlocked, markPinUnlocked } from "@/lib/admin-pin";

export function PinGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [checked, setChecked] = useState(false);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setUnlocked(isPinUnlocked());
    setChecked(true);
    const onChange = () => setUnlocked(isPinUnlocked());
    window.addEventListener("admin-pin-changed", onChange);
    return () => window.removeEventListener("admin-pin-changed", onChange);
  }, []);

  if (!checked) return null;
  if (unlocked) return <>{children}</>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("verify_admin_pin", { _pin: pin });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (data === true) {
      markPinUnlocked();
      setUnlocked(true);
      setPin("");
    } else {
      toast.error(t.invalidPin);
    }
  };

  return (
    <div className="mx-auto mt-10 max-w-sm">
      <div className="surface rounded-xl border border-border p-6 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Lock className="size-5" />
        </div>
        <h2 className="text-lg font-semibold">{t.pinLocked}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t.enterPin}</p>
        <form onSubmit={submit} className="mt-4 space-y-3 text-left">
          <div className="space-y-1">
            <Label className="text-xs">{t.adminPin}</Label>
            <Input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy || !pin}>
            {t.unlock}
          </Button>
        </form>
      </div>
    </div>
  );
}