import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { PageTitle } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  customerName,
  deliveryTotal,
  formatDate,
  productLabel,
  rupees,
  todayISO,
  useDB,
} from "@/lib/store";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Ledger & Reports — Sri Lakshmi Dairy" },
      {
        name: "description",
        content:
          "Day-by-day ledger of deliveries and payments, filterable by customer and date range, with totals in rupees.",
      },
      { property: "og:title", content: "Ledger & Reports — Sri Lakshmi Dairy" },
      {
        property: "og:description",
        content: "Filter the milk delivery and payment ledger by customer and date.",
      },
    ],
  }),
  component: ReportsPage,
});

const daysAgoISO = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

type Row = {
  date: string;
  kind: "Delivery" | "Payment";
  customerId: string;
  detail: string;
  billed: number;
  paid: number;
};

function ReportsPage() {
  const db = useDB();
  const [cust, setCust] = React.useState("all");
  const [from, setFrom] = React.useState(daysAgoISO(30));
  const [to, setTo] = React.useState(todayISO());

  const rows: Row[] = React.useMemo(() => {
    const d: Row[] = db.deliveries.map((x) => ({
      date: x.date,
      kind: "Delivery" as const,
      customerId: x.customerId,
      detail: x.items
        .map((it) => `${productLabel(db, it.productId)} × ${it.qty}`)
        .join(", "),
      billed: deliveryTotal(x),
      paid: 0,
    }));
    const p: Row[] = db.payments.map((x) => ({
      date: x.date,
      kind: "Payment" as const,
      customerId: x.customerId,
      detail: `${x.mode}${x.note ? ` · ${x.note}` : ""}`,
      billed: 0,
      paid: x.amount,
    }));
    return [...d, ...p]
      .filter((r) => (cust === "all" ? true : r.customerId === cust))
      .filter((r) => r.date >= from && r.date <= to)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [db, cust, from, to]);

  const billed = rows.reduce((s, r) => s + r.billed, 0);
  const paid = rows.reduce((s, r) => s + r.paid, 0);

  return (
    <div>
      <PageTitle
        title="Ledger"
        telugu="లెక్కలు"
        subtitle="Pick a customer and dates to see what was delivered and what was paid."
      />

      <Card className="mb-4">
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-3">
          <div>
            <Label>Customer</Label>
            <Select value={cust} onValueChange={setCust}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All customers</SelectItem>
                {db.customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>From date</Label>
            <Input
              type="date"
              className="mt-1"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <Label>To date</Label>
            <Input
              type="date"
              className="mt-1"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="sm:col-span-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFrom(todayISO());
                setTo(todayISO());
              }}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFrom(daysAgoISO(7));
                setTo(todayISO());
              }}
            >
              Last 7 days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFrom(daysAgoISO(30));
                setTo(todayISO());
              }}
            >
              Last 30 days
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Box label="Delivered value" value={rupees(billed)} />
        <Box label="Money received" value={rupees(paid)} tone="primary" />
        <Box label="Difference" value={rupees(billed - paid)} tone={billed - paid > 0 ? "warn" : undefined} />
      </div>

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div
            key={i}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold">
                {customerName(db, r.customerId)}{" "}
                <span
                  className={
                    "ml-1 rounded-full px-2 py-0.5 text-xs " +
                    (r.kind === "Payment"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground")
                  }
                >
                  {r.kind}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">{formatDate(r.date)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{r.detail}</p>
            </div>
            <span
              className={
                "font-display shrink-0 font-bold " +
                (r.kind === "Payment" ? "text-primary" : "text-foreground")
              }
            >
              {r.kind === "Payment" ? `+ ${rupees(r.paid)}` : rupees(r.billed)}
            </span>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nothing recorded for these dates.
          </p>
        )}
      </div>
    </div>
  );
}

function Box({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "primary" | "warn" | undefined;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] text-muted-foreground uppercase">{label}</p>
      <p
        className={
          "font-display text-xl font-bold " +
          (tone === "primary" ? "text-primary" : tone === "warn" ? "text-destructive" : "")
        }
      >
        {value}
      </p>
    </div>
  );
}
