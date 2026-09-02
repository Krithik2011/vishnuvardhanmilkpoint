import { createFileRoute, Link } from "@tanstack/react-router";
import { IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { PageTitle } from "@/components/app-shell";
import { ConfirmDelete } from "@/components/confirm-delete";
import { PaymentDialog } from "@/components/dialogs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  balanceOf,
  customerName,
  deletePayment,
  formatDate,
  rupees,
  todayISO,
  useDB,
} from "@/lib/store";

export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [
      { title: "Payments Received — Sri Lakshmi Dairy" },
      {
        name: "description",
        content:
          "Record full or partial customer payments in cash, UPI or bank transfer and instantly update the pending balance.",
      },
      { property: "og:title", content: "Payments Received — Sri Lakshmi Dairy" },
      {
        property: "og:description",
        content: "Payment history and pending balances for every milk customer.",
      },
    ],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const db = useDB();
  const sorted = [...db.payments].sort((a, b) => (a.date < b.date ? 1 : -1));
  const todayTotal = db.payments
    .filter((p) => p.date === todayISO())
    .reduce((s, p) => s + p.amount, 0);
  const pending = db.customers
    .map((c) => ({ c, bal: balanceOf(db, c.id) }))
    .filter((x) => x.bal > 0)
    .sort((a, b) => b.bal - a.bal);

  return (
    <div>
      <PageTitle
        title="Payments"
        telugu="చెల్లింపులు"
        subtitle="Money received from customers. Part payments are fine."
        action={
          <PaymentDialog
            trigger={
              <Button className="shrink-0">
                <IndianRupee className="mr-1 h-4 w-4" /> Record Payment
              </Button>
            }
          />
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase">Collected today</p>
          <p className="font-display text-2xl font-bold text-primary">{rupees(todayTotal)}</p>
        </div>
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-xs text-muted-foreground uppercase">Still pending</p>
          <p className="font-display text-2xl font-bold text-destructive">
            {rupees(pending.reduce((s, x) => s + x.bal, 0))}
          </p>
        </div>
      </div>

      {pending.length > 0 && (
        <Card className="mb-5">
          <CardHeader>
            <CardTitle className="font-display text-lg">Waiting for payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.map(({ c, bal }) => (
              <div
                key={c.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border p-3"
              >
                <Link to="/customers/$id" params={{ id: c.id }} className="min-w-0">
                  <p className="truncate font-semibold">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.phone}</p>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-display font-bold text-destructive">{rupees(bal)}</span>
                  <PaymentDialog
                    customerId={c.id}
                    trigger={<Button size="sm">Collect</Button>}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <h2 className="font-display mb-2 text-lg font-bold">Payment history</h2>
      <div className="space-y-2">
        {sorted.map((p) => (
          <div
            key={p.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold">{customerName(db, p.customerId)}</p>
              <p className="truncate text-xs text-muted-foreground">
                {formatDate(p.date)} · {p.mode}
                {p.note ? ` · ${p.note}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <span className="font-display font-bold text-primary">{rupees(p.amount)}</span>
              <ConfirmDelete
                what="This payment"
                onConfirm={() => {
                  deletePayment(p.id);
                  toast.success("Payment removed");
                }}
              />
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">No payments yet.</p>
        )}
      </div>
    </div>
  );
}
