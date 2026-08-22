import { Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { rupees, type Product } from "@/lib/store";

export type LineItem = { productId: string; qty: number; price: number };

export function ItemPicker({
  products,
  items,
  onChange,
  priceLabel,
  priceOf,
  showStock,
}: {
  products: Product[];
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  priceLabel: string;
  priceOf: (p: Product) => number;
  showStock?: boolean;
}) {
  const set = (i: number, patch: Partial<LineItem>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const add = () => {
    const first = products[0];
    if (!first) return;
    onChange([...items, { productId: first.id, qty: 1, price: priceOf(first) }]);
  };

  const total = items.reduce((s, i) => s + i.qty * i.price, 0);

  return (
    <div className="space-y-3">
      {items.map((it, i) => {
        const p = products.find((x) => x.id === it.productId);
        return (
          <div key={i} className="rounded-xl border border-border bg-muted/40 p-3">
            <div className="mb-2 flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <Select
                  value={it.productId}
                  onValueChange={(v) => {
                    const np = products.find((x) => x.id === v);
                    set(i, { productId: v, price: np ? priceOf(np) : it.price });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((pr) => (
                      <SelectItem key={pr.id} value={pr.id}>
                        {pr.brand} — {pr.name} ({pr.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {showStock && p && (
                  <p className="mt-1 text-xs text-muted-foreground">In stock: {p.stock}</p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Quantity</Label>
                <div className="mt-1 flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => set(i, { qty: Math.max(1, it.qty - 1) })}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    inputMode="numeric"
                    className="text-center"
                    value={it.qty}
                    onChange={(e) => set(i, { qty: Math.max(0, Number(e.target.value) || 0) })}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => set(i, { qty: it.qty + 1 })}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-xs">{priceLabel}</Label>
                <Input
                  inputMode="decimal"
                  className="mt-1"
                  value={it.price}
                  onChange={(e) => set(i, { price: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
            <p className="mt-2 text-right text-sm font-semibold">
              {rupees(it.qty * it.price)}
            </p>
          </div>
        );
      })}

      <Button type="button" variant="outline" className="w-full" onClick={add}>
        <Plus className="mr-1 h-4 w-4" /> Add item
      </Button>

      <div className="flex items-center justify-between rounded-xl bg-primary/10 px-4 py-3">
        <span className="font-semibold">Total</span>
        <span className="font-display text-xl font-bold text-primary">{rupees(total)}</span>
      </div>
    </div>
  );
}
