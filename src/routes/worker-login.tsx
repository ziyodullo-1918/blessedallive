import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { setWorkerSession } from "@/lib/worker-session";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { ArrowLeft, HardHat } from "lucide-react";

export const Route = createFileRoute("/worker-login")({
  component: WorkerLogin,
});

function WorkerLogin() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("worker_login", {
        _code: code.trim(),
        _pin: pin.trim(),
      });
      if (error) throw error;
      const row = (data as any[])?.[0];
      if (!row) {
        toast.error(t.invalidPin);
        return;
      }
      setWorkerSession({
        id: row.id,
        worker_code: row.worker_code,
        name: row.name,
        token: row.session_token,
        expires_at: row.expires_at,
      });
      toast.success(`${t.hello}, ${row.name}`);
      navigate({ to: "/worker" });
    } catch (err: any) {
      toast.error(err.message ?? t.invalidPin);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background bg-grid px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {t.back}
        </Link>

        <div className="surface rounded-xl border border-border p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HardHat className="size-5" />
            </div>
            <div>
              <div className="text-lg font-semibold">{t.worker}</div>
              <div className="text-xs text-muted-foreground">{t.loginAsWorker}</div>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="code">{t.workerCode}</Label>
              <Input
                id="code"
                inputMode="text"
                autoCapitalize="characters"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                placeholder="W-001"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pin">{t.pin}</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
                placeholder="••••"
                maxLength={12}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t.loading : t.signIn}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
