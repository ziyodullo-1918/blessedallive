import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { isCurrentUserAdmin } from "@/lib/auth";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        toast.success(t.saved);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      // Try to claim first-admin role (no-op if an admin already exists and it isn't this user)
      await supabase.rpc("claim_first_admin" as any);
      const ok = await isCurrentUserAdmin();
      if (!ok) {
        toast.error("Bu hisob administrator emas");
        await supabase.auth.signOut();
        return;
      }
      navigate({ to: "/admin" });
    } catch (err: any) {
      toast.error(err.message ?? t.invalidCredentials);
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
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <div className="text-lg font-semibold">{t.admin}</div>
              <div className="text-xs text-muted-foreground">{t.loginAsAdmin}</div>
            </div>
          </div>

          <form onSubmit={handle} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t.email}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t.password}</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t.loading : mode === "signup" ? t.createAdmin : t.signIn}
            </Button>
          </form>

          <div className="mt-4 text-center text-xs text-muted-foreground">
            {mode === "signin" ? (
              <>
                {t.noAccount}{" "}
                <button className="text-primary hover:underline" onClick={() => setMode("signup")}>
                  {t.createAdmin}
                </button>
              </>
            ) : (
              <>
                {t.haveAccount}{" "}
                <button className="text-primary hover:underline" onClick={() => setMode("signin")}>
                  {t.signIn}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
