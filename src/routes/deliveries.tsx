import { createFileRoute, Link } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import { toast } from "sonner";
import { PageTitle } from "@/components/app-shell";
import { ConfirmDelete } from "@/components/confirm-delete";
import { DeliveryDialog } from "@/components/dialogs";
import { Button } from "@/components/ui/button";
import {
  customerName,
  deleteDelivery,
  deliveryTotal,
  formatDate,
  productLabel,
  rupees,
  todayISO,
  useDB,
} from "@/lib/store";

export const Route = createFileRoute("/deliveries")({
  head: () => ({
    meta: [
      { title: "Deliveries & Sales — Sri Lakshmi Dairy" },
      {
        name: "description",
        content:
          "Record milk deliveries to customers: pick products and quantities, see the amount due and reduce stock automatically.",
      },
      { property: "og:title", content: "Deliveries & Sales — Sri Lakshmi Dairy" },
      {
        property: "og:description",
        content: "Daily delivery entries with amount due per customer.",
      },
    ],
  }),
  component: DeliveriesPage,
});

function DeliveriesPage() {
  const db = useDB();
  const sorted = [...db.deliveries].sort((a, b) => (a.date < b.date ? 1 : -1));
  const byDate = sorted.reduce<Record<string, typeof sorted>>((acc, d) => {
    (acc[d.date] ||= []).push(d);
    return acc;
  }, {});

  return (
    <div>
      <PageTitle
        title="Deliveries"
        telugu="డెలివరీ"
        subtitle="Each delivery adds to the customer's balance and reduces stock."
        action={
          <DeliveryDialog
            trigger={
              <Button className="shrink-0">
                <Truck className="mr-1 h-4 w-4" /> New Delivery
              </Button>
            }
          />
        }
      />

      <div className="space-y-6">
        {Object.entries(byDate).map(([date, list]) => (
          <div key={date}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">
                {formatDate(date)}
                {date === todayISO() && (
                  <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    Today
                  </span>
                )}
              </h2>
              <span className="text-sm font-semibold text-muted-foreground">
                {rupees(list.reduce((s, d) => s + deliveryTotal(d), 0))}
              </span>
            </div>
            <div className="space-y-2">
              {list.map((d) => (
                <div key={d.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <Link
                      to="/customers/$id"
                      params={{ id: d.customerId }}
                      className="min-w-0 truncate font-semibold"
                    >
                      {customerName(db, d.customerId)}
                    </Link>
                    <div className="shrink-0 text-right">
                      <p className="font-display font-bold">{rupees(deliveryTotal(d))}</p>
                      <ConfirmDelete
                        what="This delivery (stock will be added back)"
                        onConfirm={() => {
                          deleteDelivery(d.id);
                          toast.success("Delivery removed");
                        }}
                      />
                    </div>
                  </div>
                  <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    {d.items.map((it, i) => (
                      <li key={i}>
                        {productLabel(db, it.productId)} × {it.qty} @ {rupees(it.price)} ={" "}
                        {rupees(it.qty * it.price)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No deliveries recorded yet.
          </p>
        )}
      </div>
    </div>
  );
}
