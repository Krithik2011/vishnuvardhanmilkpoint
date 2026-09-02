import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertTriangle, IndianRupee, Package, Truck, UserPlus, Boxes, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AddCustomerDialog,
  DeliveryDialog,
  PaymentDialog,
  StockDialog,
} from "@/components/dialogs";
import {
  balanceOf,
  brandOf,
  deliveryTotal,
  formatDate,
  rupees,
  stockEntryTotal,
  todayISO,
  useDB,
} from "@/lib/store";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Today's Book — Sri Lakshmi Dairy" },
      {
        name: "description",
        content:
          "Today's milk sales, deliveries, pending customer balances, stock received and low-stock alerts at a glance.",
      },
      { property: "og:title", content: "Today's Book — Sri Lakshmi Dairy" },
      {
        property: "og:description",
        content: "Daily sales, pending balances and stock for your milk distribution business.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const db = useDB();
  const today = todayISO();
  const [busy, setBusy] = React.useState(false);

  const todayDeliveries = db.deliveries.filter((d) => d.date === today);
  const todaySales = todayDeliveries.reduce((s, d) => s + deliveryTotal(d), 0);
  const todayPayments = db.payments
    .filter((p) => p.date === today)
    .reduce((s, p) => s + p.amount, 0);
  const todayStock = db.stockEntries.filter((s) => s.date === today);
  const todayStockCost = todayStock.reduce((s, e) => s + stockEntryTotal(e), 0);

  const balances = db.customers
    .map((c) => ({ c, bal: balanceOf(db, c.id) }))
    .filter((x) => x.bal > 0)
    .sort((a, b) => b.bal - a.bal);
  const outstanding = balances.reduce((s, x) => s + x.bal, 0);

  const lowStock = db.products.filter((p) => p.stock <= p.lowStockAt);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Today's book</h1>
        <p className="text-sm text-muted-foreground">{formatDate(today)}</p>
      </div>

      {/* Primary actions */}
      <div className="grid grid-cols-2 gap-3">
        <DeliveryDialog
          trigger={
            <Button size="lg" className="h-auto flex-col gap-1 py-4 text-base">
              <Truck className="h-6 w-6" />
              New Delivery
            </Button>
          }
        />
        <PaymentDialog
          trigger={
            <Button
              size="lg"
              className="h-auto flex-col gap-1 bg-accent py-4 text-base text-accent-foreground hover:bg-accent/90"
            >
              <IndianRupee className="h-6 w-6" />
              Record Payment
            </Button>
          }
        />
        <StockDialog
          trigger={
            <Button size="lg" variant="outline" className="h-auto flex-col gap-1 py-4 text-base">
              <Boxes className="h-6 w-6" />
              Record Stock
            </Button>
          }
        />
        <AddCustomerDialog
          trigger={
            <Button size="lg" variant="outline" className="h-auto flex-col gap-1 py-4 text-base">
              <UserPlus className="h-6 w-6" />
              Add Customer
            </Button>
          }
        />
      </div>

      <Button
        variant="secondary"
        size="lg"
        className="h-auto w-full gap-2 py-3 text-base"
        disabled={db.loading || busy}
        onClick={async () => {
          setBusy(true);
          try {
            const { downloadDailySummary } = await import("@/lib/daily-summary");
            await downloadDailySummary(db, today);
            toast.success("Daily summary downloaded");
          } catch (e) {
            console.error(e);
            toast.error("Could not make the summary. Please try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <FileDown className="h-5 w-5" />
        {busy ? "Preparing…" : "Download today's summary (PDF)"}
      </Button>


      {/* Numbers */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Today's sales" value={rupees(todaySales)} sub={`${todayDeliveries.length} deliveries`} />
        <Stat label="Money collected today" value={rupees(todayPayments)} sub="Payments received" />
        <Stat
          label="Total pending"
          value={rupees(outstanding)}
          sub={`${balances.length} customers owe money`}
          warn={outstanding > 0}
        />
        <Stat label="Stock bought today" value={rupees(todayStockCost)} sub={`${todayStock.length} entries`} />
      </div>

      {/* Pending balances */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-lg">Pending balances / బాకీ</CardTitle>
          <Link to="/customers" className="text-sm font-semibold text-primary">
            See all
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {balances.length === 0 && (
            <p className="text-sm text-muted-foreground">Everyone has paid. Well done!</p>
          )}
          {balances.slice(0, 5).map(({ c, bal }) => (
            <div
              key={c.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <Link to="/customers/$id" params={{ id: c.id }} className="min-w-0">
                <p className="truncate font-semibold">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">{c.phone}</p>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={
                    bal > 2000
                      ? "font-display font-bold text-destructive"
                      : "font-display font-bold text-foreground"
                  }
                >
                  {rupees(bal)}
                </span>
                <PaymentDialog
                  customerId={c.id}
                  trigger={
                    <Button size="sm" variant="secondary">
                      Collect
                    </Button>
                  }
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Today's deliveries */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Today's deliveries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayDeliveries.length === 0 && (
              <p className="text-sm text-muted-foreground">No deliveries recorded yet today.</p>
            )}
            {todayDeliveries.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">
                  {db.customers.find((c) => c.id === d.customerId)?.name ?? "Unknown"}
                  <span className="text-muted-foreground"> · {d.items.length} items</span>
                </span>
                <span className="shrink-0 font-semibold">{rupees(deliveryTotal(d))}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Low stock */}
        <Card className={lowStock.length ? "border-destructive/40" : undefined}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Low stock
            </CardTitle>
            <Link to="/products" className="text-sm font-semibold text-primary">
              Products
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {lowStock.length === 0 && (
              <p className="text-sm text-muted-foreground">Stock levels are fine.</p>
            )}
            {lowStock.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">
                  <Package className="mr-1 inline h-4 w-4 text-muted-foreground" />
                  {brandOf(db, p.supplierId)} {p.name}
                </span>
                <Badge variant="destructive" className="shrink-0">
                  {p.stock} left
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Stock received */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-lg">Stock received recently</CardTitle>
          <Link to="/stock" className="text-sm font-semibold text-primary">
            See all
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {db.stockEntries.slice(0, 4).map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">
                {e.supplier}
                <span className="text-muted-foreground"> · {formatDate(e.date)}</span>
              </span>
              <span className="shrink-0 font-semibold">{rupees(stockEntryTotal(e))}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  warn,
}: {
  label: string;
  value: string;
  sub?: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={
          "font-display mt-1 text-2xl font-bold " + (warn ? "text-destructive" : "text-foreground")
        }
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
