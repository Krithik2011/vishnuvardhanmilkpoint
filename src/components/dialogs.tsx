import * as React from "react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ItemPicker, type LineItem } from "@/components/item-picker";
import {
  addCustomer,
  addDelivery,
  addPayment,
  addStockEntry,
  balanceOf,
  brandOf,
  formatDate,
  rupees,
  todayISO,
  useDB,
  type Product,
} from "@/lib/store";

const label = (d: ReturnType<typeof useDB>) => (p: Product) =>
  `${brandOf(d, p.supplierId)} — ${p.name} (${p.unit})`;

/* ---------------- Add customer ---------------- */

export function AddCustomerDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [f, setF] = React.useState({ name: "", phone: "", address: "", note: "" });

  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    if (!f.name.trim()) {
      toast.error("Please enter the customer name");
      return;
    }
    setSaving(true);
    const ok = await addCustomer(f);
    setSaving(false);
    if (!ok) return;
    toast.success(`${f.name} added`);
    setF({ name: "", phone: "", address: "", note: "" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add customer / కొత్త కస్టమర్</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input
              className="mt-1"
              placeholder="Ramesh Kirana Store"
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Phone number</Label>
            <Input
              className="mt-1"
              inputMode="tel"
              placeholder="98490 11223"
              value={f.phone}
              onChange={(e) => setF({ ...f, phone: e.target.value })}
            />
          </div>
          <div>
            <Label>Address</Label>
            <Textarea
              className="mt-1"
              placeholder="Shop / house address"
              value={f.address}
              onChange={(e) => setF({ ...f, address: e.target.value })}
            />
          </div>
          <div>
            <Label>Note (optional)</Label>
            <Input
              className="mt-1"
              placeholder="Morning route"
              value={f.note}
              onChange={(e) => setF({ ...f, note: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button size="lg" className="w-full" onClick={save}>
            Save customer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- New delivery ---------------- */

export function DeliveryDialog({
  trigger,
  customerId,
}: {
  trigger: React.ReactNode;
  customerId?: string;
}) {
  const db = useDB();
  const [open, setOpen] = React.useState(false);
  const [cust, setCust] = React.useState(customerId ?? "");
  const [date, setDate] = React.useState(todayISO());
  const [items, setItems] = React.useState<LineItem[]>([]);

  React.useEffect(() => {
    if (open) {
      setCust(customerId ?? "");
      setDate(todayISO());
      const first = db.products[0];
      setItems(first ? [{ productId: first.id, qty: 1, price: first.salePrice }] : []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const total = items.reduce((s, i) => s + i.qty * i.price, 0);

  const save = () => {
    if (!cust) {
      toast.error("Please choose a customer");
      return;
    }
    const valid = items.filter((i) => i.qty > 0);
    if (!valid.length) {
      toast.error("Add at least one product");
      return;
    }
    addDelivery({ date, customerId: cust, items: valid });
    toast.success(`Delivery saved — ${rupees(total)} added to balance`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New delivery / కొత్త డెలివరీ</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Customer</Label>
            <Select value={cust} onValueChange={setCust}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Choose customer" />
              </SelectTrigger>
              <SelectContent>
                {db.customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              className="mt-1"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <ItemPicker
            products={db.products}
            items={items}
            onChange={setItems}
            priceLabel="Sale price (₹)"
            priceOf={(p) => p.salePrice}
            labelOf={label(db)}
            showStock
          />
        </div>
        <DialogFooter>
          <Button size="lg" className="w-full" onClick={save}>
            Save delivery — {rupees(total)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Record stock ---------------- */

export function StockDialog({ trigger }: { trigger: React.ReactNode }) {
  const db = useDB();
  const [open, setOpen] = React.useState(false);
  const [supplier, setSupplier] = React.useState("");
  const [date, setDate] = React.useState(todayISO());
  const [items, setItems] = React.useState<LineItem[]>([]);

  React.useEffect(() => {
    if (open) {
      setSupplier(db.suppliers[0]?.name ?? "");
      setDate(todayISO());
      const first = db.products[0];
      setItems(first ? [{ productId: first.id, qty: 1, price: first.buyPrice }] : []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const visible = React.useMemo(() => {
    const s = db.suppliers.find((x) => x.name === supplier);
    const own = s ? db.products.filter((p) => p.supplierId === s.id) : [];
    return own.length ? own : db.products;
  }, [db.products, db.suppliers, supplier]);

  const total = items.reduce((s, i) => s + i.qty * i.price, 0);

  const save = () => {
    if (!supplier) {
      toast.error("Please choose the company / supplier");
      return;
    }
    const valid = items.filter((i) => i.qty > 0);
    if (!valid.length) {
      toast.error("Add at least one product");
      return;
    }
    addStockEntry({
      date,
      supplier,
      items: valid.map((i) => ({ productId: i.productId, qty: i.qty, cost: i.price })),
    });
    toast.success(`Stock added from ${supplier}`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record stock received / స్టాక్</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Company / supplier</Label>
            <Select value={supplier} onValueChange={setSupplier}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Choose company" />
              </SelectTrigger>
              <SelectContent>
                {db.suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.name}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              className="mt-1"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <ItemPicker
            products={visible}
            items={items}
            onChange={setItems}
            priceLabel="Purchase cost (₹)"
            priceOf={(p) => p.buyPrice}
            labelOf={label(db)}
          />
        </div>
        <DialogFooter>
          <Button size="lg" className="w-full" onClick={save}>
            Save stock — {rupees(total)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Record payment ---------------- */

export function PaymentDialog({
  trigger,
  customerId,
}: {
  trigger: React.ReactNode;
  customerId?: string;
}) {
  const db = useDB();
  const [open, setOpen] = React.useState(false);
  const [cust, setCust] = React.useState(customerId ?? "");
  const [date, setDate] = React.useState(todayISO());
  const [amount, setAmount] = React.useState("");
  const [mode, setMode] = React.useState<"Cash" | "UPI" | "Bank">("Cash");
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setCust(customerId ?? "");
      setDate(todayISO());
      setAmount("");
      setMode("Cash");
      setNote("");
    }
  }, [open, customerId]);

  const due = cust ? balanceOf(db, cust) : 0;
  const amt = Number(amount) || 0;

  const save = () => {
    if (!cust) {
      toast.error("Please choose a customer");
      return;
    }
    if (amt <= 0) {
      toast.error("Enter the amount received");
      return;
    }
    addPayment({ date, customerId: cust, amount: amt, mode, ...(note ? { note } : {}) });
    const left = due - amt;
    toast.success(
      left > 0
        ? `${rupees(amt)} received. Remaining balance ${rupees(left)}`
        : `${rupees(amt)} received. Account fully settled`,
    );
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record payment / డబ్బు వసూలు</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Customer</Label>
            <Select value={cust} onValueChange={setCust}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Choose customer" />
              </SelectTrigger>
              <SelectContent>
                {db.customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {cust && (
            <div className="rounded-xl bg-muted px-4 py-3 text-sm">
              Pending amount today:{" "}
              <span className="font-display text-lg font-bold text-foreground">
                {rupees(due)}
              </span>
              {amt > 0 && (
                <p className="mt-1 text-muted-foreground">
                  After this payment: <strong>{rupees(Math.max(0, due - amt))}</strong>
                  {due - amt < 0 && " (advance paid)"}
                </p>
              )}
            </div>
          )}

          <div>
            <Label>Amount received (₹)</Label>
            <Input
              className="mt-1 text-lg"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {cust && due > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(String(Math.max(0, Math.round(due))))}
                >
                  Full amount {rupees(due)}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(String(Math.round(due / 2)))}
                >
                  Half
                </Button>
              </div>
            )}
          </div>

          <div>
            <Label>Payment date</Label>
            <Input
              type="date"
              className="mt-1"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">Today is {formatDate(todayISO())}</p>
          </div>

          <div>
            <Label>Paid by</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="UPI">UPI / Phone pay</SelectItem>
                <SelectItem value="Bank">Bank transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Note (optional)</Label>
            <Input
              className="mt-1"
              placeholder="Part payment for this week"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button size="lg" className="w-full" onClick={save}>
            Save payment {amt > 0 ? `— ${rupees(amt)}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
