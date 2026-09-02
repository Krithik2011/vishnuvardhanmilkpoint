import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { PageTitle } from "@/components/app-shell";
import { ConfirmDelete } from "@/components/confirm-delete";
import { ProductForm } from "@/routes/products";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addSupplier,
  deleteSupplier,
  refresh,
  rupees,
  updateSupplier,
  useDB,
  type Supplier,
} from "@/lib/store";

export const Route = createFileRoute("/_authenticated/setup")({
  head: () => ({
    meta: [
      { title: "Setup — Companies & Product Catalog" },
      {
        name: "description",
        content:
          "Add supplier companies like Amul, Vijaya and Heritage, and set up their products with unit, purchase price and selling price.",
      },
      { property: "og:title", content: "Setup — Companies & Product Catalog" },
      {
        property: "og:description",
        content: "Manage supplier companies and their milk product catalog.",
      },
    ],
  }),
  component: SetupPage,
});

function SupplierForm({
  trigger,
  existing,
}: {
  trigger: React.ReactNode;
  existing?: Supplier;
}) {
  const [open, setOpen] = React.useState(false);
  const [f, setF] = React.useState({
    name: existing?.name ?? "",
    phone: existing?.phone ?? "",
    note: existing?.note ?? "",
  });

  const save = () => {
    if (!f.name.trim()) {
      toast.error("Enter the company name");
      return;
    }
    if (existing) {
      updateSupplier(existing.id, f);
      toast.success("Company updated");
    } else {
      addSupplier(f);
      toast.success(`${f.name} added`);
      setF({ name: "", phone: "", note: "" });
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {existing ? "Edit company" : "Add company / కొత్త కంపెనీ"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Company name</Label>
            <Input
              className="mt-1"
              placeholder="Amul"
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Phone number</Label>
            <Input
              className="mt-1"
              inputMode="tel"
              placeholder="98480 55667"
              value={f.phone}
              onChange={(e) => setF({ ...f, phone: e.target.value })}
            />
          </div>
          <div>
            <Label>Note (optional)</Label>
            <Input
              className="mt-1"
              placeholder="Depot pickup at 5 AM"
              value={f.note}
              onChange={(e) => setF({ ...f, note: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button size="lg" className="w-full" onClick={save}>
            Save company
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SetupPage() {
  const db = useDB();

  return (
    <div>
      <PageTitle
        title="Setup"
        telugu="సెటప్"
        subtitle="Companies you buy from, and the products you sell from each."
        action={
          <SupplierForm
            trigger={
              <Button className="shrink-0">
                <Plus className="mr-1 h-4 w-4" /> Add Company
              </Button>
            }
          />
        }
      />

      <div className="space-y-4">
        {db.suppliers.map((s) => {
          const items = db.products.filter((p) => p.supplierId === s.id);
          return (
            <Card key={s.id}>
              <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <div className="min-w-0">
                  <CardTitle className="font-display truncate text-lg">{s.name}</CardTitle>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.phone || "No phone"}
                    {s.note ? ` · ${s.note}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <SupplierForm
                    existing={s}
                    trigger={
                      <Button size="sm" variant="ghost">
                        Edit
                      </Button>
                    }
                  />
                  <ConfirmDelete
                    what={`${s.name} and its ${items.length} products`}
                    onConfirm={() => {
                      deleteSupplier(s.id);
                      toast.success("Company removed");
                    }}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.length === 0 && (
                  <p className="text-sm text-muted-foreground">No products added yet.</p>
                )}
                {items.map((p) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {p.name} <span className="font-normal text-muted-foreground">· {p.unit}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Buy {rupees(p.buyPrice)} → Sell {rupees(p.salePrice)}
                      </p>
                    </div>
                    <ProductForm
                      existing={p}
                      trigger={
                        <Button size="sm" variant="ghost" className="shrink-0">
                          Edit
                        </Button>
                      }
                    />
                  </div>
                ))}
                <ProductForm
                  defaultSupplierId={s.id}
                  trigger={
                    <Button variant="outline" size="sm" className="w-full">
                      <Plus className="mr-1 h-4 w-4" /> Add product under {s.name}
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 rounded-2xl border border-dashed border-border p-4">
        <p className="text-sm font-semibold">Shared data</p>
        <p className="mb-3 text-xs text-muted-foreground">
          Everything is saved in the shared cloud account, so all staff see the same data.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await refresh();
            toast.success("Data refreshed");
          }}
        >
          <RotateCcw className="mr-1 h-4 w-4" /> Refresh data
        </Button>
      </div>

    </div>
  );
}
