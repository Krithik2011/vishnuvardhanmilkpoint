import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";
import { PageTitle } from "@/components/app-shell";
import { ConfirmDelete } from "@/components/confirm-delete";
import { DeliveryDialog, PaymentDialog } from "@/components/dialogs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  balanceOf,
  deleteCustomer,
  deleteDelivery,
  deletePayment,
  deliveryTotal,
  formatDate,
  productLabel,
  rupees,
  useDB,
} from "@/lib/store";

export const Route = createFileRoute("/_authenticated/customers/$id")({
  head: () => ({
    meta: [
      { title: "Customer Details — Sri Lakshmi Dairy" },
      {
        name: "description",
        content: "Customer balance, delivery history and payment history in one place.",
      },
      { property: "og:title", content: "Customer Details — Sri Lakshmi Dairy" },
      {
        property: "og:description",
        content: "Balance, deliveries and payments for one milk customer.",
      },
    ],
  }),
  component: CustomerDetail,
});

function CustomerDetail() {
  const { id } = Route.useParams();
  const db = useDB();
  const navigate = useNavigate();
  const c = db.customers.find((x) => x.id === id);

  if (!c) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">This customer was removed.</p>
        <Button asChild className="mt-4">
          <Link to="/customers">Back to customers</Link>
        </Button>
      </div>
    );
  }

  const bal = balanceOf(db, c.id);
  const deliveries = db.deliveries.filter((d) => d.customerId === c.id);
  const payments = db.payments.filter((p) => p.customerId === c.id);

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link to="/customers">
          <ArrowLeft className="h-4 w-4" /> All customers
        </Link>
      </Button>

      <PageTitle
        title={c.name}
        action={
          <ConfirmDelete
            what={`${c.name}, along with their deliveries and payments,`}
            onConfirm={() => {
              deleteCustomer(c.id);
              toast.success("Customer deleted");
              navigate({ to: "/customers" });
            }}
          />
        }
      />

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Card>
          <CardContent className="space-y-1 pt-6 text-sm">
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" /> {c.phone || "—"}
            </p>
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> {c.address}
            </p>
            {c.note && <p className="text-muted-foreground">Note: {c.note}</p>}
          </CardContent>
        </Card>
        <Card className={bal > 0 ? "border-destructive/50 bg-destructive/5" : ""}>
          <CardContent className="pt-6 text-center">
            <p className="text-xs text-muted-foreground uppercase">Balance / బాకీ</p>
            <p
              className={
                "font-display text-3xl font-bold " +
                (bal > 0 ? "text-destructive" : "text-primary")
              }
            >
              {rupees(bal)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="my-4 grid grid-cols-2 gap-3">
        <DeliveryDialog customerId={c.id} trigger={<Button size="lg">New Delivery</Button>} />
        <PaymentDialog
          customerId={c.id}
          trigger={
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              Record Payment
            </Button>
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Deliveries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {deliveries.length === 0 && (
              <p className="text-sm text-muted-foreground">No deliveries yet.</p>
            )}
            {deliveries.map((d) => (
              <div key={d.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{formatDate(d.date)}</span>
                  <span className="font-display font-bold">{rupees(deliveryTotal(d))}</span>
                </div>
                <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  {d.items.map((it, i) => (
                    <li key={i}>
                      {productLabel(db, it.productId)} × {it.qty} = {rupees(it.qty * it.price)}
                    </li>
                  ))}
                </ul>
                <div className="mt-1 text-right">
                  <ConfirmDelete
                    what="This delivery"
                    onConfirm={() => {
                      deleteDelivery(d.id);
                      toast.success("Delivery removed, stock restored");
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Payments received</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {payments.length === 0 && (
              <p className="text-sm text-muted-foreground">No payments yet.</p>
            )}
            {payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{formatDate(p.date)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.mode}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
