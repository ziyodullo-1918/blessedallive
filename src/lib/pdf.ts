import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatMoney, formatNumber, t } from "./i18n";

// Fresh white + green palette
const BRAND = {
  green: [22, 163, 74] as [number, number, number],       // #16a34a
  greenDark: [21, 128, 61] as [number, number, number],   // #15803d
  greenLight: [220, 252, 231] as [number, number, number], // #dcfce7
  ink: [20, 32, 24] as [number, number, number],
  muted: [100, 116, 108] as [number, number, number],
  line: [220, 230, 224] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

function header(doc: jsPDF, title: string, subtitle: string) {
  const w = doc.internal.pageSize.getWidth();

  // White background — clean
  doc.setFillColor(...BRAND.white);
  doc.rect(0, 0, w, 90, "F");

  // Green accent bar (left)
  doc.setFillColor(...BRAND.green);
  doc.rect(0, 0, 6, 90, "F");

  // App name
  doc.setTextColor(...BRAND.green);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(t.appName.toUpperCase(), 28, 28);

  // Title
  doc.setTextColor(...BRAND.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(title, 28, 54);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.muted);
  doc.text(subtitle, 28, 72);

  // Generated stamp
  doc.setFontSize(8);
  const stamp = `${t.generatedAt}: ${new Date().toLocaleString("uz-UZ")}`;
  doc.text(stamp, w - 28, 28, { align: "right" });

  // Bottom hairline of header
  doc.setDrawColor(...BRAND.greenLight);
  doc.setLineWidth(1);
  doc.line(28, 84, w - 28, 84);
}

function statRow(
  doc: jsPDF,
  y: number,
  items: { label: string; value: string }[],
) {
  const w = doc.internal.pageSize.getWidth();
  const margin = 28;
  const gap = 10;
  const colW = (w - margin * 2 - gap * (items.length - 1)) / items.length;

  items.forEach((it, i) => {
    const x = margin + i * (colW + gap);
    // Light green tinted card
    doc.setFillColor(...BRAND.greenLight);
    doc.roundedRect(x, y, colW, 56, 8, 8, "F");
    // Top accent
    doc.setFillColor(...BRAND.green);
    doc.roundedRect(x, y, colW, 3, 2, 2, "F");
    // Label
    doc.setTextColor(...BRAND.greenDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(it.label.toUpperCase(), x + 12, y + 22);
    // Value
    doc.setTextColor(...BRAND.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(it.value, x + 12, y + 44);
  });
  return y + 68;
}

function footer(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...BRAND.greenLight);
    doc.setLineWidth(1);
    doc.line(28, h - 30, w - 28, h - 30);
    doc.setTextColor(...BRAND.muted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(t.appName, 28, h - 16);
    doc.setTextColor(...BRAND.green);
    doc.setFont("helvetica", "bold");
    doc.text(`${i} / ${pages}`, w - 28, h - 16, { align: "right" });
  }
}

const TABLE_COMMON = {
  headStyles: { fillColor: BRAND.green, textColor: 255, fontSize: 9, fontStyle: "bold" as const },
  footStyles: { fillColor: BRAND.greenLight, textColor: BRAND.greenDark, fontSize: 9 },
  bodyStyles: { fontSize: 9, textColor: BRAND.ink },
  alternateRowStyles: { fillColor: [248, 252, 250] as [number, number, number] },
  margin: { left: 28, right: 28 },
};

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
    t.workersMonthlyReport,
    `${opts.workerName} • ID: ${opts.workerCode} • ${opts.from} → ${opts.to}`,
  );

  const totalQty = opts.entries.reduce((s, e) => s + Number(e.quantity), 0);
  const totalSum = opts.entries.reduce((s, e) => s + Number(e.total), 0);

  let y = statRow(doc, 110, [
    { label: t.totalEntries, value: String(opts.entries.length) },
    { label: t.totalProduction, value: `${formatNumber(totalQty)} ${t.units}` },
    { label: t.totalEarnings, value: formatMoney(totalSum) },
  ]);

  autoTable(doc, {
    startY: y + 6,
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
        { content: `${formatNumber(totalQty)} ${t.units}`, styles: { fontStyle: "bold", halign: "right" } },
        "",
        { content: formatMoney(totalSum), styles: { fontStyle: "bold", halign: "right" } },
      ],
    ],
    ...TABLE_COMMON,
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

  const y = statRow(doc, 110, [
    { label: t.products, value: String(opts.rows.length) },
    { label: t.totalProduction, value: `${formatNumber(totalQty)} ${t.units}` },
    { label: t.overallTotal, value: formatMoney(totalSum) },
  ]);

  autoTable(doc, {
    startY: y + 6,
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
    ...TABLE_COMMON,
    columnStyles: {
      2: { halign: "right" },
      3: { halign: "right" },
    },
  });

  footer(doc);
  doc.save(`mahsulotlar_${opts.from}_${opts.to}.pdf`);
}

