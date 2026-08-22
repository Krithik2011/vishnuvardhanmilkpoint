import * as React from "react";

export type Product = {
  id: string;
  brand: string;
  name: string;
  unit: string; // e.g. "500 ml packet", "1 L packet", "1 kg"
  buyPrice: number;
  salePrice: number;
  stock: number;
  lowStockAt: number;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  note?: string;
};

export type StockEntry = {
  id: string;
  date: string; // yyyy-mm-dd
  supplier: string;
  items: { productId: string; qty: number; cost: number }[]; // cost = per unit purchase cost
};

export type Delivery = {
  id: string;
  date: string;
  customerId: string;
  items: { productId: string; qty: number; price: number }[]; // price = per unit sale price
};

export type Payment = {
  id: string;
  date: string;
  customerId: string;
  amount: number;
  mode: "Cash" | "UPI" | "Bank";
  note?: string;
};

export type DB = {
  products: Product[];
  customers: Customer[];
  stockEntries: StockEntry[];
  deliveries: Delivery[];
  payments: Payment[];
};

const KEY = "dairy-app-v1";

export const uid = () => Math.random().toString(36).slice(2, 10);

export const todayISO = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

function seed(): DB {
  const p = (
    brand: string,
    name: string,
    unit: string,
    buyPrice: number,
    salePrice: number,
    stock: number,
    lowStockAt: number,
  ): Product => ({ id: uid(), brand, name, unit, buyPrice, salePrice, stock, lowStockAt });

  const products: Product[] = [
    p("Amul", "Taaza Toned Milk", "500 ml packet", 25, 28, 120, 40),
    p("Amul", "Gold Full Cream Milk", "500 ml packet", 32, 35, 18, 30),
    p("Amul", "Butter", "100 g", 54, 60, 24, 10),
    p("Vijaya (Telangana)", "Toned Milk", "500 ml packet", 23, 26, 200, 50),
    p("Vijaya (Telangana)", "Curd", "500 g cup", 28, 32, 12, 20),
    p("Heritage", "Cow Milk", "500 ml packet", 26, 30, 90, 40),
    p("Heritage", "Paneer", "200 g", 88, 100, 8, 6),
    p("Dodla", "Buttermilk", "200 ml pouch", 8, 10, 150, 50),
  ];

  const c = (name: string, phone: string, address: string, note?: string): Customer => ({
    id: uid(),
    name,
    phone,
    address,
    note,
  });

  const customers: Customer[] = [
    c("Ramesh Kirana Store", "98490 11223", "Shop 4, Ameerpet Main Road", "Morning route"),
    c("Lakshmi Tiffin Centre", "99590 44556", "Beside Bus Stand, Kukatpally"),
    c("Srinivas Reddy (Home)", "90000 77889", "Flat 302, Sai Enclave, Miyapur"),
    c("Sai Provisions", "97010 33445", "Nizampet X Roads"),
    c("Anitha Hotel", "88860 99001", "Old Bowenpally Market"),
  ];

  const stockEntries: StockEntry[] = [
    {
      id: uid(),
      date: daysAgo(2),
      supplier: "Amul Depot",
      items: [
        { productId: products[0].id, qty: 100, cost: 25 },
        { productId: products[1].id, qty: 40, cost: 32 },
      ],
    },
    {
      id: uid(),
      date: daysAgo(1),
      supplier: "Vijaya Dairy Agency",
      items: [
        { productId: products[3].id, qty: 150, cost: 23 },
        { productId: products[4].id, qty: 30, cost: 28 },
      ],
    },
    {
      id: uid(),
      date: todayISO(),
      supplier: "Heritage Distributor",
      items: [
        { productId: products[5].id, qty: 80, cost: 26 },
        { productId: products[6].id, qty: 10, cost: 88 },
      ],
    },
  ];

  const d = (date: string, customerId: string, items: Delivery["items"]): Delivery => ({
    id: uid(),
    date,
    customerId,
    items,
  });

  const deliveries: Delivery[] = [
    d(daysAgo(3), customers[0].id, [
      { productId: products[0].id, qty: 30, price: 28 },
      { productId: products[3].id, qty: 20, price: 26 },
    ]),
    d(daysAgo(2), customers[1].id, [
      { productId: products[4].id, qty: 10, price: 32 },
      { productId: products[7].id, qty: 25, price: 10 },
    ]),
    d(daysAgo(1), customers[2].id, [{ productId: products[5].id, qty: 6, price: 30 }]),
    d(daysAgo(1), customers[3].id, [
      { productId: products[0].id, qty: 40, price: 28 },
      { productId: products[2].id, qty: 5, price: 60 },
    ]),
    d(todayISO(), customers[0].id, [{ productId: products[0].id, qty: 25, price: 28 }]),
    d(todayISO(), customers[4].id, [
      { productId: products[3].id, qty: 30, price: 26 },
      { productId: products[6].id, qty: 2, price: 100 },
    ]),
  ];

  const payments: Payment[] = [
    { id: uid(), date: daysAgo(2), customerId: customers[0].id, amount: 1000, mode: "UPI" },
    { id: uid(), date: daysAgo(1), customerId: customers[1].id, amount: 570, mode: "Cash" },
    { id: uid(), date: todayISO(), customerId: customers[3].id, amount: 800, mode: "Cash" },
  ];

  return { products, customers, stockEntries, deliveries, payments };
}

