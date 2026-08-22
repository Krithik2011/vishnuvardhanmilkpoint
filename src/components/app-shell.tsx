import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Package,
  Truck,
  IndianRupee,
  BookOpen,
  Boxes,
  Settings,
} from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  { to: "/", label: "Home", te: "హోమ్", icon: LayoutDashboard },
  { to: "/customers", label: "Customers", te: "కస్టమర్లు", icon: Users },
  { to: "/deliveries", label: "Delivery", te: "డెలివరీ", icon: Truck },
  { to: "/payments", label: "Payments", te: "చెల్లింపులు", icon: IndianRupee },
  { to: "/stock", label: "Stock", te: "స్టాక్", icon: Boxes },
  { to: "/products", label: "Products", te: "వస్తువులు", icon: Package },
  { to: "/reports", label: "Ledger", te: "లెక్కలు", icon: BookOpen },
  { to: "/setup", label: "Setup", te: "సెటప్", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-card/95 backdrop-blur">
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary text-lg text-primary-foreground">
              🥛
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-lg leading-tight font-bold text-foreground">
                Sri Lakshmi Dairy
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                Milk distribution book
              </span>
            </span>
          </Link>
        </div>
        <nav className="hidden overflow-x-auto border-t border-border/60 md:block">
          <div className="mx-auto flex max-w-5xl gap-1 px-3 py-2">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/" }}
                activeProps={{ className: "bg-primary text-primary-foreground" }}
                inactiveProps={{ className: "text-muted-foreground hover:bg-muted" }}
                className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors"
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card md:hidden">
        <div className="grid grid-cols-5">
          {nav.slice(0, 5).map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="flex flex-col items-center gap-1 py-2 text-[11px] font-semibold"
            >
              <n.icon className="h-5 w-5" />
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function PageTitle({
  title,
  telugu,
  subtitle,
  action,
}: {
  title: string;
  telugu?: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div className="min-w-0">
        <h1 className="font-display truncate text-2xl font-bold text-foreground">
          {title}{" "}
          {telugu && (
            <span className="text-base font-medium text-muted-foreground">/ {telugu}</span>
          )}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
