import {
  balanceOf,
  customerName,
  deliveryTotal,
  formatDate,
  productLabel,
  type DB,
} from "@/lib/store";

const money = (n: number) => "Rs. " + Math.round(n).toLocaleString("en-IN");

export async function downloadDailySummary(db: DB, date: string) {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableMod.default;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 40;
  let y = 46;

  const deliveries = db.deliveries.filter((d) => d.date === date);
  const payments = db.payments.filter((p) => p.date === date);
  const sales = deliveries.reduce((s, d) => s + deliveryTotal(d), 0);
  const collected = payments.reduce((s, p) => s + p.amount, 0);
  const balances = db.customers
    .map((c) => ({ c, bal: balanceOf(db, c.id) }))
    .filter((x) => x.bal > 0)
    .sort((a, b) => b.bal - a.bal);
  const outstanding = balances.reduce((s, x) => s + x.bal, 0);

  doc.setFont("helvetica", "bold").setFontSize(18);
  doc.text("Sri Lakshmi Dairy - Daily Summary", marginX, y);
  y += 20;
  doc.setFont("helvetica", "normal").setFontSize(11).setTextColor(90);
  doc.text(formatDate(date), marginX, y);
  y += 26;
  doc.setTextColor(0);

  autoTable(doc, {
    startY: y,
    head: [["Deliveries today", "Sales today", "Collected today", "Total outstanding"]],
    body: [[String(deliveries.length), money(sales), money(collected), money(outstanding)]],
    theme: "grid",
    styles: { fontSize: 11, halign: "center", cellPadding: 8 },
    headStyles: { fillColor: [30, 90, 60], textColor: 255 },
    margin: { left: marginX, right: marginX },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 26;

  const section = (title: string) => {
    doc.setFont("helvetica", "bold").setFontSize(13);
    doc.text(title, marginX, y);
    y += 10;
  };

  section("Deliveries");
  autoTable(doc, {
    startY: y,
    head: [["Customer", "Items", "Amount"]],
    body: deliveries.length
      ? deliveries.map((d) => [
          customerName(db, d.customerId),
          d.items.map((i) => `${productLabel(db, i.productId)} x ${i.qty}`).join("\n"),
          money(deliveryTotal(d)),
        ])
      : [["No deliveries recorded today", "", ""]],
    theme: "striped",
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [30, 90, 60], textColor: 255 },
    columnStyles: { 2: { halign: "right", cellWidth: 90 } },
    margin: { left: marginX, right: marginX },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 26;

  section("Payments received");
  autoTable(doc, {
    startY: y,
    head: [["Customer", "Mode", "Note", "Amount"]],
    body: payments.length
      ? payments.map((p) => [
          customerName(db, p.customerId),
          p.mode,
          p.note ?? "",
          money(p.amount),
        ])
      : [["No payments recorded today", "", "", ""]],
    theme: "striped",
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [30, 90, 60], textColor: 255 },
    columnStyles: { 3: { halign: "right", cellWidth: 90 } },
    margin: { left: marginX, right: marginX },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 26;

  section("Pending balances");
  autoTable(doc, {
    startY: y,
    head: [["Customer", "Phone", "Pending"]],
    body: balances.length
      ? balances.map((b) => [b.c.name, b.c.phone, money(b.bal)])
      : [["Everyone has paid in full", "", ""]],
    ...(balances.length ? { foot: [["Total", "", money(outstanding)]] } : {}),
    theme: "striped",
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [30, 90, 60], textColor: 255 },
    footStyles: { fillColor: [240, 235, 220], textColor: 20, fontStyle: "bold" },
    columnStyles: { 2: { halign: "right", cellWidth: 90 } },
    margin: { left: marginX, right: marginX },
  });

  doc.save(`daily-summary-${date}.pdf`);
}
