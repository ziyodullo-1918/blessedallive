import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, HardHat, Activity } from "lucide-react";
import { t } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { isCurrentUserAdmin } from "@/lib/auth";
import { getWorkerSession } from "@/lib/worker-session";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  // If already signed in, jump to the right dashboard.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session && (await isCurrentUserAdmin())) {
        navigate({ to: "/admin" });
        return;
      }
      const ws = getWorkerSession();
      if (ws) navigate({ to: "/worker" });
    })();
  }, [navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background bg-grid">
      <div className="pointer-events-none absolute inset-x-0 top-[-20%] mx-auto h-[60vh] max-w-3xl rounded-full bg-[image:var(--gradient-primary)] opacity-20 blur-3xl" />

      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center px-4 py-16 md:py-24">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
          <Activity className="size-3.5 text-primary" />
          <span>Production Tracker • UZ</span>
        </div>

        <h1 className="text-center text-4xl font-bold tracking-tight md:text-6xl">
          <span className="text-gradient">{t.appName}</span>
        </h1>
        <p className="mt-3 max-w-xl text-center text-sm text-muted-foreground md:text-base">
          {t.appTagline}
        </p>

        <div className="mt-10 grid w-full max-w-3xl gap-4 md:grid-cols-2">
          <Link to="/login" className="group">
            <div className="surface relative flex h-full flex-col rounded-xl border border-border p-6 transition-all hover:border-primary/50 hover:glow">
              <div className="mb-3 flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="size-6" />
              </div>
              <div className="text-lg font-semibold">{t.admin}</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Email va parol bilan to‘liq boshqaruv paneliga kiring.
              </p>
              <Button className="mt-6 w-full" variant="default">
                {t.loginAsAdmin}
              </Button>
            </div>
          </Link>

          <Link to="/worker-login" className="group">
            <div className="surface relative flex h-full flex-col rounded-xl border border-border p-6 transition-all hover:border-primary/50 hover:glow">
              <div className="mb-3 flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <HardHat className="size-6" />
              </div>
              <div className="text-lg font-semibold">{t.worker}</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Ishchi ID va PIN-kod orqali kunlik ishingizni kiriting.
              </p>
              <Button className="mt-6 w-full" variant="secondary">
                {t.loginAsWorker}
              </Button>
            </div>
          </Link>
        </div>

        <div className="mt-10 grid w-full max-w-3xl grid-cols-3 gap-3 text-center text-xs text-muted-foreground">
          <div className="rounded-md border border-border bg-card/40 p-3">
            <div className="text-lg font-semibold text-foreground">PIN</div>
            <div>Xavfsiz ishchi kirish</div>
          </div>
          <div className="rounded-md border border-border bg-card/40 p-3">
            <div className="text-lg font-semibold text-foreground">Real-vaqt</div>
            <div>Avtomatik hisob-kitob</div>
          </div>
          <div className="rounded-md border border-border bg-card/40 p-3">
            <div className="text-lg font-semibold text-foreground">CSV</div>
            <div>Hisobotni yuklab olish</div>
          </div>
        </div>
      </div>
    </div>
  );
}
