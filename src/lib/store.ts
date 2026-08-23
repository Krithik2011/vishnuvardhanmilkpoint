import * as React from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type Supplier = {
  id: string;
  name: string;
  phone: string;
  note?: string | undefined;
};

export type Product = {
  id: string;
  supplierId: string;
  name: string;
  unit: string;
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
  note?: string | undefined;
};

export type StockEntry = {
  id: string;
  date: string; // yyyy-mm-dd
  supplier: string;
  items: { productId: string; qty: number; cost: number }[];
};

export type Delivery = {
  id: string;
  date: string;
  customerId: string;
  items: { productId: string; qty: number; price: number }[];
};

export type Payment = {
  id: string;
  date: string;
  customerId: string;
  amount: number;
  mode: "Cash" | "UPI" | "Bank";
  note?: string | undefined;
};

export type DB = {
  suppliers: Supplier[];
  products: Product[];
  customers: Customer[];
  stockEntries: StockEntry[];
  deliveries: Delivery[];
  payments: Payment[];
  loading: boolean;
};

export const uid = () => Math.random().toString(36).slice(2, 10);

export const todayISO = () => new Date().toISOString().slice(0, 10);

const EMPTY_DB: DB = {
  suppliers: [],
  products: [],
  customers: [],
  stockEntries: [],
  deliveries: [],
  payments: [],
  loading: true,
};

/* ---------- live shared state (Lovable Cloud) ---------- */

let db: DB = EMPTY_DB;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

const num = (v: unknown) => Number(v ?? 0);

export async function refresh(): Promise<void> {
  const [sup, prod, cust, stock, del, pay] = await Promise.all([
    supabase.from("suppliers").select("*").order("name"),
    supabase.from("products").select("*").order("created_at"),
    supabase.from("customers").select("*").order("name"),
    supabase.from("stock_entries").select("*").order("date", { ascending: false }),
    supabase.from("deliveries").select("*").order("date", { ascending: false }),
    supabase.from("payments").select("*").order("date", { ascending: false }),
  ]);

  const firstError =
    sup.error || prod.error || cust.error || stock.error || del.error || pay.error;
  if (firstError) {
    db = { ...db, loading: false };
    emit();
    throw firstError;
  }

  db = {
    loading: false,
    suppliers: (sup.data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      phone: s.phone ?? "",
      note: s.note ?? undefined,
    })),
    products: (prod.data ?? []).map((p) => ({
      id: p.id,
      supplierId: p.supplier_id,
      name: p.name,
      unit: p.unit ?? "",
      buyPrice: num(p.buy_price),
      salePrice: num(p.sale_price),
      stock: num(p.stock),
      lowStockAt: num(p.low_stock_at),
    })),
    customers: (cust.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone ?? "",
      address: c.address ?? "",
      note: c.note ?? undefined,
    })),
    stockEntries: (stock.data ?? []).map((e) => ({
      id: e.id,
      date: e.date,
      supplier: e.supplier,
      items: (e.items as StockEntry["items"]) ?? [],
    })),
    deliveries: (del.data ?? []).map((e) => ({
      id: e.id,
      date: e.date,
      customerId: e.customer_id,
      items: (e.items as Delivery["items"]) ?? [],
    })),
    payments: (pay.data ?? []).map((p) => ({
      id: p.id,
      date: p.date,
      customerId: p.customer_id,
      amount: num(p.amount),
      mode: (p.mode as Payment["mode"]) ?? "Cash",
      note: p.note ?? undefined,
    })),
  };
  emit();
}

let started = false;
let reloadTimer: ReturnType<typeof setTimeout> | undefined;

function scheduleRefresh() {
  if (reloadTimer) clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    void refresh().catch(() => {});
  }, 150);
}

/** Loads the shared data and keeps it live for every logged-in employee. */
export function startLiveData() {
  if (started || typeof window === "undefined") return;
  started = true;

  void refresh().catch((e: unknown) => {
    console.error(e);
    toast.error("Could not load data. Check your internet and refresh.");
  });

  const channel = supabase.channel("dairy-live");
  for (const table of [
    "suppliers",
    "products",
    "customers",
    "stock_entries",
    "deliveries",
    "payments",
  ]) {
    channel.on("postgres_changes", { event: "*", schema: "public", table }, scheduleRefresh);
  }
  channel.subscribe();

  const onFocus = () => scheduleRefresh();
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onFocus);
}

export function useDB(): DB {
  const subscribe = React.useCallback((cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }, []);
  return React.useSyncExternalStore(
    subscribe,
    () => db,
    () => EMPTY_DB,
  );
}

/* ---------- helpers ---------- */