let db: DB | null = null;
const listeners = new Set<() => void>();

function load(): DB {
  if (db) return db;
  if (typeof window === "undefined") {
    db = seed();
    return db;
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    db = raw ? (JSON.parse(raw) as DB) : seed();
  } catch {
    db = seed();
  }
  return db!;
}

function persist() {
  if (typeof window !== "undefined" && db) {
    window.localStorage.setItem(KEY, JSON.stringify(db));
  }
  listeners.forEach((l) => l());
}

export function update(fn: (d: DB) => void) {
  const cur = load();
  fn(cur);
  persist();
}

export function resetDemoData() {
  db = seed();
  persist();
}

export function useDB(): DB {
  const subscribe = React.useCallback((cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }, []);
  return React.useSyncExternalStore(
    subscribe,
    () => load(),
    () => load(),
  );
}

/* ---------- helpers ---------- */

export const rupees = (n: number) =>
  "₹" + Math.round(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export const formatDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const deliveryTotal = (dl: Delivery) =>
  dl.items.reduce((s, i) => s + i.qty * i.price, 0);

export const stockEntryTotal = (s: StockEntry) =>
  s.items.reduce((sum, i) => sum + i.qty * i.cost, 0);

export function balanceOf(d: DB, customerId: string) {
  const billed = d.deliveries
    .filter((x) => x.customerId === customerId)
    .reduce((s, x) => s + deliveryTotal(x), 0);
  const paid = d.payments
    .filter((x) => x.customerId === customerId)
    .reduce((s, x) => s + x.amount, 0);
  return billed - paid;
}

export function productLabel(d: DB, id: string) {
  const p = d.products.find((x) => x.id === id);
  return p ? `${p.brand} ${p.name} (${p.unit})` : "Unknown product";
}

export function customerName(d: DB, id: string) {
  return d.customers.find((c) => c.id === id)?.name ?? "Unknown";
}

/* ---------- mutations ---------- */

export const addCustomer = (c: Omit<Customer, "id">) =>
  update((d) => void d.customers.unshift({ ...c, id: uid() }));

export const updateCustomer = (id: string, c: Omit<Customer, "id">) =>
  update((d) => {
    const i = d.customers.findIndex((x) => x.id === id);
    if (i >= 0) d.customers[i] = { ...c, id };
  });

export const deleteCustomer = (id: string) =>
  update((d) => {
    d.customers = d.customers.filter((c) => c.id !== id);
    d.deliveries = d.deliveries.filter((x) => x.customerId !== id);
    d.payments = d.payments.filter((x) => x.customerId !== id);
  });

export const addProduct = (p: Omit<Product, "id">) =>
  update((d) => void d.products.unshift({ ...p, id: uid() }));

export const updateProduct = (id: string, p: Omit<Product, "id">) =>
  update((d) => {
    const i = d.products.findIndex((x) => x.id === id);
    if (i >= 0) d.products[i] = { ...p, id };
  });

export const deleteProduct = (id: string) =>
  update((d) => void (d.products = d.products.filter((p) => p.id !== id)));

export const addStockEntry = (e: Omit<StockEntry, "id">) =>
  update((d) => {
    d.stockEntries.unshift({ ...e, id: uid() });
    e.items.forEach((it) => {
      const p = d.products.find((x) => x.id === it.productId);
      if (p) p.stock += it.qty;
    });
  });

export const deleteStockEntry = (id: string) =>
  update((d) => {
    const e = d.stockEntries.find((x) => x.id === id);
    if (!e) return;
    e.items.forEach((it) => {
      const p = d.products.find((x) => x.id === it.productId);
      if (p) p.stock -= it.qty;
    });
    d.stockEntries = d.stockEntries.filter((x) => x.id !== id);
  });

export const addDelivery = (e: Omit<Delivery, "id">) =>
  update((d) => {
    d.deliveries.unshift({ ...e, id: uid() });
    e.items.forEach((it) => {
      const p = d.products.find((x) => x.id === it.productId);
      if (p) p.stock -= it.qty;
    });
  });

export const deleteDelivery = (id: string) =>
  update((d) => {
    const e = d.deliveries.find((x) => x.id === id);
    if (!e) return;
    e.items.forEach((it) => {
      const p = d.products.find((x) => x.id === it.productId);
      if (p) p.stock += it.qty;
    });
    d.deliveries = d.deliveries.filter((x) => x.id !== id);
  });

export const addPayment = (e: Omit<Payment, "id">) =>
  update((d) => void d.payments.unshift({ ...e, id: uid() }));

export const deletePayment = (id: string) =>
  update((d) => void (d.payments = d.payments.filter((x) => x.id !== id)));
