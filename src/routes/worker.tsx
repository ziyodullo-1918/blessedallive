import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell, workerSignOut } from "@/components/app-shell";
import { useRequireWorker } from "@/hooks/use-require-worker";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/worker")({
  component: WorkerLayout,
});

function WorkerLayout() {
  const { session, ready } = useRequireWorker();
  if (!ready || !session) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">{t.loading}</div>;
  }
  return (
    <AppShell
      userLabel={`${t.worker} · ${session.name}`}
      onSignOut={workerSignOut}
      navItems={[
        { to: "/worker", label: t.myWork },
        { to: "/worker/new", label: t.addEntry },
      ]}
    >
      <Outlet />
    </AppShell>
  );
}
