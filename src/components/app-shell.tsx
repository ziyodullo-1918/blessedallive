import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X } from "lucide-react";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string };

export function AppShell({
  title,
  subtitle,
  actions,
  navItems,
  onSignOut,
  userLabel,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  navItems: NavItem[];
  onSignOut: () => Promise<void> | void;
  userLabel: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  useEffect(() => setOpen(false), [path]);

  return (
    <div className="min-h-screen bg-background bg-grid">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-8 rounded-md bg-[image:var(--gradient-primary)] glow" />
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-tight">{t.appName}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {userLabel}
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((it) => (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  path === it.to
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                {it.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await onSignOut();
                navigate({ to: "/" });
              }}
              className="hidden md:inline-flex"
            >
              <LogOut className="size-4" /> {t.signOut}
            </Button>
            <button
              className="md:hidden rounded-md border border-border p-2"
              onClick={() => setOpen((v) => !v)}
              aria-label="menu"
            >
              {open ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="border-t border-border/60 md:hidden">
            <div className="mx-auto flex max-w-6xl flex-col px-4 py-2">
              {navItems.map((it) => (
                <Link
                  key={it.to}
                  to={it.to}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm",
                    path === it.to ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                  )}
                >
                  {it.label}
                </Link>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 justify-start"
                onClick={async () => {
                  await onSignOut();
                  navigate({ to: "/" });
                }}
              >
                <LogOut className="size-4" /> {t.signOut}
              </Button>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {actions}
        </div>
        {children}
      </main>
    </div>
  );
}

export async function adminSignOut() {
  await supabase.auth.signOut();
}