export type SalaryRow = {
  worker_name: string;
  worker_code: string;
  quantity: number;
  total: number;
  entries: number;
  // Per-product breakdown for this worker
  products: { product_name: string; quantity: number; total: number }[];
};

export function salariesPdf(opts: {
  from: string;
  to: string;
  rows: SalaryRow[];
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  header(doc, t.salariesReport, `${opts.from} → ${opts.to}`);

  const totalSum = opts.rows.reduce((s, r) => s + Number(r.total), 0);
  const totalQty = opts.rows.reduce((s, r) => s + Number(r.quantity), 0);

  let y = statRow(doc, 110, [
    { label: t.workers, value: String(opts.rows.length) },
    { label: t.totalProduction, value: `${formatNumber(totalQty)} ${t.units}` },
    { label: t.overallTotal, value: formatMoney(totalSum) },
  ]);

  // Summary table
  autoTable(doc, {
    startY: y + 6,
    head: [["#", t.workerName, "ID", `${t.quantity} (${t.units})`, t.totalEarnings]],
    body: opts.rows.map((r, i) => [
      String(i + 1),
      r.worker_name,
      r.worker_code,
      formatNumber(r.quantity),
      formatMoney(Number(r.total)),
    ]),
    foot: [
      [
        { content: t.overallTotal, colSpan: 3, styles: { halign: "right", fontStyle: "bold" } },
        { content: formatNumber(totalQty), styles: { fontStyle: "bold", halign: "right" } },
        { content: formatMoney(totalSum), styles: { fontStyle: "bold", halign: "right" } },
      ],
    ],
    ...TABLE_COMMON,
    columnStyles: {
      3: { halign: "right" },
      4: { halign: "right" },
    },
  });

  // Per-worker product breakdown
  for (const r of opts.rows) {
    if (r.products.length === 0) continue;
    const lastY = (doc as any).lastAutoTable?.finalY ?? y;
    const pageH = doc.internal.pageSize.getHeight();
    let startY = lastY + 24;
    if (startY > pageH - 120) {
      doc.addPage();
      startY = 60;
    }

    // Section heading bar
    const w = doc.internal.pageSize.getWidth();
    doc.setFillColor(...BRAND.greenLight);
    doc.roundedRect(28, startY - 16, w - 56, 22, 4, 4, "F");
    doc.setTextColor(...BRAND.greenDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${r.worker_name} • #${r.worker_code} — ${t.productsBreakdown}`, 36, startY - 1);

    autoTable(doc, {
      startY: startY + 8,
      head: [[t.product, `${t.quantity} (${t.units})`, t.total]],
      body: r.products.map((p) => [
        p.product_name,
        formatNumber(p.quantity),
        formatMoney(Number(p.total)),
      ]),
      foot: [
        [
          { content: t.overallTotal, styles: { halign: "right", fontStyle: "bold" } },
          { content: formatNumber(r.quantity), styles: { fontStyle: "bold", halign: "right" } },
          { content: formatMoney(r.total), styles: { fontStyle: "bold", halign: "right" } },
        ],
      ],
      ...TABLE_COMMON,
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    });
  }

  footer(doc);
  doc.save(`maoshlar_${opts.from}_${opts.to}.pdf`);
}
