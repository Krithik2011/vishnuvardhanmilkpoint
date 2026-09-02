import { createFileRoute } from "@tanstack/react-router";
import { Boxes } from "lucide-react";
import { toast } from "sonner";
import { PageTitle } from "@/components/app-shell";
import { ConfirmDelete } from "@/components/confirm-delete";
import { StockDialog } from "@/components/dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  brandOf,
  deleteStockEntry,
  formatDate,
  productLabel,
  rupees,
  stockEntryTotal,
  useDB,
} from "@/lib/store";

export const Route = createFileRoute("/stock")({
  head: () => ({
    meta: [
      { title: "Stock Received — Sri Lakshmi Dairy" },
      {
        name: "description",
        content:
          "Record milk stock received from Amul, Vijaya, Heritage and other companies with quantities, purchase cost and date.",
      },
      { property: "og:title", content: "Stock Received — Sri Lakshmi Dairy" },
      {
        property: "og:description",
        content: "Supplier-wise stock entries and current stock left for every product.",
      },
    ],
  }),
  component: StockPage,
});

function StockPage() {
  const db = useDB();
  const low = db.products.filter((p) => p.stock <= p.lowStockAt);

  return (
    <div>
      <PageTitle
        title="Stock"
        telugu="స్టాక్"
        subtitle="Everything you received from the companies."
        action={
          <StockDialog
            trigger={
              <Button className="shrink-0">
                <Boxes className="mr-1 h-4 w-4" /> Record Stock
              </Button>
            }
          />
        }
      />

      {low.length > 0 && (
        <Card className="mb-4 border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="font-display text-base">Running low — order soon</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {low.map((p) => (
              <Badge key={p.id} variant="destructive">
                {brandOf(db, p.supplierId)} {p.name}: {p.stock}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="font-display text-lg">Stock left now</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {db.products.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">
                {brandOf(db, p.supplierId)} {p.name}{" "}
                <span className="text-muted-foreground">({p.unit})</span>
              </span>
              <Badge variant={p.stock <= p.lowStockAt ? "destructive" : "secondary"}>
                {p.stock}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <h2 className="font-display mb-2 text-lg font-bold">Stock received history</h2>
      <div className="space-y-3">
        {db.stockEntries.map((e) => (
          <div key={e.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{e.supplier}</p>
                <p className="text-xs text-muted-foreground">{formatDate(e.date)}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-display font-bold">{rupees(stockEntryTotal(e))}</p>
                <ConfirmDelete
                  what="This stock entry (quantities will be taken back out)"
                  onConfirm={() => {
                    deleteStockEntry(e.id);
                    toast.success("Stock entry removed");
                  }}
                />
              </div>
            </div>
            <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              {e.items.map((it, i) => (
                <li key={i}>
                  {productLabel(db, it.productId)} × {it.qty} @ {rupees(it.cost)} ={" "}
                  {rupees(it.qty * it.cost)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
