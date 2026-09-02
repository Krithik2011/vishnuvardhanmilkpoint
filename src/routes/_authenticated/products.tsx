import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { Plus, Settings } from "lucide-react";
import { toast } from "sonner";
import { PageTitle } from "@/components/app-shell";
import { ConfirmDelete } from "@/components/confirm-delete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addProduct,
  brandOf,
  deleteProduct,
  rupees,
  updateProduct,
  useDB,
  type Product,
} from "@/lib/store";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({
    meta: [
      { title: "Products & Prices — Sri Lakshmi Dairy" },
      {
        name: "description",
        content:
          "Milk product catalog by company: Amul, Vijaya, Heritage and more, with unit, purchase price, selling price and stock.",
      },
      { property: "og:title", content: "Products & Prices — Sri Lakshmi Dairy" },
      {
        property: "og:description",
        content: "Company-wise product list with buy price, sale price and stock left.",
      },
    ],
  }),
  component: ProductsPage,
});

export function ProductForm({
  trigger,
  existing,
  defaultSupplierId,
}: {
  trigger: React.ReactNode;
  existing?: Product;
  defaultSupplierId?: string;
}) {
  const db = useDB();
  const [open, setOpen] = React.useState(false);
  const blank = {
    supplierId: defaultSupplierId ?? db.suppliers[0]?.id ?? "",
    name: "",
    unit: "500 ml packet",
    buyPrice: 0,
    salePrice: 0,
    stock: 0,
    lowStockAt: 20,
  };
  const [f, setF] = React.useState<Omit<Product, "id">>(existing ?? blank);

  React.useEffect(() => {
    if (open) setF(existing ?? blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = () => {
    if (!f.name.trim()) {
      toast.error("Enter the product name");
      return;
    }
    if (!f.supplierId) {
      toast.error("Choose the company first");
      return;
    }
    if (existing) {
      updateProduct(existing.id, f);
      toast.success("Product updated");
    } else {
      addProduct(f);
      toast.success("Product added");
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit product" : "Add product / కొత్త వస్తువు"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Company</Label>
            <Select value={f.supplierId} onValueChange={(v) => setF({ ...f, supplierId: v })}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Choose company" />
              </SelectTrigger>
              <SelectContent>
                {db.suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Product name</Label>
            <Input
              className="mt-1"
              placeholder="Toned Milk"
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Unit / packet size</Label>
            <Input
              className="mt-1"
              placeholder="500 ml packet"
              value={f.unit}
              onChange={(e) => setF({ ...f, unit: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Buy price (₹)</Label>
              <Input
                className="mt-1"
                inputMode="decimal"
                value={f.buyPrice}
                onChange={(e) => setF({ ...f, buyPrice: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Sale price (₹)</Label>
              <Input
                className="mt-1"
                inputMode="decimal"
                value={f.salePrice}
                onChange={(e) => setF({ ...f, salePrice: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Stock now</Label>
              <Input
                className="mt-1"
                inputMode="numeric"
                value={f.stock}
                onChange={(e) => setF({ ...f, stock: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Warn below</Label>
              <Input
                className="mt-1"
                inputMode="numeric"
                value={f.lowStockAt}
                onChange={(e) => setF({ ...f, lowStockAt: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button size="lg" className="w-full" onClick={save}>
            Save product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProductsPage() {
  const db = useDB();
  const groups = db.suppliers
    .map((s) => ({ s, items: db.products.filter((p) => p.supplierId === s.id) }))
    .filter((g) => g.items.length);
  const orphans = db.products.filter((p) => !db.suppliers.some((s) => s.id === p.supplierId));

  return (
    <div>
      <PageTitle
        title="Products"
        telugu="వస్తువులు"
        subtitle="Prices and stock, company by company."
        action={
          <ProductForm
            trigger={
              <Button className="shrink-0">
                <Plus className="mr-1 h-4 w-4" /> Add Product
              </Button>
            }
          />
        }
      />

      <Button asChild variant="outline" size="sm" className="mb-4">
        <Link to="/setup">
          <Settings className="h-4 w-4" /> Manage companies in Setup
        </Link>
      </Button>

      <div className="space-y-6">
        {[...groups, ...(orphans.length ? [{ s: null, items: orphans }] : [])].map((g, gi) => (
          <div key={gi}>
            <h2 className="font-display mb-2 text-lg font-bold">
              {g.s ? g.s.name : "Other products"}
            </h2>
            <div className="space-y-2">
              {g.items.map((p) => (
                <div
                  key={p.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.unit} · Buy {rupees(p.buyPrice)} · Sell {rupees(p.salePrice)} · Profit{" "}
                      {rupees(p.salePrice - p.buyPrice)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {brandOf(db, p.supplierId)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Badge variant={p.stock <= p.lowStockAt ? "destructive" : "secondary"}>
                      {p.stock} left
                    </Badge>
                    <ProductForm
                      existing={p}
                      trigger={
                        <Button size="sm" variant="ghost">
                          Edit
                        </Button>
                      }
                    />
                    <ConfirmDelete
                      what={`${p.name}`}
                      onConfirm={() => {
                        deleteProduct(p.id);
                        toast.success("Product deleted");
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
