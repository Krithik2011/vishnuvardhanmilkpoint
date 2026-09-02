import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { ChevronRight, Phone, Search, UserPlus } from "lucide-react";
import { PageTitle } from "@/components/app-shell";
import { AddCustomerDialog, PaymentDialog } from "@/components/dialogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { balanceOf, rupees, useDB } from "@/lib/store";

export const Route = createFileRoute("/customers/")({
  head: () => ({
    meta: [
      { title: "Customers & Balances — Sri Lakshmi Dairy" },
      {
        name: "description",
        content:
          "All milk customers with phone, address and running balance. Highlighted overdue accounts and one-tap payment collection.",
      },
      { property: "og:title", content: "Customers & Balances — Sri Lakshmi Dairy" },
      {
        property: "og:description",
        content: "Customer list with running balances and delivery history.",
      },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const db = useDB();
  const [q, setQ] = React.useState("");

  const rows = db.customers
    .map((c) => ({ c, bal: balanceOf(db, c.id) }))
    .filter(
      ({ c }) =>
        c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q.trim()),
    )
    .sort((a, b) => b.bal - a.bal);

  return (
    <div>
      <PageTitle
        title="Customers"
        telugu="కస్టమర్లు"
        subtitle="Red amount means money is still pending."
        action={
          <AddCustomerDialog
            trigger={
              <Button className="shrink-0">
                <UserPlus className="mr-1 h-4 w-4" /> Add Customer
              </Button>
            }
          />
        }
      />

      <div className="relative mb-4">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name or phone"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {rows.map(({ c, bal }) => (
          <div
            key={c.id}
            className={
              "rounded-2xl border bg-card p-4 " +
              (bal > 2000 ? "border-destructive/50 bg-destructive/5" : "border-border")
            }
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <Link to="/customers/$id" params={{ id: c.id }} className="min-w-0">
                <p className="truncate font-display text-lg font-bold">{c.name}</p>
                <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" /> {c.phone || "—"}
                </p>
                <p className="truncate text-sm text-muted-foreground">{c.address}</p>
              </Link>
              <div className="shrink-0 text-right">
                <p className="text-xs text-muted-foreground">Balance</p>
                <p
                  className={
                    "font-display text-xl font-bold " +
                    (bal > 0 ? "text-destructive" : "text-primary")
                  }
                >
                  {rupees(bal)}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <PaymentDialog
                customerId={c.id}
                trigger={
                  <Button size="sm" variant="secondary">
                    Record Payment
                  </Button>
                }
              />
              <Button asChild size="sm" variant="ghost">
                <Link to="/customers/$id" params={{ id: c.id }}>
                  History <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">No customers found.</p>
        )}
      </div>
    </div>
  );
}