export const rupees = (n: number) =>
  "₹" + Math.round(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export const formatDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const deliveryTotal = (dl: Delivery) => dl.items.reduce((s, i) => s + i.qty * i.price, 0);

export const stockEntryTotal = (s: StockEntry) => s.items.reduce((sum, i) => sum + i.qty * i.cost, 0);

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
  if (!p) return "Unknown product";
  return `${brandOf(d, p.supplierId)} ${p.name} (${p.unit})`;
}

export function brandOf(d: DB, supplierId: string) {
  return d.suppliers.find((s) => s.id === supplierId)?.name ?? "Other";
}

export function customerName(d: DB, id: string) {
  return d.customers.find((c) => c.id === id)?.name ?? "Unknown";
}

/* ---------- mutations ---------- */

function fail(e: unknown, fallback: string) {
  const msg = (e as { message?: string } | null)?.message ?? fallback;
  console.error(e);
  toast.error(msg.replace(/^.*?:\s*/, "") || fallback);
}

async function run(fn: () => Promise<{ error: unknown }>, fallback: string) {
  try {
    const { error } = await fn();
    if (error) {
      fail(error, fallback);
      return false;
    }
    await refresh();
    return true;
  } catch (e) {
    fail(e, fallback);
    return false;
  }
}

export const addCustomer = (c: Omit<Customer, "id">) =>
  run(
    async () =>
      supabase.from("customers").insert({
        name: c.name,
        phone: c.phone,
        address: c.address,
        note: c.note ?? null,
      }),
    "Could not save the customer",
  );

export const updateCustomer = (id: string, c: Omit<Customer, "id">) =>
  run(
    async () =>
      supabase
        .from("customers")
        .update({ name: c.name, phone: c.phone, address: c.address, note: c.note ?? null })
        .eq("id", id),
    "Could not update the customer",
  );

export const deleteCustomer = (id: string) =>
  run(async () => supabase.from("customers").delete().eq("id", id), "Could not delete the customer");

export const addSupplier = (s: Omit<Supplier, "id">) =>
  run(
    async () => supabase.from("suppliers").insert({ name: s.name, phone: s.phone, note: s.note ?? null }),
    "Could not save the company",
  );

export const updateSupplier = (id: string, s: Omit<Supplier, "id">) =>
  run(
    async () =>
      supabase
        .from("suppliers")
        .update({ name: s.name, phone: s.phone, note: s.note ?? null })
        .eq("id", id),
    "Could not update the company",
  );

export const deleteSupplier = (id: string) =>
  run(async () => supabase.from("suppliers").delete().eq("id", id), "Could not delete the company");

const productRow = (p: Omit<Product, "id">) => ({
  supplier_id: p.supplierId,
  name: p.name,
  unit: p.unit,
  buy_price: p.buyPrice,
  sale_price: p.salePrice,
  stock: Math.max(0, p.stock),
  low_stock_at: p.lowStockAt,
});

export const addProduct = (p: Omit<Product, "id">) =>
  run(async () => supabase.from("products").insert(productRow(p)), "Could not save the product");

export const updateProduct = (id: string, p: Omit<Product, "id">) =>
  run(
    async () => supabase.from("products").update(productRow(p)).eq("id", id),
    "Could not update the product",
  );

export const deleteProduct = (id: string) =>
  run(async () => supabase.from("products").delete().eq("id", id), "Could not delete the product");

export const addStockEntry = (e: Omit<StockEntry, "id">) =>
  run(
    async () =>
      supabase.rpc("record_stock_entry", {
        p_date: e.date,
        p_supplier: e.supplier,
        p_items: e.items,
      }),
    "Could not save the stock entry",
  );

export const deleteStockEntry = (id: string) =>
  run(async () => supabase.rpc("remove_stock_entry", { p_id: id }), "Could not remove the stock entry");

export const addDelivery = (e: Omit<Delivery, "id">) =>
  run(
    async () =>
      supabase.rpc("record_delivery", {
        p_date: e.date,
        p_customer: e.customerId,
        p_items: e.items,
      }),
    "Could not save the delivery",
  );

export const deleteDelivery = (id: string) =>
  run(async () => supabase.rpc("remove_delivery", { p_id: id }), "Could not remove the delivery");

export const addPayment = (e: Omit<Payment, "id">) =>
  run(
    async () =>
      supabase.from("payments").insert({
        date: e.date,
        customer_id: e.customerId,
        amount: e.amount,
        mode: e.mode,
        note: e.note ?? null,
      }),
    "Could not save the payment",
  );

export const deletePayment = (id: string) =>
  run(async () => supabase.from("payments").delete().eq("id", id), "Could not delete the payment");
