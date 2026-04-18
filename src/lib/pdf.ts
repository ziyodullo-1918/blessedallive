import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatMoney, formatNumber, t } from "./i18n";

const BRAND = {
  primary: [56, 130, 246] as [number, number, number], // electric blue
  dark: [20, 24, 32] as [number, number, number],
  light: [245, 247, 250] as [number, number, number],
  muted: [110, 120, 135] as [number, number, number],
};

function header(doc: jsPDF, title: string, subtitle: string) {
  const w = doc.internal.pageSize.getWidth();
  // Brand bar
  doc.setFillColor(...BRAND.dark);
  doc.rect(0, 0, w, 70, "F");
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 64, w, 6, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(t.appName.toUpperCase(), 40, 28);

  doc.setFontSize(18);
  doc.text(title, 40, 50);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(180, 195, 215);
  doc.text(subtitle, 40, 62);

  doc.setTextColor(...BRAND.muted);
  doc.setFontSize(8);
  const stamp = `${t.generatedAt}: ${new Date().toLocaleString("uz-UZ")}`;
  doc.text(stamp, w - 40, 28, { align: "right" });
}

function statRow(
  doc: jsPDF,
  y: number,
  items: { label: string; value: string }[],
) {
  const w = doc.internal.pageSize.getWidth();
  const margin = 40;
  const gap = 10;
  const colW = (w - margin * 2 - gap * (items.length - 1)) / items.length;

  items.forEach((it, i) => {
    const x = margin + i * (colW + gap);
    doc.setFillColor(...BRAND.light);
    doc.roundedRect(x, y, colW, 50, 6, 6, "F");
    doc.setTextColor(...BRAND.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(it.label.toUpperCase(), x + 12, y + 16);
    doc.setTextColor(...BRAND.dark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(it.value, x + 12, y + 36);
  });
  return y + 60;
}

function footer(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setDrawColor(220, 225, 235);
    doc.line(40, h - 30, w - 40, h - 30);
    doc.setTextColor(...BRAND.muted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(t.appName, 40, h - 16);
    doc.text(`${i} / ${pages}`, w - 40, h - 16, { align: "right" });
  }
}

export type WorkerEntry = {
  work_date: string;
  product_name: string;
  category_name?: string | null;
  quantity: number;
  unit_price: number;
  total: number;
};

export function workerMonthlyPdf(opts: {
  workerName: string;
  workerCode: string;
  from: string;
  to: string;
  entries: WorkerEntry[];
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  header(
    doc,
    `${t.workersMonthlyReport}`,
    `${opts.workerName} • ID: ${opts.workerCode} • ${opts.from} → ${opts.to}`,
  );

  const totalQty = opts.entries.reduce((s, e) => s + Number(e.quantity), 0);
  const totalSum = opts.entries.reduce((s, e) => s + Number(e.total), 0);

  let y = statRow(doc, 90, [
    { label: t.totalEntries, value: String(opts.entries.length) },
    { label: t.totalProduction, value: `${formatNumber(totalQty)} ${t.units}` },
    { label: t.totalEarnings, value: formatMoney(totalSum) },
  ]);

  autoTable(doc, {
    startY: y + 8,
    head: [[t.date, t.product, t.category, t.quantity, t.price, t.total]],
    body: opts.entries.map((e) => [
      e.work_date,
      e.product_name,
      e.category_name ?? "—",
      formatNumber(e.quantity),
      formatMoney(Number(e.unit_price)),
      formatMoney(Number(e.total)),
    ]),
    foot: [
      [
        { content: t.overallTotal, colSpan: 3, styles: { halign: "right", fontStyle: "bold" } },
        { content: `${formatNumber(totalQty)} ${t.units}`, styles: { fontStyle: "bold" } },
        "",
        { content: formatMoney(totalSum), styles: { fontStyle: "bold" } },
      ],
    ],
    headStyles: { fillColor: BRAND.dark, textColor: 255, fontSize: 9 },
    footStyles: { fillColor: BRAND.light, textColor: BRAND.dark, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [250, 251, 253] },
    margin: { left: 40, right: 40 },
    columnStyles: {
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
    },
  });

  footer(doc);
  doc.save(`hisobot_${opts.workerCode}_${opts.from}_${opts.to}.pdf`);
}

export type ProductRow = {
  product_name: string;
  category_name?: string | null;
  quantity: number;
  total: number;
};

export function productsPdf(opts: {
  from: string;
  to: string;
  rows: ProductRow[];
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  header(doc, t.productsReport, `${opts.from} → ${opts.to}`);

  const totalQty = opts.rows.reduce((s, r) => s + Number(r.quantity), 0);
  const totalSum = opts.rows.reduce((s, r) => s + Number(r.total), 0);

  const y = statRow(doc, 90, [
    { label: t.products, value: String(opts.rows.length) },
    { label: t.totalProduction, value: `${formatNumber(totalQty)} ${t.units}` },
    { label: t.overallTotal, value: formatMoney(totalSum) },
  ]);

  autoTable(doc, {
    startY: y + 8,
    head: [[t.product, t.category, `${t.quantity} (${t.units})`, t.total]],
    body: opts.rows.map((r) => [
      r.product_name,
      r.category_name ?? "—",
      formatNumber(r.quantity),
      formatMoney(Number(r.total)),
    ]),
    foot: [
      [
        { content: t.overallTotal, colSpan: 2, styles: { halign: "right", fontStyle: "bold" } },
        { content: formatNumber(totalQty), styles: { fontStyle: "bold", halign: "right" } },
        { content: formatMoney(totalSum), styles: { fontStyle: "bold", halign: "right" } },
      ],
    ],
    headStyles: { fillColor: BRAND.dark, textColor: 255, fontSize: 9 },
    footStyles: { fillColor: BRAND.light, textColor: BRAND.dark, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [250, 251, 253] },
    margin: { left: 40, right: 40 },
    columnStyles: {
      2: { halign: "right" },
      3: { halign: "right" },
    },
  });

  footer(doc);
  doc.save(`mahsulotlar_${opts.from}_${opts.to}.pdf`);
}
