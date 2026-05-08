import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, adminSignOut } from "@/components/app-shell";
import { useRequireAdmin } from "@/hooks/use-require-admin";
import { supabase } from "@/integrations/supabase/client";
import { t } from "@/lib/i18n";
import { lockPin } from "@/lib/admin-pin";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const ready = useRequireAdmin();
  const [email, setEmail] = useState("");
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? ""));
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        {t.loading}
      </div>
    );
  }

  return (
    <AppShell
      userLabel={`${t.admin}${email ? " · " + email : ""}`}
      onSignOut={async () => { lockPin(); await adminSignOut(); }}
      navItems={[
        { to: "/admin", label: t.dashboard },
        { to: "/admin/live", label: t.liveFeed },
        { to: "/admin/workers", label: t.workers },
        { to: "/admin/products", label: t.products },
        { to: "/admin/categories", label: t.categories },
        { to: "/admin/reports", label: t.reports },
        { to: "/admin/settings", label: t.settings },
      ]}
    >
      <Outlet />
    </AppShell>
  );
}
